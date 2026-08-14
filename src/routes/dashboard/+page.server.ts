import { fail, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { game, location, question, question_item, round } from '$lib/server/db/schema';
import { get_user_dashboard_games } from '$lib/server/queries/games';
import { get_user_locations } from '$lib/server/queries/locations';
import { copy_s3_object, delete_from_s3 } from '$lib/server/storage/s3';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  if (!event.locals.user) {
    return redirect(302, '/auth/login');
  }

  const [locations, games] = await Promise.all([
    get_user_locations(event.locals.user.id),
    get_user_dashboard_games(event.locals.user.id)
  ]);

  return {
    user: event.locals.user,
    locations,
    drafts: games.filter((current_game) => current_game.status === 'DRAFT'),
    upcoming_games: games
      .filter(
        (current_game) =>
          current_game.status === 'SCHEDULED' || current_game.status === 'IN_PROGRESS'
      )
      .sort(
        (first_game, second_game) =>
          first_game.scheduled_at.getTime() - second_game.scheduled_at.getTime()
      ),
    recent_games: games
      .filter((current_game) => current_game.status === 'COMPLETED')
      .sort(
        (first_game, second_game) =>
          second_game.scheduled_at.getTime() - first_game.scheduled_at.getTime()
      )
  };
};

export const actions: Actions = {
  schedule_game: async (event) => {
    if (!event.locals.user) return fail(401, { message: 'Unauthorized' });

    const form_data = await event.request.formData();
    const game_id = form_data.get('game_id');
    if (typeof game_id !== 'string' || !game_id) return fail(400, { message: 'Invalid game.' });

    const [owned_game] = await db
      .select({ id: game.id })
      .from(game)
      .innerJoin(location, eq(game.location_id, location.id))
      .where(and(eq(game.id, game_id), eq(location.user_id, event.locals.user.id)))
      .limit(1);

    if (!owned_game) return fail(404, { message: 'Game not found.' });

    await db.update(game).set({ status: 'SCHEDULED' }).where(eq(game.id, game_id));
    return { success: true };
  },
  duplicate_game: async (event) => {
    if (!event.locals.user) return fail(401, { message: 'Unauthorized' });
    const form_data = await event.request.formData();
    const source_game_id = String(form_data.get('source_game_id') ?? '');
    const location_id = String(form_data.get('location_id') ?? '');
    const title = String(form_data.get('title') ?? '').trim();
    const scheduled_at = String(form_data.get('scheduled_at') ?? '');
    const scheduled_date = new Date(scheduled_at);
    const standard_wager_options = form_data.getAll('standard_wager').map((value) => Number(value));
    if (
      !source_game_id ||
      !location_id ||
      !title ||
      !scheduled_at ||
      Number.isNaN(scheduled_date.getTime()) ||
      !standard_wager_options.length ||
      standard_wager_options.some((wager) => !Number.isInteger(wager) || wager < 0)
    )
      return fail(400, { message: 'Complete the duplicate game details.' });

    const source_game = await db.query.game.findFirst({
      where: eq(game.id, source_game_id),
      with: {
        location: true,
        rounds: {
          orderBy: [asc(round.order)],
          with: {
            questions: { orderBy: [asc(question.order)], with: { items: true } }
          }
        }
      }
    });
    if (
      !source_game ||
      source_game.location.user_id !== event.locals.user.id ||
      !['DRAFT', 'SCHEDULED'].includes(source_game.status)
    ) return fail(404, { message: 'That game is not available to duplicate.' });

    if (standard_wager_options.length !== source_game.standard_question_count)
      return fail(400, {
        message: `This game needs ${source_game.standard_question_count} wager amounts.`
      });

    const destination_location = await db.query.location.findFirst({
      where: and(eq(location.id, location_id), eq(location.user_id, event.locals.user.id))
    });
    if (!destination_location || destination_location.id === source_game.location_id)
      return fail(400, { message: 'Choose a different location you own.' });

    const copied_image_urls = new Map<string, string>();
    const copied_image_keys: string[] = [];
    let created_game_id = '';
    try {
      for (const source_round of source_game.rounds)
        for (const source_question of source_round.questions)
          if (source_question.image_url) {
            const copied_image = await copy_s3_object(source_question.image_url, 'questions');
            copied_image_urls.set(source_question.id, copied_image.url);
            copied_image_keys.push(copied_image.key);
          }

      created_game_id = await db.transaction(async (tx) => {
        const [created_game] = await tx
          .insert(game)
          .values({
            location_id: destination_location.id,
            title,
            scheduled_at: scheduled_date,
            status: 'DRAFT',
            standard_question_count: source_game.standard_question_count,
            standard_wager_options
          })
          .returning({ id: game.id });

        for (const source_round of source_game.rounds) {
          const [created_round] = await tx
            .insert(round)
            .values({
              game_id: created_game.id,
              name: source_round.name,
              round_type: source_round.round_type,
              points_type: source_round.points_type,
              order: source_round.order,
              wager_options:
                source_round.round_type === 'STANDARD'
                  ? standard_wager_options
                  : source_round.wager_options,
              halftime_bonus_points: source_round.halftime_bonus_points,
              min_wager: source_round.min_wager,
              max_wager: source_round.max_wager
            })
            .returning({ id: round.id });

          for (const source_question of source_round.questions) {
            const [created_question] = await tx
              .insert(question)
              .values({
                round_id: created_round.id,
                category_id: source_question.category_id,
                question_text: source_question.question_text,
                correct_answer_text: source_question.correct_answer_text,
                numeric_answer: source_question.numeric_answer,
                image_url: copied_image_urls.get(source_question.id) ?? source_question.image_url,
                question_type: source_question.question_type,
                order: source_question.order,
                points_value: source_question.points_value,
                bonus_points_value: source_question.bonus_points_value,
                max_items: source_question.max_items,
                notes: source_question.notes,
                is_tiebreaker: source_question.is_tiebreaker,
                song_title: source_question.song_title,
                song_artist: source_question.song_artist
              })
              .returning({ id: question.id });
            if (source_question.items.length)
              await tx.insert(question_item).values(
                source_question.items.map((item) => ({
                  question_id: created_question.id,
                  answer_text: item.answer_text,
                  order: item.order
                }))
              );
          }
        }
        return created_game.id;
      });
    } catch (caught_error) {
      await Promise.all(copied_image_keys.map((key) => delete_from_s3(key)));
      return fail(500, { message: 'The duplicate could not be created. Please try again.' });
    }
    throw redirect(303, `/games/update/${created_game_id}`);
  },
  delete_game: async (event) => {
    if (!event.locals.user) return fail(401, { message: 'Unauthorized' });
    const form_data = await event.request.formData();
    const game_id = String(form_data.get('game_id') ?? '');
    const owned_game = await db.query.game.findFirst({
      where: eq(game.id, game_id),
      with: { location: true }
    });

    if (
      !owned_game ||
      owned_game.location.user_id !== event.locals.user.id ||
      !['DRAFT', 'SCHEDULED'].includes(owned_game.status)
    ) return fail(404, { message: 'That game cannot be deleted.' });

    await db.delete(game).where(eq(game.id, owned_game.id));
    return { success: true };
  },
  sign_out: async (event) => {
    await auth.api.signOut({ headers: event.request.headers });
    return redirect(302, '/auth/login');
  }
};
