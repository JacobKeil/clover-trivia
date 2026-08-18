import { error } from '@sveltejs/kit';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { game, location } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

const page_size = 12;

export const load: PageServerLoad = async ({ params, url }) => {
	const requested_page = Number(url.searchParams.get('page') ?? '1');
	const current_page = Number.isInteger(requested_page) && requested_page > 0 ? requested_page : 1;
	const current_location = await db.query.location.findFirst({
		where: eq(location.id, params.location_id),
		columns: { id: true, name: true, address: true, logo_url: true, picture_url: true }
	});
	if (!current_location) throw error(404, 'Location not found');

	const where_completed = and(
		eq(game.location_id, current_location.id),
		eq(game.status, 'COMPLETED')
	);
	const [{ total }] = await db.select({ total: count() }).from(game).where(where_completed);
	const total_pages = Math.max(1, Math.ceil(total / page_size));
	const page = Math.min(current_page, total_pages);
	const games = await db
		.select({ id: game.id, title: game.title, scheduled_at: game.scheduled_at })
		.from(game)
		.where(where_completed)
		.orderBy(desc(game.scheduled_at))
		.limit(page_size)
		.offset((page - 1) * page_size);

	return { location: current_location, games, page, total, total_pages };
};
