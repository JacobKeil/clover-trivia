import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db } from '$lib/server/db';
import {
	game,
	game_session,
	game_team,
	question,
	round,
	team,
	team_submission,
	tiebreaker_submission,
	stump_the_host_submission
} from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const presentation_phases = [
	'RULES',
	'ROUND_INTRO',
	'CATEGORIES',
	'QUESTION',
	'LEADERBOARD',
	'COMPLETE'
] as const;

const qr_code_cache = new Map<string, Promise<string>>();

function get_qr_code(url: string) {
	let qr_code = qr_code_cache.get(url);
	if (!qr_code) {
		qr_code = QRCode.toDataURL(url, {
			width: 320,
			margin: 1,
			color: { dark: '#183d32', light: '#ffffff' }
		});
		qr_code_cache.set(url, qr_code);
	}
	return qr_code;
}

async function get_owned_game(game_id: string, location_id: string, user_id: string) {
	const host_game = await db.query.game.findFirst({
		where: eq(game.id, game_id),
		with: {
			location: { with: { location_rule: true } },
			rounds: {
				orderBy: [asc(round.order)],
				with: { questions: { orderBy: [asc(question.order)], with: { category: true } } }
			}
		}
	});
	if (!host_game || host_game.location_id !== location_id || host_game.location.user_id !== user_id)
		return null;
	return host_game;
}

async function get_owned_game_access(game_id: string, location_id: string, user_id: string) {
	const host_game = await db.query.game.findFirst({
		where: eq(game.id, game_id),
		with: { location: true }
	});
	if (!host_game || host_game.location_id !== location_id || host_game.location.user_id !== user_id)
		return null;
	return host_game;
}

async function get_owned_game_for_navigation(
	game_id: string,
	location_id: string,
	user_id: string
) {
	const host_game = await db.query.game.findFirst({
		where: eq(game.id, game_id),
		columns: { id: true, location_id: true },
		with: {
			location: { columns: { user_id: true } },
			rounds: {
				columns: { id: true, order: true, round_type: true },
				orderBy: [asc(round.order)],
				with: { questions: { columns: { id: true, order: true } } }
			}
		}
	});
	if (!host_game || host_game.location_id !== location_id || host_game.location.user_id !== user_id)
		return null;
	return host_game;
}

function next_round_state(rounds: Array<{ order: number; round_type: string }>, after_order = 0) {
	const next_round = rounds.find(
		(current_round) =>
			current_round.order > after_order && current_round.round_type !== 'TIEBREAKER'
	);
	if (!next_round) return { phase: 'COMPLETE', current_round_order: 0, current_question_order: 0 };
	return {
		phase: next_round.round_type === 'STANDARD' ? 'CATEGORIES' : 'QUESTION',
		current_round_order: next_round.order,
		current_question_order: next_round.round_type === 'STANDARD' ? 0 : 1
	};
}

function previous_round_end_state(
	rounds: Array<{ order: number; round_type: string; questions: Array<{ order: number }> }>,
	before_order: number
) {
	const previous_round = [...rounds]
		.reverse()
		.find(
			(current_round) =>
				current_round.order < before_order && current_round.round_type !== 'TIEBREAKER'
		);
	if (!previous_round) return { phase: 'RULES', current_round_order: 0, current_question_order: 0 };
	return {
		phase: 'QUESTION',
		current_round_order: previous_round.order,
		current_question_order: previous_round.questions.length
	};
}

async function podium_tiebreaker_team_ids(game_id: string) {
	const [roster, submissions] = await Promise.all([
		db.query.game_team.findMany({ where: eq(game_team.game_id, game_id) }),
		db.query.team_submission.findMany({ where: eq(team_submission.game_id, game_id) })
	]);
	const standings = roster
		.map(({ team_id }) => ({
			team_id,
			points: submissions
				.filter((submission) => submission.team_id === team_id)
				.reduce((total, submission) => total + submission.points_awarded, 0)
		}))
		.sort((first, second) => second.points - first.points);
	const podium_scores = new Set(standings.slice(0, 3).map((entry) => entry.points));
	const tied_podium_scores = new Set(
		[...podium_scores].filter(
			(score) => standings.filter((entry) => entry.points === score).length > 1
		)
	);
	return standings
		.filter((entry) => tied_podium_scores.has(entry.points))
		.map((entry) => entry.team_id);
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) throw redirect(303, '/auth/login');
	const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
	if (!host_game) throw error(404, 'Game not found');

	const [
		session,
		roster,
		submissions,
		tiebreaker_submissions,
		available_teams,
		stump_submissions,
		previous_completed_game
	] = await Promise.all([
		db.query.game_session.findFirst({ where: eq(game_session.game_id, host_game.id) }),
		db.query.game_team.findMany({
			where: eq(game_team.game_id, host_game.id),
			orderBy: [asc(game_team.created_at)],
			with: { team: true }
		}),
		db.query.team_submission.findMany({ where: eq(team_submission.game_id, host_game.id) }),
		db.query.tiebreaker_submission.findMany({
			where: eq(tiebreaker_submission.game_id, host_game.id)
		}),
		db.query.team.findMany({
			where: eq(team.location_id, host_game.location_id),
			orderBy: [asc(team.name)]
		}),
		db.query.stump_the_host_submission.findMany({
			where: eq(stump_the_host_submission.game_id, host_game.id),
			orderBy: [asc(stump_the_host_submission.created_at)]
		}),
		db.query.game.findFirst({
			where: and(
				eq(game.location_id, host_game.location_id),
				eq(game.status, 'COMPLETED'),
				ne(game.id, host_game.id)
			),
			columns: { id: true, title: true, scheduled_at: true },
			orderBy: [desc(game.scheduled_at)],
			with: { game_teams: { columns: { team_id: true } } }
		})
	]);

	const active_session = session ?? {
		phase: 'RULES',
		current_round_order: 0,
		current_question_order: 0,
		is_started: false,
		is_leaderboard_visible: false,
		is_stump_the_host_visible: false,
		is_stump_answer_revealed: false,
		stump_the_host_submission_id: null
	};
	const current_round =
		host_game.rounds.find((current) => current.order === active_session.current_round_order) ??
		null;
	const current_question =
		current_round?.questions.find(
			(current) => current.order === active_session.current_question_order
		) ?? null;
	const question_to_round = new Map(
		host_game.rounds.flatMap((current_round) =>
			current_round.questions.map(
				(current_question) => [current_question.id, current_round] as const
			)
		)
	);
	const submissions_by_team = new Map<string, (typeof submissions)[number][]>();
	for (const submission of submissions) {
		const team_submissions = submissions_by_team.get(submission.team_id) ?? [];
		team_submissions.push(submission);
		submissions_by_team.set(submission.team_id, team_submissions);
	}
	const tiebreakers_by_team = new Map<string, (typeof tiebreaker_submissions)[number][]>();
	for (const submission of tiebreaker_submissions) {
		const team_tiebreakers = tiebreakers_by_team.get(submission.team_id) ?? [];
		team_tiebreakers.push(submission);
		tiebreakers_by_team.set(submission.team_id, team_tiebreakers);
	}
	const leaderboard = roster
		.map(({ team: current_team }) => {
			const team_submissions = submissions_by_team.get(current_team.id) ?? [];
			const team_tiebreakers = tiebreakers_by_team.get(current_team.id) ?? [];
			return {
				team: current_team,
				submission_count: team_submissions.length + team_tiebreakers.length,
				points: team_submissions.reduce(
					(total, submission) => total + submission.points_awarded,
					0
				),
				round_scores: host_game.rounds.map((current_round) => ({
					label:
						current_round.round_type === 'STANDARD'
							? `R${current_round.order}`
							: current_round.name,
					points: team_submissions
						.filter(
							(submission) => question_to_round.get(submission.question_id)?.id === current_round.id
						)
						.reduce((total, submission) => total + submission.points_awarded, 0)
				})),
				used_wagers:
					current_round?.round_type === 'STANDARD'
						? team_submissions
								.filter(
									(submission) =>
										question_to_round.get(submission.question_id)?.id === current_round.id &&
										submission.question_id !== current_question?.id
								)
								.map((submission) => submission.wager)
								.filter((wager): wager is number => wager !== null)
						: [],
				current_submission: current_question
					? (team_submissions.find(
							(submission) => submission.question_id === current_question.id
						) ?? null)
					: null,
				current_tiebreaker_submission: current_question
					? (team_tiebreakers.find(
							(submission) => submission.question_id === current_question.id
						) ?? null)
					: null,
				tiebreaker_difference: team_tiebreakers[0]?.difference_from_correct ?? null
			};
		})
		.sort(
			(first, second) =>
				second.points - first.points ||
				(first.tiebreaker_difference ?? Number.MAX_SAFE_INTEGER) -
					(second.tiebreaker_difference ?? Number.MAX_SAFE_INTEGER) ||
				first.team.name.localeCompare(second.team.name)
		);
	const podium_scores = new Set(leaderboard.slice(0, 3).map((entry) => entry.points));
	const tied_podium_scores = new Set(
		[...podium_scores].filter(
			(score) => leaderboard.filter((entry) => entry.points === score).length > 1
		)
	);
	const tiebreaker_team_ids = leaderboard
		.filter((entry) => tied_podium_scores.has(entry.points))
		.map((entry) => entry.team.id);
	const has_podium_tie = tiebreaker_team_ids.length > 0;
	const tiebreaker_question_ids = new Set(
		host_game.rounds
			.filter((current_round) => current_round.round_type === 'TIEBREAKER')
			.flatMap((current_round) =>
				current_round.questions.map((current_question) => current_question.id)
			)
	);
	const has_completed_tiebreaker =
		has_podium_tie &&
		tiebreaker_team_ids.every((team_id) =>
			tiebreaker_submissions.some(
				(submission) =>
					submission.team_id === team_id && tiebreaker_question_ids.has(submission.question_id)
			)
		);
	const has_tiebreaker_question = tiebreaker_question_ids.size > 0;
	const requires_tiebreaker =
		has_podium_tie && has_tiebreaker_question && !has_completed_tiebreaker;
	const stump_url = new URL(`/stump/${host_game.location_id}`, url.origin).toString();
	const stump_qr_code = await get_qr_code(stump_url);
	const recap_url = new URL(`/recap/${host_game.id}`, url.origin).toString();
	const recap_qr_code = host_game.status === 'COMPLETED' ? await get_qr_code(recap_url) : null;
	const scorecards = roster
		.map(({ team: current_team }) => leaderboard.find((entry) => entry.team.id === current_team.id))
		.filter((entry): entry is (typeof leaderboard)[number] => Boolean(entry))
		.sort((first, second) => first.team.name.localeCompare(second.team.name));

	return {
		game: host_game,
		session: active_session,
		current_round,
		current_question,
		current_categories:
			current_round?.questions
				.map((current) => current.category?.name)
				.filter((name): name is string => Boolean(name)) ?? [],
		leaderboard,
		scorecards,
		tiebreaker_scorecards: scorecards.filter((entry) =>
			tiebreaker_team_ids.includes(entry.team.id)
		),
		available_teams: available_teams.filter(
			(current_team) => !roster.some(({ team: roster_team }) => roster_team.id === current_team.id)
		),
		previous_game:
			previous_completed_game && !active_session.is_started
				? {
						title: previous_completed_game.title,
						scheduled_at: previous_completed_game.scheduled_at,
						available_team_count: previous_completed_game.game_teams.filter(
							(previous_team) =>
								!roster.some(({ team: current_team }) => current_team.id === previous_team.team_id)
						).length
					}
				: null,
		active_stump_submission:
			stump_submissions.find(
				(submission) => submission.id === active_session.stump_the_host_submission_id
			) ?? null,
		stump_submission_count: stump_submissions.filter((submission) => !submission.is_completed)
			.length,
		can_return_to_scheduled:
			host_game.status === 'IN_PROGRESS' &&
			submissions.length === 0 &&
			tiebreaker_submissions.length === 0,
		stump_url,
		stump_qr_code,
		recap_url,
		recap_qr_code,
		has_podium_tie,
		requires_tiebreaker,
		tiebreaker_team_count: tiebreaker_team_ids.length,
		has_completed_tiebreaker,
		phases: presentation_phases
	};
};

export const actions: Actions = {
	start: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		await db.transaction(async (tx) => {
			await tx.update(game).set({ status: 'IN_PROGRESS' }).where(eq(game.id, host_game.id));
			await tx
				.insert(game_session)
				.values({
					game_id: host_game.id,
					is_started: true,
					phase: 'RULES',
					is_leaderboard_visible: false,
					is_stump_the_host_visible: false,
					is_stump_answer_revealed: false,
					stump_the_host_submission_id: null
				})
				.onConflictDoUpdate({
					target: game_session.game_id,
					set: {
						is_started: true,
						phase: 'RULES',
						current_round_order: 0,
						current_question_order: 0,
						is_leaderboard_visible: false,
						is_stump_the_host_visible: false,
						is_stump_answer_revealed: false,
						stump_the_host_submission_id: null,
						updated_at: new Date()
					}
				});
		});
		return { success: true };
	},
	return_to_scheduled: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		if (host_game.status !== 'IN_PROGRESS')
			return fail(400, { message: 'Only an in-progress game can be returned to upcoming.' });

		const [submission, tiebreaker] = await Promise.all([
			db.query.team_submission.findFirst({ where: eq(team_submission.game_id, host_game.id) }),
			db.query.tiebreaker_submission.findFirst({
				where: eq(tiebreaker_submission.game_id, host_game.id)
			})
		]);
		if (submission || tiebreaker)
			return fail(400, { message: 'Games with saved scores cannot be returned to upcoming.' });

		await db.transaction(async (tx) => {
			await tx.update(game).set({ status: 'SCHEDULED' }).where(eq(game.id, host_game.id));
			await tx.delete(game_session).where(eq(game_session.game_id, host_game.id));
		});
		throw redirect(303, '/dashboard');
	},
	next: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game_for_navigation(
			params.game_id,
			params.location_id,
			locals.user.id
		);
		if (!host_game) return fail(404);
		const session = await db.query.game_session.findFirst({
			where: eq(game_session.game_id, host_game.id)
		});
		if (!session?.is_started) return fail(400, { message: 'Start the game before advancing.' });
		let next = {
			phase: session.phase,
			current_round_order: session.current_round_order,
			current_question_order: session.current_question_order
		};
		const current_round = host_game.rounds.find(
			(current) => current.order === session.current_round_order
		);
		if (session.phase === 'RULES') next = next_round_state(host_game.rounds);
		else if (session.phase === 'ROUND_INTRO') next.phase = 'CATEGORIES';
		else if (session.phase === 'CATEGORIES') {
			next.phase = 'QUESTION';
			next.current_question_order = 1;
		} else if (session.phase === 'LEADERBOARD')
			next = next_round_state(host_game.rounds, session.current_round_order);
		else if (session.phase === 'QUESTION' && current_round) {
			if (
				current_round.round_type === 'STANDARD' &&
				session.current_question_order < current_round.questions.length
			)
				next.current_question_order++;
			else if (current_round.round_type === 'HALFTIME')
				next = next_round_state(host_game.rounds, session.current_round_order);
			else next = next_round_state(host_game.rounds, session.current_round_order);
		}
		await db
			.update(game_session)
			.set({
				...next,
				is_leaderboard_visible: false,
				is_stump_the_host_visible: false,
				is_stump_answer_revealed: false,
				updated_at: new Date()
			})
			.where(eq(game_session.game_id, host_game.id));
		return { success: true };
	},
	toggle_leaderboard: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		const session = await db.query.game_session.findFirst({
			where: eq(game_session.game_id, host_game.id)
		});
		if (!session?.is_started)
			return fail(400, { message: 'Start the game before showing scores.' });
		await db
			.update(game_session)
			.set({
				is_leaderboard_visible: !session.is_leaderboard_visible,
				is_stump_the_host_visible: false,
				is_stump_answer_revealed: false,
				updated_at: new Date()
			})
			.where(eq(game_session.game_id, host_game.id));
		return { success: true };
	},
	spin_stump_the_host: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		const submissions = await db.query.stump_the_host_submission.findMany({
			where: eq(stump_the_host_submission.game_id, host_game.id)
		});
		const available_submissions = submissions.filter((submission) => !submission.is_completed);
		if (!available_submissions.length)
			return fail(400, { message: 'No unused Stump the Host questions are available.' });
		const selected =
			available_submissions[Math.floor(Math.random() * available_submissions.length)];
		await db
			.update(stump_the_host_submission)
			.set({ is_completed: new Date() })
			.where(eq(stump_the_host_submission.id, selected.id));
		await db
			.update(game_session)
			.set({
				is_stump_the_host_visible: true,
				is_stump_answer_revealed: false,
				stump_the_host_submission_id: selected.id,
				is_leaderboard_visible: false,
				updated_at: new Date()
			})
			.where(eq(game_session.game_id, host_game.id));
		return { success: true };
	},
	close_stump_the_host: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		await db
			.update(game_session)
			.set({
				is_stump_the_host_visible: false,
				is_stump_answer_revealed: false,
				updated_at: new Date()
			})
			.where(eq(game_session.game_id, host_game.id));
		return { success: true };
	},
	reveal_stump_answer: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		await db
			.update(game_session)
			.set({ is_stump_answer_revealed: true, updated_at: new Date() })
			.where(eq(game_session.game_id, host_game.id));
		return { success: true };
	},
	previous: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game_for_navigation(
			params.game_id,
			params.location_id,
			locals.user.id
		);
		if (!host_game) return fail(404);
		const session = await db.query.game_session.findFirst({
			where: eq(game_session.game_id, host_game.id)
		});
		if (!session?.is_started) return fail(400, { message: 'Start the game before going back.' });

		let previous = {
			phase: session.phase,
			current_round_order: session.current_round_order,
			current_question_order: session.current_question_order
		};
		const current_round = host_game.rounds.find(
			(current) => current.order === session.current_round_order
		);
		if (session.phase === 'ROUND_INTRO')
			previous = previous_round_end_state(host_game.rounds, session.current_round_order);
		else if (session.phase === 'CATEGORIES')
			previous = previous_round_end_state(host_game.rounds, session.current_round_order);
		else if (session.phase === 'LEADERBOARD') previous.phase = 'QUESTION';
		else if (session.phase === 'QUESTION' && current_round) {
			if (current_round.round_type === 'STANDARD') {
				if (session.current_question_order > 1) previous.current_question_order--;
				else previous.phase = 'CATEGORIES';
			} else previous = previous_round_end_state(host_game.rounds, session.current_round_order);
		} else if (session.phase === 'COMPLETE') {
			const last_round = [...host_game.rounds]
				.reverse()
				.find((current_round) => current_round.round_type !== 'TIEBREAKER');
			if (last_round)
				previous = {
					phase: 'QUESTION',
					current_round_order: last_round.order,
					current_question_order: last_round.questions.length
				};
		} else if (
			['FINAL_RESULTS_BOTTOM', 'FINAL_RESULTS_FULL', 'FINAL_RESULTS_TOP'].includes(session.phase)
		) {
			previous = { phase: 'COMPLETE', current_round_order: 0, current_question_order: 0 };
		}

		await db
			.update(game_session)
			.set({
				...previous,
				is_leaderboard_visible: false,
				is_stump_the_host_visible: false,
				is_stump_answer_revealed: false,
				updated_at: new Date()
			})
			.where(eq(game_session.game_id, host_game.id));
		return { success: true };
	},
	start_tiebreaker: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		const session = await db.query.game_session.findFirst({
			where: eq(game_session.game_id, host_game.id)
		});
		if (!session?.is_started || session.phase !== 'COMPLETE')
			return fail(400, { message: 'Finish the game presentation before starting a tiebreaker.' });
		if ((await podium_tiebreaker_team_ids(host_game.id)).length === 0)
			return fail(400, { message: 'There are no podium ties to resolve.' });
		const tiebreaker_round = host_game.rounds.find(
			(current_round) => current_round.round_type === 'TIEBREAKER'
		);
		if (!tiebreaker_round)
			return fail(400, { message: 'This game does not have a tiebreaker question.' });
		await db
			.update(game_session)
			.set({
				phase: 'QUESTION',
				current_round_order: tiebreaker_round.order,
				current_question_order: 1,
				updated_at: new Date()
			})
			.where(eq(game_session.game_id, host_game.id));
		return { success: true };
	},
	show_final_results: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		const session = await db.query.game_session.findFirst({
			where: eq(game_session.game_id, host_game.id)
		});
		if (!session?.is_started || session.phase !== 'COMPLETE')
			return fail(400, { message: 'Finish the game presentation before showing final standings.' });
		const tiebreaker_round = host_game.rounds.find(
			(current_round) => current_round.round_type === 'TIEBREAKER'
		);
		const tied_team_ids = await podium_tiebreaker_team_ids(host_game.id);
		if (tiebreaker_round?.questions.length && tied_team_ids.length > 0) {
			const tiebreaker_question_ids = tiebreaker_round.questions.map(
				(current_question) => current_question.id
			);
			const recorded_submissions = await db.query.tiebreaker_submission.findMany({
				where: eq(tiebreaker_submission.game_id, host_game.id)
			});
			const has_all_answers = tied_team_ids.every((team_id) =>
				recorded_submissions.some(
					(submission) =>
						submission.team_id === team_id &&
						tiebreaker_question_ids.includes(submission.question_id)
				)
			);
			if (!has_all_answers)
				return fail(400, {
					message: `${tied_team_ids.length} teams are tied for podium spots. Run and score the tiebreaker before showing final standings.`
				});
		}
		const roster = await db.query.game_team.findMany({
			where: eq(game_team.game_id, host_game.id),
			columns: { id: true }
		});
		await db
			.update(game_session)
			.set({
				phase: roster.length > 5 ? 'FINAL_RESULTS_BOTTOM' : 'FINAL_RESULTS_FULL',
				updated_at: new Date()
			})
			.where(eq(game_session.game_id, host_game.id));
		return { success: true };
	},
	complete: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		const session = await db.query.game_session.findFirst({
			where: eq(game_session.game_id, host_game.id)
		});
		if (!session?.is_started || session.phase !== 'FINAL_RESULTS_FULL')
			return fail(400, { message: 'Show the full final standings before completing the game.' });
		const tiebreaker_round = host_game.rounds.find(
			(current_round) => current_round.round_type === 'TIEBREAKER'
		);
		const tied_team_ids = await podium_tiebreaker_team_ids(host_game.id);
		if (tiebreaker_round?.questions.length && tied_team_ids.length > 0) {
			const tiebreaker_question_ids = tiebreaker_round.questions.map(
				(current_question) => current_question.id
			);
			const recorded_submissions = await db.query.tiebreaker_submission.findMany({
				where: eq(tiebreaker_submission.game_id, host_game.id)
			});
			const has_all_answers = tied_team_ids.every((team_id) =>
				recorded_submissions.some(
					(submission) =>
						submission.team_id === team_id &&
						tiebreaker_question_ids.includes(submission.question_id)
				)
			);
			if (!has_all_answers)
				return fail(400, {
					message: `${tied_team_ids.length} teams are tied for podium spots. Run and score the tiebreaker before completing the game.`
				});
		}
		await db.update(game).set({ status: 'COMPLETED' }).where(eq(game.id, host_game.id));
		await db
			.update(game_session)
			.set({
				phase: 'FINAL_RESULTS_RECAP',
				is_leaderboard_visible: false,
				updated_at: new Date()
			})
			.where(eq(game_session.game_id, host_game.id));
		return { success: true };
	},
	toggle_final_results: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		const session = await db.query.game_session.findFirst({
			where: eq(game_session.game_id, host_game.id)
		});
		if (
			!session ||
			!['FINAL_RESULTS_BOTTOM', 'FINAL_RESULTS_FULL', 'FINAL_RESULTS_RECAP'].includes(session.phase)
		)
			return fail(400, { message: 'Final standings are not currently being shown.' });
		const form_data = await request.formData();
		const requested_view = form_data.get('view');
		const view =
			requested_view === 'FULL' || requested_view === 'RECAP' ? requested_view : 'BOTTOM';
		if (view === 'RECAP' && host_game.status !== 'COMPLETED')
			return fail(400, { message: 'Complete the game before showing its recap QR code.' });
		await db
			.update(game_session)
			.set({ phase: `FINAL_RESULTS_${view}`, updated_at: new Date() })
			.where(eq(game_session.game_id, host_game.id));
		return { success: true };
	},
	add_team: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		const form_data = await request.formData();
		let team_id = String(form_data.get('team_id') ?? '');
		const team_name = String(form_data.get('team_name') ?? '').trim();
		if (team_name) {
			const duplicate_team = await db.query.team.findFirst({
				where: and(
					eq(team.location_id, host_game.location_id),
					sql`lower(${team.name}) = lower(${team_name})`
				)
			});
			if (duplicate_team)
				return fail(409, { message: 'A team with that name already exists at this location.' });
			const [created_team] = await db
				.insert(team)
				.values({ name: team_name, location_id: host_game.location_id, user_id: locals.user.id })
				.returning({ id: team.id });
			team_id = created_team.id;
		}
		if (!team_id) return fail(400, { message: 'Choose or name a team.' });
		const selected_team = await db.query.team.findFirst({
			where: and(eq(team.id, team_id), eq(team.location_id, host_game.location_id))
		});
		if (!selected_team) return fail(404, { message: 'Team not found.' });
		await db.insert(game_team).values({ game_id: host_game.id, team_id }).onConflictDoNothing();
		return { success: true };
	},
	rename_team: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game_access(
			params.game_id,
			params.location_id,
			locals.user.id
		);
		if (!host_game) return fail(404);
		const form_data = await request.formData();
		const team_id = String(form_data.get('team_id') ?? '');
		const team_name = String(form_data.get('team_name') ?? '').trim();
		if (!team_id || !team_name) return fail(400, { message: 'Enter a team name.' });
		if (team_name.length > 255)
			return fail(400, { message: 'Team names must be 255 characters or fewer.' });

		const roster_entry = await db.query.game_team.findFirst({
			where: and(eq(game_team.game_id, host_game.id), eq(game_team.team_id, team_id))
		});
		if (!roster_entry) return fail(404, { message: 'Team is not on this game.' });
		const duplicate_team = await db.query.team.findFirst({
			where: and(
				eq(team.location_id, host_game.location_id),
				sql`lower(${team.name}) = lower(${team_name})`,
				ne(team.id, team_id)
			)
		});
		if (duplicate_team) return fail(409, { message: 'A team with that name already exists here.' });

		await db.update(team).set({ name: team_name }).where(eq(team.id, team_id));
		return { success: true };
	},
	delete_team: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game_access(
			params.game_id,
			params.location_id,
			locals.user.id
		);
		if (!host_game) return fail(404);
		const team_id = String((await request.formData()).get('team_id') ?? '');
		if (!team_id) return fail(400, { message: 'Choose a team to delete.' });
		const selected_team = await db.query.team.findFirst({
			where: and(eq(team.id, team_id), eq(team.location_id, host_game.location_id))
		});
		if (!selected_team) return fail(404, { message: 'Team not found.' });
		const [existing_submission, existing_tiebreaker] = await Promise.all([
			db.query.team_submission.findFirst({
				where: eq(team_submission.team_id, selected_team.id),
				columns: { id: true }
			}),
			db.query.tiebreaker_submission.findFirst({
				where: eq(tiebreaker_submission.team_id, selected_team.id),
				columns: { id: true }
			})
		]);
		if (existing_submission || existing_tiebreaker)
			return fail(409, {
				message: 'This team has saved score history and cannot be deleted.'
			});

		await db.transaction(async (tx) => {
			await tx.delete(game_team).where(eq(game_team.team_id, selected_team.id));
			await tx.delete(team).where(eq(team.id, selected_team.id));
		});
		return { success: true };
	},
	add_previous_teams: async ({ locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		const session = await db.query.game_session.findFirst({
			where: eq(game_session.game_id, host_game.id)
		});
		if (session?.is_started)
			return fail(400, { message: 'Teams can only be copied before the game starts.' });

		const previous_game = await db.query.game.findFirst({
			where: and(
				eq(game.location_id, host_game.location_id),
				eq(game.status, 'COMPLETED'),
				ne(game.id, host_game.id)
			),
			orderBy: [desc(game.scheduled_at)],
			with: { game_teams: { columns: { team_id: true } } }
		});
		if (!previous_game)
			return fail(400, { message: 'No completed game exists at this location yet.' });

		const current_roster = await db.query.game_team.findMany({
			where: eq(game_team.game_id, host_game.id),
			columns: { team_id: true }
		});
		const current_team_ids = new Set(current_roster.map((entry) => entry.team_id));
		const team_ids_to_add = previous_game.game_teams
			.map((entry) => entry.team_id)
			.filter((team_id) => !current_team_ids.has(team_id));
		if (!team_ids_to_add.length)
			return fail(400, { message: 'All teams from the last game are already on this scorecard.' });

		await db
			.insert(game_team)
			.values(team_ids_to_add.map((team_id) => ({ game_id: host_game.id, team_id })))
			.onConflictDoNothing();
		return { success: true, added_team_count: team_ids_to_add.length };
	},
	remove_team: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game_access(
			params.game_id,
			params.location_id,
			locals.user.id
		);
		if (!host_game) return fail(404);
		const team_id = String((await request.formData()).get('team_id') ?? '');
		if (!team_id) return fail(400, { message: 'Choose a team to remove.' });
		const roster_entry = await db.query.game_team.findFirst({
			where: and(eq(game_team.game_id, host_game.id), eq(game_team.team_id, team_id))
		});
		if (!roster_entry) return fail(404, { message: 'Team is not on this game.' });
		await db.transaction(async (tx) => {
			await tx
				.delete(team_submission)
				.where(
					and(eq(team_submission.game_id, host_game.id), eq(team_submission.team_id, team_id))
				);
			await tx
				.delete(tiebreaker_submission)
				.where(
					and(
						eq(tiebreaker_submission.game_id, host_game.id),
						eq(tiebreaker_submission.team_id, team_id)
					)
				);
			await tx
				.delete(game_team)
				.where(and(eq(game_team.game_id, host_game.id), eq(game_team.team_id, team_id)));
		});
		return { success: true };
	},
	toggle_bonus: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		const form_data = await request.formData();
		const team_id = String(form_data.get('team_id') ?? '');
		const question_id = String(form_data.get('question_id') ?? '');
		const selected_question = await db.query.question.findFirst({
			where: eq(question.id, question_id),
			with: { round: true }
		});
		if (
			!selected_question ||
			selected_question.round.game_id !== host_game.id ||
			selected_question.round.round_type !== 'STANDARD' ||
			selected_question.question_type !== 'TWO_PART_BONUS'
		)
			return fail(400, { message: 'This bonus score cannot be updated.' });
		const submission = await db.query.team_submission.findFirst({
			where: and(
				eq(team_submission.game_id, host_game.id),
				eq(team_submission.team_id, team_id),
				eq(team_submission.question_id, question_id)
			)
		});
		if (!submission || submission.wager === null)
			return fail(404, { message: 'Score submission not found.' });
		const is_correct_bonus =
			submission.is_correct_primary && form_data.get('bonus_correct') === 'true';
		const points_awarded =
			(submission.is_correct_primary ? submission.wager : 0) +
			(is_correct_bonus ? selected_question.bonus_points_value : 0);
		await db
			.update(team_submission)
			.set({ is_correct_bonus, points_awarded })
			.where(eq(team_submission.id, submission.id));
		return { success: true };
	},
	clear_score: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game_access(
			params.game_id,
			params.location_id,
			locals.user.id
		);
		if (!host_game) return fail(404);
		const form_data = await request.formData();
		const team_id = String(form_data.get('team_id') ?? '');
		const question_id = String(form_data.get('question_id') ?? '');
		const [selected_team, selected_question] = await Promise.all([
			db.query.game_team.findFirst({
				where: and(eq(game_team.game_id, host_game.id), eq(game_team.team_id, team_id))
			}),
			db.query.question.findFirst({ where: eq(question.id, question_id), with: { round: true } })
		]);
		if (!selected_team || !selected_question || selected_question.round.game_id !== host_game.id)
			return fail(400, { message: 'Invalid scorecard action.' });

		if (selected_question.round.round_type === 'TIEBREAKER') {
			await db
				.delete(tiebreaker_submission)
				.where(
					and(
						eq(tiebreaker_submission.game_id, host_game.id),
						eq(tiebreaker_submission.question_id, question_id),
						eq(tiebreaker_submission.team_id, team_id)
					)
				);
		} else {
			await db
				.delete(team_submission)
				.where(
					and(
						eq(team_submission.game_id, host_game.id),
						eq(team_submission.question_id, question_id),
						eq(team_submission.team_id, team_id)
					)
				);
		}
		return { success: true };
	},
	score: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game_access(
			params.game_id,
			params.location_id,
			locals.user.id
		);
		if (!host_game) return fail(404);
		const form_data = await request.formData();
		const team_id = String(form_data.get('team_id') ?? '');
		const question_id = String(form_data.get('question_id') ?? '');
		const selected_team = await db.query.game_team.findFirst({
			where: and(eq(game_team.game_id, host_game.id), eq(game_team.team_id, team_id))
		});
		const selected_question = await db.query.question.findFirst({
			where: eq(question.id, question_id),
			with: { round: true }
		});
		if (!selected_team || !selected_question || selected_question.round.game_id !== host_game.id)
			return fail(400, { message: 'Invalid scorecard action.' });
		const correct = form_data.get('correct') === 'true';
		const bonus_correct =
			correct &&
			selected_question.question_type === 'TWO_PART_BONUS' &&
			form_data.get('bonus_correct') === 'true';
		const wager = Number(form_data.get('wager') ?? 0);
		if (
			selected_question.round.round_type === 'STANDARD' &&
			!host_game.standard_wager_options.includes(wager)
		)
			return fail(400, { message: 'Choose one of this game’s available wagers.' });
		if (selected_question.round.round_type === 'STANDARD') {
			const [round_questions, team_submissions] = await Promise.all([
				db.query.question.findMany({
					where: eq(question.round_id, selected_question.round.id),
					columns: { id: true }
				}),
				db.query.team_submission.findMany({
					where: and(
						eq(team_submission.game_id, host_game.id),
						eq(team_submission.team_id, team_id)
					)
				})
			]);
			const round_question_ids = new Set(round_questions.map((current) => current.id));
			const conflicting_submission = team_submissions.find(
				(submission) =>
					submission.question_id !== question_id &&
					round_question_ids.has(submission.question_id) &&
					submission.wager === wager
			);
			if (conflicting_submission)
				return fail(409, { message: 'Use the explicit wager swap control to change this wager.' });
		}
		const items_correct = Math.max(
			0,
			Math.min(Number(form_data.get('items_correct') ?? 0), selected_question.max_items)
		);
		let points_awarded = 0;
		if (selected_question.round.round_type === 'STANDARD')
			points_awarded =
				(correct ? wager : 0) + (bonus_correct ? selected_question.bonus_points_value : 0);
		else if (selected_question.round.round_type === 'FINAL')
			points_awarded = correct ? wager : -wager;
		else if (selected_question.round.round_type === 'HALFTIME')
			points_awarded =
				items_correct * selected_question.points_value +
				(items_correct === selected_question.max_items ? selected_question.bonus_points_value : 0);
		await db
			.insert(team_submission)
			.values({
				game_id: host_game.id,
				question_id,
				team_id,
				wager: selected_question.round.round_type === 'HALFTIME' ? null : wager,
				items_correct,
				is_correct_primary: correct,
				is_correct_bonus: bonus_correct,
				points_awarded
			})
			.onConflictDoUpdate({
				target: [team_submission.game_id, team_submission.question_id, team_submission.team_id],
				set: {
					wager: selected_question.round.round_type === 'HALFTIME' ? null : wager,
					items_correct,
					is_correct_primary: correct,
					is_correct_bonus: bonus_correct,
					points_awarded
				}
			});
		return { success: true };
	},
	swap_wager: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		const form_data = await request.formData();
		const team_id = String(form_data.get('team_id') ?? '');
		const question_id = String(form_data.get('question_id') ?? '');
		const target_wager = Number(form_data.get('target_wager'));
		if (!host_game.standard_wager_options.includes(target_wager))
			return fail(400, { message: 'Choose one of the configured wagers.' });
		const selected_question = await db.query.question.findFirst({
			where: eq(question.id, question_id),
			with: { round: true }
		});
		if (
			!selected_question ||
			selected_question.round.game_id !== host_game.id ||
			selected_question.round.round_type !== 'STANDARD'
		)
			return fail(400, { message: 'Only standard-round wagers can be swapped.' });
		const team_submissions = await db.query.team_submission.findMany({
			where: and(eq(team_submission.game_id, host_game.id), eq(team_submission.team_id, team_id))
		});
		const current_round = host_game.rounds.find(
			(current) => current.id === selected_question.round.id
		);
		const round_question_ids = new Set(current_round?.questions.map((current) => current.id));
		const selected_submission = team_submissions.find(
			(submission) => submission.question_id === question_id
		);
		if (selected_submission?.wager === null || selected_submission?.wager === undefined)
			return fail(400, { message: 'This question has not been scored yet.' });
		const selected_wager = selected_submission.wager;
		const conflicting_submission = team_submissions.find(
			(submission) =>
				submission.question_id !== question_id &&
				round_question_ids.has(submission.question_id) &&
				submission.wager === target_wager
		);
		const points_for_wager = (submission: typeof selected_submission, wager: number) => {
			if (!submission) return 0;
			const submission_question = current_round?.questions.find(
				(current_question) => current_question.id === submission.question_id
			);
			return (
				(submission.is_correct_primary ? wager : 0) +
				(submission.is_correct_primary && submission.is_correct_bonus
					? (submission_question?.bonus_points_value ?? 0)
					: 0)
			);
		};
		await db.transaction(async (tx) => {
			if (conflicting_submission)
				await tx
					.update(team_submission)
					.set({
						wager: selected_wager,
						points_awarded: points_for_wager(conflicting_submission, selected_wager)
					})
					.where(eq(team_submission.id, conflicting_submission.id));
			await tx
				.update(team_submission)
				.set({
					wager: target_wager,
					points_awarded: points_for_wager(selected_submission, target_wager)
				})
				.where(eq(team_submission.id, selected_submission.id));
		});
		return { success: true };
	},
	tiebreaker: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401);
		const host_game = await get_owned_game(params.game_id, params.location_id, locals.user.id);
		if (!host_game) return fail(404);
		const form_data = await request.formData();
		const team_id = String(form_data.get('team_id') ?? '');
		const question_id = String(form_data.get('question_id') ?? '');
		const submitted_answer = Number(form_data.get('submitted_answer'));
		const selected_question = await db.query.question.findFirst({
			where: eq(question.id, question_id),
			with: { round: true }
		});
		if (
			!Number.isFinite(submitted_answer) ||
			!selected_question ||
			selected_question.round.round_type !== 'TIEBREAKER'
		)
			return fail(400, { message: 'Enter a numeric tiebreaker answer.' });
		const selected_team = await db.query.game_team.findFirst({
			where: and(eq(game_team.game_id, host_game.id), eq(game_team.team_id, team_id))
		});
		if (!selected_team) return fail(400, { message: 'Invalid team scorecard.' });
		const tied_team_ids = await podium_tiebreaker_team_ids(host_game.id);
		if (!tied_team_ids.includes(team_id))
			return fail(400, { message: 'Only teams tied for a podium spot need a tiebreaker score.' });
		await db
			.delete(tiebreaker_submission)
			.where(
				and(
					eq(tiebreaker_submission.game_id, host_game.id),
					eq(tiebreaker_submission.question_id, question_id),
					eq(tiebreaker_submission.team_id, team_id)
				)
			);
		await db.insert(tiebreaker_submission).values({
			game_id: host_game.id,
			question_id,
			team_id,
			tied_for_rank: 1,
			submitted_answer,
			difference_from_correct: Math.abs(submitted_answer - (selected_question.numeric_answer ?? 0))
		});
		return { success: true };
	}
};
