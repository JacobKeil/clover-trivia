import { error, redirect } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	category,
	game,
	game_team,
	location,
	question,
	round,
	team,
	team_submission
} from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw redirect(303, '/auth/login');
	const current_location = await db.query.location.findFirst({
		where: and(eq(location.id, params.location_id), eq(location.user_id, locals.user.id))
	});
	if (!current_location) throw error(404, 'Location not found');
	const completed_games = await db.query.game.findMany({
		where: and(eq(game.location_id, current_location.id), eq(game.status, 'COMPLETED')),
		orderBy: [asc(game.scheduled_at)]
	});
	const game_ids = completed_games.map((current_game) => current_game.id);
	const [location_teams, rosters, submissions, category_rows] = await Promise.all([
		db.query.team.findMany({ where: eq(team.location_id, current_location.id) }),
		game_ids.length
			? db.query.game_team.findMany({ where: inArray(game_team.game_id, game_ids) })
			: [],
		game_ids.length
			? db.query.team_submission.findMany({ where: inArray(team_submission.game_id, game_ids) })
			: [],
		game_ids.length
			? db
					.select({
						category_name: category.name,
						team_id: team_submission.team_id,
						correct: team_submission.is_correct_primary
					})
					.from(team_submission)
					.innerJoin(question, eq(team_submission.question_id, question.id))
					.innerJoin(round, eq(question.round_id, round.id))
					.innerJoin(game, eq(round.game_id, game.id))
					.innerJoin(category, eq(question.category_id, category.id))
					.where(and(eq(game.location_id, current_location.id), eq(game.status, 'COMPLETED')))
			: []
	]);

	const placements = new Map<string, number[]>();
	for (const current_game of completed_games) {
		const roster = rosters.filter((entry) => entry.game_id === current_game.id);
		const standings = roster
			.map((entry) => ({
				team_id: entry.team_id,
				points: submissions
					.filter(
						(submission) =>
							submission.game_id === current_game.id && submission.team_id === entry.team_id
					)
					.reduce((total, submission) => total + submission.points_awarded, 0)
			}))
			.sort((first, second) => second.points - first.points);
		standings.forEach((standing, index) => {
			const rank = standings.findIndex((entry) => entry.points === standing.points) + 1;
			placements.set(standing.team_id, [...(placements.get(standing.team_id) ?? []), rank]);
		});
	}
	const team_stats = location_teams
		.map((current_team) => {
			const attended = rosters.filter((entry) => entry.team_id === current_team.id).length;
			const team_placements = placements.get(current_team.id) ?? [];
			const total_points = submissions
				.filter((submission) => submission.team_id === current_team.id)
				.reduce((total, submission) => total + submission.points_awarded, 0);
			const scored_submissions = submissions.filter(
				(submission) =>
					submission.team_id === current_team.id && submission.is_correct_primary !== null
			);
			const category_performance = [
				...category_rows
					.filter((entry) => entry.team_id === current_team.id)
					.reduce((stats, entry) => {
						const current = stats.get(entry.category_name) ?? {
							name: entry.category_name,
							attempts: 0,
							correct: 0
						};
						current.attempts++;
						if (entry.correct) current.correct++;
						stats.set(entry.category_name, current);
						return stats;
					}, new Map<string, { name: string; attempts: number; correct: number }>())
					.values()
			]
				.map((entry) => ({
					...entry,
					accuracy: Math.round((entry.correct / entry.attempts) * 100)
				}))
				.sort(
					(first, second) => second.accuracy - first.accuracy || second.attempts - first.attempts
				);
			return {
				name: current_team.name,
				attended,
				attendance_rate: completed_games.length
					? Math.round((attended / completed_games.length) * 100)
					: 0,
				average_placement: team_placements.length
					? Number(
							(
								team_placements.reduce((total, rank) => total + rank, 0) / team_placements.length
							).toFixed(1)
						)
					: null,
				correct_rate: scored_submissions.length
					? Math.round(
							(scored_submissions.filter((submission) => submission.is_correct_primary).length /
								scored_submissions.length) *
								100
						)
					: 0,
				average_points: attended ? Number((total_points / attended).toFixed(1)) : 0,
				best_category: category_performance[0] ?? null
			};
		})
		.filter((entry) => entry.attended > 0)
		.sort(
			(first, second) =>
				second.attendance_rate - first.attendance_rate ||
				(first.average_placement ?? Infinity) - (second.average_placement ?? Infinity)
		);
	return {
		location: current_location,
		stats: {
			games_played: completed_games.length,
			teams_played: team_stats.length,
			average_teams: completed_games.length
				? Number((rosters.length / completed_games.length).toFixed(1))
				: 0,
			questions_scored: new Set(submissions.map((submission) => submission.question_id)).size,
			team_stats
		}
	};
};
