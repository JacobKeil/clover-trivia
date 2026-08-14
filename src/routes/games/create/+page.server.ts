import { fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { category, game, location, question, question_item, round } from '$lib/server/db/schema';
import { delete_from_s3, upload_to_s3 } from '$lib/server/storage/s3';
import type { GameRoundSetup, QuestionCategory } from './store';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/auth/login');
  const [locations, categories] = await Promise.all([
    db.query.location.findMany({
      where: and(eq(location.user_id, locals.user.id), eq(location.is_active, true))
    }),
    db.query.category.findMany({ where: eq(category.user_id, locals.user.id) })
  ]);
  return { locations, categories };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: 'Unauthorized' });
    const form_data = await request.formData();
    const title = String(form_data.get('name') ?? '').trim();
    const location_id = String(form_data.get('location_id') ?? '');
    const scheduled_at = String(form_data.get('scheduled_at') ?? '');
    const status = form_data.get('status') === 'DRAFT' ? 'DRAFT' : 'SCHEDULED';
    const standard_question_count = Number(form_data.get('standard_question_count') ?? 3);
    let standard_wager_options: number[] = [];
    let rounds: GameRoundSetup[] = [];
    let new_categories: QuestionCategory[] = [];
    try {
      standard_wager_options = JSON.parse(String(form_data.get('standard_wager_options') ?? '[]'));
      rounds = JSON.parse(String(form_data.get('rounds') ?? '[]'));
      new_categories = JSON.parse(String(form_data.get('new_categories') ?? '[]'));
    } catch {
      return fail(400, { message: 'The game data could not be read.' });
    }
    if (
      !title ||
      !location_id ||
      !scheduled_at ||
      !Number.isInteger(standard_question_count) ||
      standard_question_count < 1 ||
      standard_wager_options.length !== standard_question_count ||
      rounds.length === 0
    )
      return fail(400, {
        message: 'Complete the game details and standard wager setup before saving.'
      });
    const owned_location = await db.query.location.findFirst({
      where: and(eq(location.id, location_id), eq(location.user_id, locals.user.id))
    });
    if (!owned_location) return fail(403, { message: 'Choose one of your locations.' });
    for (const current_round of rounds) {
      if (
        current_round.round_type === 'STANDARD' &&
        (current_round.questions.length !== standard_question_count ||
          current_round.points_type !== 'WAGER')
      )
        return fail(400, {
          message: 'Every standard round must use the location question count and wagers.'
        });
      if (current_round.round_type !== 'STANDARD' && current_round.questions.length !== 1)
        return fail(400, {
          message: 'Halftime, final, and tiebreaker rounds each contain one question.'
        });
    }

    const image_urls = new Map<string, string>();
    const uploaded_keys: string[] = [];
    try {
      for (let r_idx = 0; r_idx < rounds.length; r_idx++)
        for (let q_idx = 0; q_idx < rounds[r_idx].questions.length; q_idx++) {
          const file = form_data.get(`question_image_${r_idx}_${q_idx}`);
          if (file instanceof File && file.size > 0) {
            const uploaded = await upload_to_s3(file, 'questions');
            image_urls.set(`${r_idx}:${q_idx}`, uploaded.url);
            uploaded_keys.push(uploaded.key);
          }
        }
      await db.transaction(async (tx) => {
        const category_ids = new Map<string, string>();
        for (const new_category of new_categories) {
          const [created] = await tx
            .insert(category)
            .values({ user_id: locals.user!.id, name: new_category.name.trim() })
            .returning({ id: category.id });
          category_ids.set(new_category.id, created.id);
        }
        const [created_game] = await tx
          .insert(game)
          .values({
            location_id,
            title,
            scheduled_at: new Date(scheduled_at),
            status,
            standard_question_count,
            standard_wager_options
          })
          .returning({ id: game.id });
        for (const [r_idx, current_round] of rounds.entries()) {
          const [created_round] = await tx
            .insert(round)
            .values({
              game_id: created_game.id,
              name: current_round.name,
              round_type: current_round.round_type,
              points_type: current_round.points_type,
              order: r_idx + 1,
              wager_options:
                current_round.round_type === 'STANDARD' ? standard_wager_options : null,
              min_wager:
                current_round.round_type === 'FINAL'
                  ? (current_round.questions[0].min_wager ?? 0)
                  : null,
              max_wager:
                current_round.round_type === 'FINAL'
                  ? (current_round.questions[0].max_wager ?? 50)
                  : null
            })
            .returning({ id: round.id });
          for (const [q_idx, current_question] of current_round.questions.entries()) {
            const answer_items = (current_question.answer_items ?? [])
              .map((item) => item.trim())
              .filter(Boolean);
            const answer =
              current_round.round_type === 'HALFTIME'
                ? answer_items.join('\n')
                : current_round.round_type === 'TIEBREAKER'
                  ? String(current_question.numeric_answer ?? '')
                  : current_question.answer.trim();
            if (!current_question.question_text.trim() || !answer)
              throw new Error('Each question needs a prompt and answer.');
            const [created_question] = await tx
              .insert(question)
              .values({
                round_id: created_round.id,
                category_id: current_question.category_id
                  ? (category_ids.get(current_question.category_id) ?? current_question.category_id)
                  : null,
                question_text: current_question.question_text.trim(),
                correct_answer_text: answer,
                numeric_answer:
                  current_round.round_type === 'TIEBREAKER'
                    ? (current_question.numeric_answer ?? null)
                    : null,
                image_url: image_urls.get(`${r_idx}:${q_idx}`) ?? null,
                question_type: current_question.question_type,
                order: q_idx + 1,
                points_value:
                  current_round.round_type === 'HALFTIME'
                    ? (current_question.points_per_item ?? 0)
                    : 0,
                bonus_points_value: current_question.bonus_points ?? 0,
                max_items:
                  current_round.round_type === 'HALFTIME'
                    ? (current_question.max_items ?? answer_items.length)
                    : 1,
                notes: current_question.notes?.trim() || null,
                is_tiebreaker: current_round.round_type === 'TIEBREAKER',
                song_title: current_question.song_name?.trim() || null,
                song_artist: current_question.song_artist?.trim() || null
              })
              .returning({ id: question.id });
            if (answer_items.length)
              await tx.insert(question_item).values(
                answer_items.map((answer_text, index) => ({
                  question_id: created_question.id,
                  answer_text,
                  order: index + 1
                }))
              );
          }
        }
      });
    } catch (error) {
      await Promise.allSettled(uploaded_keys.map(delete_from_s3));
      console.error('Failed to create game:', error);
      return fail(500, {
        message: error instanceof Error ? error.message : 'Could not save game.'
      });
    }
    throw redirect(303, '/dashboard');
  }
};
