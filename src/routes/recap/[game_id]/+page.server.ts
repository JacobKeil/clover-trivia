import { error } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	game,
	game_team,
	question,
	question_item,
	round,
	team_submission,
	tiebreaker_submission
} from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const completed_game = await db.query.game.findFirst({
		where: and(eq(game.id, params.game_id), eq(game.status, 'COMPLETED')),
		columns: {
			id: true,
			title: true,
			scheduled_at: true
		},
		with: {
			location: { columns: { id: true, name: true, address: true, logo_url: true } },
			rounds: {
				orderBy: [asc(round.order)],
				columns: { id: true, name: true, round_type: true, order: true },
				with: {
					questions: {
						orderBy: [asc(question.order)],
						columns: {
							id: true,
							question_text: true,
							correct_answer_text: true,
							image_url: true,
							song_title: true,
							song_artist: true,
							order: true
						},
						with: {
							category: { columns: { name: true } },
							items: {
								orderBy: [asc(question_item.order)],
								columns: { id: true, answer_text: true, order: true }
							}
						}
					}
				}
			}
		}
	});
	if (!completed_game) throw error(404, 'This game recap is not available.');
	const [roster, submissions, tiebreaker_submissions] = await Promise.all([
		db.query.game_team.findMany({
			where: eq(game_team.game_id, completed_game.id),
			with: { team: { columns: { id: true, name: true } } }
		}),
		db.query.team_submission.findMany({
			where: eq(team_submission.game_id, completed_game.id),
			columns: { team_id: true, points_awarded: true }
		}),
		db.query.tiebreaker_submission.findMany({
			where: eq(tiebreaker_submission.game_id, completed_game.id),
			columns: { team_id: true, question_id: true, difference_from_correct: true }
		})
	]);
	const used_tiebreaker_question_ids = new Set(
		tiebreaker_submissions.map((submission) => submission.question_id)
	);
	const podium = roster
		.map(({ team: current_team }) => ({
			team: current_team,
			points: submissions
				.filter((submission) => submission.team_id === current_team.id)
				.reduce((total, submission) => total + submission.points_awarded, 0),
			tiebreaker_difference:
				tiebreaker_submissions.find((submission) => submission.team_id === current_team.id)
					?.difference_from_correct ?? Number.MAX_SAFE_INTEGER
		}))
		.sort(
			(first, second) =>
				second.points - first.points ||
				first.tiebreaker_difference - second.tiebreaker_difference ||
				first.team.name.localeCompare(second.team.name)
		)
		.slice(0, 3);
	return {
		game: {
			...completed_game,
			rounds: completed_game.rounds.filter(
				(current_round) =>
					current_round.round_type !== 'TIEBREAKER' ||
					current_round.questions.some((current_question) =>
						used_tiebreaker_question_ids.has(current_question.id)
					)
			)
		},
		participant_count: roster.length,
		podium
	};
};
