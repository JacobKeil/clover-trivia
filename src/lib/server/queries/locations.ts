import { db } from '$lib/server/db';

export async function get_user_locations(user_id: string) {
	return await db.query.location.findMany({
		where: (location, { eq }) => eq(location.user_id, user_id),
		orderBy: (location, { desc }) => [desc(location.created_at)],
		with: {
			location_rule: true,
			games: {
				// Filter the nested games to ONLY include completed ones
				where: (game, { eq }) => eq(game.status, 'COMPLETED'),
				// Order them by the most recent date
				orderBy: (game, { desc }) => [desc(game.scheduled_at)],
				limit: 1
			}
		}
	});
}

export type Location_Dashboard = Awaited<ReturnType<typeof get_user_locations>>[number];
