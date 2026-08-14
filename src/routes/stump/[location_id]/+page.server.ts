import { error, fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { game, location, stump_the_host_submission, team } from '$lib/server/db/schema';
import { publish_stump_submission } from '$lib/server/stump-events';
import type { Actions, PageServerLoad } from './$types';

async function get_stump_game(location_id: string) {
	const games = await db.query.game.findMany({
		where: eq(game.location_id, location_id),
		orderBy: [asc(game.scheduled_at)]
	});
	const scheduled_games = games.filter((current_game) => current_game.status === 'SCHEDULED');
	return (
		games.find((current_game) => current_game.status === 'IN_PROGRESS') ??
		scheduled_games.sort(
			(first, second) =>
				Math.abs(first.scheduled_at.getTime() - Date.now()) -
				Math.abs(second.scheduled_at.getTime() - Date.now())
		)[0] ??
		null
	);
}

export const load: PageServerLoad = async ({ params }) => {
	const current_location = await db.query.location.findFirst({
		where: and(eq(location.id, params.location_id), eq(location.is_active, true))
	});
	if (!current_location) throw error(404, 'Location not found');
	const current_game = await get_stump_game(current_location.id);
	const teams = await db.query.team.findMany({
		where: eq(team.location_id, current_location.id),
		orderBy: [asc(team.name)]
	});
	return { location: current_location, game: current_game, teams };
};

export const actions: Actions = {
	submit: async ({ request, params }) => {
		const form_data = await request.formData();
		const team_id = String(form_data.get('team_id') ?? '');
		const question_text = String(form_data.get('question_text') ?? '').trim();
		const answer_text = String(form_data.get('answer_text') ?? '').trim();
		const current_location = await db.query.location.findFirst({
			where: and(eq(location.id, params.location_id), eq(location.is_active, true))
		});
		if (!current_location) return fail(404, { message: 'Location not found.' });
		const current_game = await get_stump_game(current_location.id);
		if (!current_game)
			return fail(400, { message: 'There is no upcoming trivia game for this location.' });
		const selected_team = await db.query.team.findFirst({
			where: and(eq(team.id, team_id), eq(team.location_id, current_location.id))
		});
		if (!selected_team || !question_text || !answer_text)
			return fail(400, { message: 'Choose your team and enter both a question and its answer.' });
		if (question_text.length > 1000 || answer_text.length > 1000)
			return fail(400, { message: 'Keep the question and answer under 1,000 characters each.' });
		const existing = await db.query.stump_the_host_submission.findFirst({
			where: and(
				eq(stump_the_host_submission.game_id, current_game.id),
				eq(stump_the_host_submission.submitted_by_team_name, selected_team.name)
			)
		});
		if (existing)
			return fail(409, { message: 'Your team has already submitted a Stump the Host question.' });
		await db.insert(stump_the_host_submission).values({
			game_id: current_game.id,
			submitted_by_team_name: selected_team.name,
			question_text,
			answer_text
		});
		publish_stump_submission(current_game.id);
		return { success: true };
	}
};
