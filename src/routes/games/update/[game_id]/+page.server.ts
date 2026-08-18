import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { game, round, question, question_item, location, category } from '$lib/server/db/schema';
import { eq, asc, and, ilike } from 'drizzle-orm';
import {
	delete_from_s3,
	extract_key_from_url,
	is_uploaded_file,
	upload_to_s3
} from '$lib/server/storage/s3';
import { validate_game_rounds } from '$lib/game-builder-validation';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw redirect(303, '/auth/login');
	// 1. Leave game_id as a string (UUID), DO NOT parseInt
	const game_id = params.game_id;
	if (!game_id) throw error(400, 'Invalid Game ID');

	// 2. Query Game with nested rounds and questions using the schema's 'order' column
	const gameData = await db.query.game.findFirst({
		where: eq(game.id, game_id),
		with: {
			location: true,
			rounds: {
				orderBy: [asc(round.order)],
				with: {
					questions: {
						orderBy: [asc(question.order)],
						with: { items: { orderBy: [asc(question_item.order)] } }
					}
				}
			}
		}
	});

	if (!gameData || gameData.location.user_id !== locals.user.id) throw error(404, 'Game not found');

	// 3. Fetch Locations & Categories for form options
	const all_locations = await db
		.select({ id: location.id, name: location.name })
		.from(location)
		.where(eq(location.user_id, locals.user.id));
	const all_categories = await db
		.select({ id: category.id, name: category.name })
		.from(category)
		.where(eq(category.user_id, locals.user.id));

	return {
		game: gameData,
		locations: all_locations,
		categories: all_categories.map((c) => ({ label: c.name, value: c.id }))
	};
};

export const actions: Actions = {
	search_questions: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Unauthorized' });
		const search = String((await request.formData()).get('search') ?? '').trim();
		const words = search.split(/\s+/).filter(Boolean);
		if (!words.length) return fail(400, { message: 'Enter at least one word to search.' });
		const results = await db
			.select({
				question_text: question.question_text,
				correct_answer_text: question.correct_answer_text,
				song_title: question.song_title,
				song_artist: question.song_artist,
				game_title: game.title
			})
			.from(question)
			.innerJoin(round, eq(question.round_id, round.id))
			.innerJoin(game, eq(round.game_id, game.id))
			.innerJoin(location, eq(game.location_id, location.id))
			.where(
				and(
					eq(location.user_id, locals.user.id),
					...words.map((word) => ilike(question.question_text, `%${word}%`))
				)
			)
			.limit(30);
		return { results, search };
	},
	update: async ({ request, params, locals }) => {
		// Leave as UUID string
		const game_id = params.game_id;
		if (!game_id) return fail(400, { message: 'Invalid Game ID' });

		if (!locals.user) return fail(401, { message: 'Unauthorized' });
		const form_data = await request.formData();
		const name = form_data.get('name') as string;
		const location_id = form_data.get('location_id') as string; // Leave as UUID string
		const scheduled_at_str = form_data.get('scheduled_at') as string;
		const rounds_raw = form_data.get('rounds') as string;
		const standard_question_count = Number(form_data.get('standard_question_count') ?? 3);
		const standard_wager_options = JSON.parse(
			String(form_data.get('standard_wager_options') ?? '[]')
		);
		const new_categories = JSON.parse(String(form_data.get('new_categories') ?? '[]')) as Array<{
			id: string;
			name: string;
		}>;

		if (!name || !location_id || !rounds_raw) {
			return fail(400, { message: 'Please fill in all required fields.' });
		}

		const roundsData = JSON.parse(rounds_raw);
		const validation_errors = validate_game_rounds(roundsData);
		if (Object.keys(validation_errors).length)
			return fail(400, { message: 'Some round fields are incomplete.' });

		const ownedGame = await db.query.game.findFirst({
			where: eq(game.id, game_id),
			with: { location: true, rounds: { with: { questions: true } } }
		});
		if (!ownedGame || ownedGame.location.user_id !== locals.user.id)
			return fail(404, { message: 'Game not found' });
		if (ownedGame.status === 'IN_PROGRESS' || ownedGame.status === 'COMPLETED') {
			return fail(409, {
				message: 'This game has started, so its questions and scoring setup are locked.'
			});
		}

		const old_image_urls = new Set(
			ownedGame.rounds.flatMap((existing_round) =>
				existing_round.questions.flatMap((existing_question) =>
					existing_question.image_url ? [existing_question.image_url] : []
				)
			)
		);
		const retained_image_urls = new Set<string>();
		const newly_uploaded_keys: string[] = [];
		const category_ids = new Map<string, string>();

		try {
			for (const new_category of new_categories) {
				const name = new_category.name.trim();
				if (!name) continue;
				const [existing] = await db
					.select({ id: category.id })
					.from(category)
					.where(and(eq(category.user_id, locals.user.id), ilike(category.name, name)))
					.limit(1);
				if (existing) category_ids.set(new_category.id, existing.id);
				else {
					const [created] = await db
						.insert(category)
						.values({ user_id: locals.user.id, name })
						.returning({ id: category.id });
					category_ids.set(new_category.id, created.id);
				}
			}

			// 1. Update Game (Mapped form 'name' to schema 'title')
			await db
				.update(game)
				.set({
					title: name,
					location_id: location_id,
					scheduled_at: new Date(scheduled_at_str),
					standard_question_count,
					standard_wager_options
				})
				.where(eq(game.id, game_id));

			// 2. Delete existing rounds to cleanly insert the new layout
			await db.delete(round).where(eq(round.game_id, game_id));

			for (const [r_idx, rd] of roundsData.entries()) {
				// 3. Insert Round (Mapped to 'order' instead of 'round_number')
				const [insertedRound] = await db
					.insert(round)
					.values({
						game_id: game_id,
						name: rd.name,
						round_type: rd.round_type,
						points_type: rd.points_type,
						order: r_idx + 1,
						wager_options: rd.round_type === 'STANDARD' ? standard_wager_options : null,
						min_wager: rd.round_type === 'FINAL' ? (rd.questions[0]?.min_wager ?? 0) : null,
						max_wager: rd.round_type === 'FINAL' ? (rd.questions[0]?.max_wager ?? 50) : null
					})
					.returning();

				if (rd.questions && rd.questions.length > 0) {
					// 4. Insert Questions (Mapped to 'order', 'correct_answer_text', 'song_title', etc.)
					for (const [q_idx, q] of rd.questions.entries()) {
						let image_url = q.image_url ?? null;
						const image_file = form_data.get(`question_image_${r_idx}_${q_idx}`);
						if (is_uploaded_file(image_file)) {
							const uploaded = await upload_to_s3(image_file, 'questions');
							image_url = uploaded.url;
							newly_uploaded_keys.push(uploaded.key);
						}
						if (image_url) retained_image_urls.add(image_url);
						const answer_items = (q.answer_items ?? [])
							.map((item: string) => item.trim())
							.filter(Boolean);
						const correct_answer_text =
							rd.round_type === 'HALFTIME'
								? answer_items.join('\n')
								: rd.round_type === 'TIEBREAKER'
									? String(q.numeric_answer ?? '')
									: q.answer;

						const [inserted_question] = await db
							.insert(question)
							.values({
								round_id: insertedRound.id,
								category_id: q.category_id
									? (category_ids.get(q.category_id) ?? q.category_id)
									: null,
								question_text: q.question_text,
								correct_answer_text,
								numeric_answer: rd.round_type === 'TIEBREAKER' ? (q.numeric_answer ?? null) : null,
								image_url,
								question_type: q.question_type || 'SINGLE',
								order: q_idx + 1,
								points_value: rd.round_type === 'HALFTIME' ? (q.points_per_item ?? 0) : 0,
								bonus_points_value: q.bonus_points ?? 0,
								max_items: rd.round_type === 'HALFTIME' ? (q.max_items ?? answer_items.length) : 1,
								notes: q.notes || null,
								is_tiebreaker: rd.round_type === 'TIEBREAKER',
								song_title: q.song_name || null,
								song_artist: q.song_artist || null
							})
							.returning({ id: question.id });
						if (answer_items.length)
							await db.insert(question_item).values(
								answer_items.map((answer_text: string, index: number) => ({
									question_id: inserted_question.id,
									answer_text,
									order: index + 1
								}))
							);
					}
				}
			}

			const obsolete_keys = [...old_image_urls]
				.filter((image_url) => !retained_image_urls.has(image_url))
				.map(extract_key_from_url)
				.filter((key): key is string => key !== null);
			await Promise.allSettled(obsolete_keys.map(delete_from_s3));
		} catch (err) {
			console.error(err);
			await Promise.allSettled(newly_uploaded_keys.map(delete_from_s3));
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to save game changes.'
			});
		}

		throw redirect(303, '/dashboard');
	}
};
