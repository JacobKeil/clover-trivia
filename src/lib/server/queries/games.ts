import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { game, location } from '$lib/server/db/schema';

export async function get_user_dashboard_games(user_id: string) {
	return db
		.select({
			id: game.id,
			title: game.title,
			scheduled_at: game.scheduled_at,
			status: game.status,
			standard_question_count: game.standard_question_count,
			standard_wager_options: game.standard_wager_options,
			created_at: game.created_at,
			location_id: location.id,
			location_name: location.name
		})
		.from(game)
		.innerJoin(location, eq(game.location_id, location.id))
		.where(eq(location.user_id, user_id))
		.orderBy(desc(game.created_at));
}

export type Dashboard_Game = Awaited<ReturnType<typeof get_user_dashboard_games>>[number];
