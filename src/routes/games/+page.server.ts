import { error, redirect } from '@sveltejs/kit';
import { count, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { game, location } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

const page_size = 12;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(303, '/auth/login');
	const requested_page = Number(url.searchParams.get('page') ?? '1');
	const current_page = Number.isInteger(requested_page) && requested_page > 0 ? requested_page : 1;
	const where_owned = eq(location.user_id, locals.user.id);
	const [{ total }] = await db
		.select({ total: count() })
		.from(game)
		.innerJoin(location, eq(game.location_id, location.id))
		.where(where_owned);
	if (!total && current_page > 1) throw error(404, 'Page not found');
	const total_pages = Math.max(1, Math.ceil(total / page_size));
	const page = Math.min(current_page, total_pages);
	const games = await db
		.select({
			id: game.id,
			title: game.title,
			scheduled_at: game.scheduled_at,
			status: game.status,
			location_id: location.id,
			location_name: location.name
		})
		.from(game)
		.innerJoin(location, eq(game.location_id, location.id))
		.where(where_owned)
		.orderBy(desc(game.scheduled_at), desc(game.created_at))
		.limit(page_size)
		.offset((page - 1) * page_size);

	return { games, page, total, total_pages };
};
