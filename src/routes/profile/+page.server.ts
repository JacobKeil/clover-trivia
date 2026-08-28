import { fail, redirect } from '@sveltejs/kit';
import { count, eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { game, location, team } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/login');

	const [location_total, game_total, team_total] = await Promise.all([
		db.select({ value: count() }).from(location).where(eq(location.user_id, locals.user.id)),
		db
			.select({ value: count() })
			.from(game)
			.innerJoin(location, eq(game.location_id, location.id))
			.where(eq(location.user_id, locals.user.id)),
		db.select({ value: count() }).from(team).where(eq(team.user_id, locals.user.id))
	]);

	return {
		user: locals.user,
		stats: {
			locations: location_total[0]?.value ?? 0,
			games: game_total[0]?.value ?? 0,
			teams: team_total[0]?.value ?? 0
		}
	};
};

export const actions: Actions = {
	sign_out: async (event) => {
		if (!event.locals.user) return fail(401);
		await auth.api.signOut({ headers: event.request.headers });
		redirect(302, '/auth/login');
	}
};
