import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { game } from '$lib/server/db/schema';
import { create_stump_event_stream } from '$lib/server/stump-events';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) throw error(401, 'Sign in to receive host updates.');

	const host_game = await db.query.game.findFirst({
		where: eq(game.id, params.game_id),
		with: { location: true }
	});
	if (
		!host_game ||
		host_game.location_id !== params.location_id ||
		host_game.location.user_id !== locals.user.id
	)
		throw error(404, 'Game not found.');

	return new Response(create_stump_event_stream(host_game.id, request.signal), {
		headers: {
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'Content-Type': 'text/event-stream',
			'X-Accel-Buffering': 'no'
		}
	});
};
