import { error, json, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	game,
	game_team,
	question,
	round,
	team_submission,
	tiebreaker_submission
} from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) throw redirect(303, '/auth/login');
	const host_game = await db.query.game.findFirst({
		where: eq(game.id, params.game_id),
		columns: { id: true, location_id: true },
		with: {
			location: { columns: { user_id: true } },
			rounds: {
				columns: { id: true, order: true, name: true, round_type: true },
				orderBy: [asc(round.order)],
				with: {
					questions: {
						columns: {
							id: true,
							order: true,
							question_type: true,
							bonus_points_value: true,
							max_items: true
						},
						orderBy: [asc(question.order)]
					}
				}
			}
		}
	});
	if (
		!host_game ||
		host_game.location_id !== params.location_id ||
		host_game.location.user_id !== locals.user.id
	)
		throw error(404, 'Game not found');

	const [roster, submissions, tiebreakers] = await Promise.all([
		db.query.game_team.findMany({
			where: eq(game_team.game_id, host_game.id),
			orderBy: [asc(game_team.created_at)],
			with: { team: { columns: { id: true, name: true } } }
		}),
		db.query.team_submission.findMany({ where: eq(team_submission.game_id, host_game.id) }),
		db.query.tiebreaker_submission.findMany({
			where: eq(tiebreaker_submission.game_id, host_game.id)
		})
	]);
	const submissions_by_team = new Map<string, (typeof submissions)[number][]>();
	for (const submission of submissions) {
		const entries = submissions_by_team.get(submission.team_id) ?? [];
		entries.push(submission);
		submissions_by_team.set(submission.team_id, entries);
	}
	const tiebreakers_by_team = new Map<string, (typeof tiebreakers)[number][]>();
	for (const submission of tiebreakers) {
		const entries = tiebreakers_by_team.get(submission.team_id) ?? [];
		entries.push(submission);
		tiebreakers_by_team.set(submission.team_id, entries);
	}
	const standard_round_number = new Map(
		host_game.rounds
			.filter((current_round) => current_round.round_type === 'STANDARD')
			.map((current_round, index) => [current_round.id, index + 1])
	);

	return json({
		scorecards: roster.map(({ team: current_team }) => {
			const team_scores = submissions_by_team.get(current_team.id) ?? [];
			const team_tiebreakers = tiebreakers_by_team.get(current_team.id) ?? [];
			const score_by_question = new Map(
				team_scores.map((submission) => [submission.question_id, submission])
			);
			const tiebreaker_by_question = new Map(
				team_tiebreakers.map((submission) => [submission.question_id, submission])
			);
			return {
				team: current_team,
				points: team_scores.reduce((total, submission) => total + submission.points_awarded, 0),
				score_history: host_game.rounds.map((current_round) => ({
					label:
						current_round.round_type === 'STANDARD'
							? `Round ${standard_round_number.get(current_round.id)}`
							: current_round.name,
					round_type: current_round.round_type,
					questions: current_round.questions.map((current_question) => ({
						...current_question,
						submission: score_by_question.get(current_question.id) ?? null,
						tiebreaker_submission: tiebreaker_by_question.get(current_question.id) ?? null
					}))
				}))
			};
		})
	});
};
