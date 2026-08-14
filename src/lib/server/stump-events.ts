type StumpEventSubscriber = {
	controller: ReadableStreamDefaultController<Uint8Array>;
	heartbeat: ReturnType<typeof setInterval>;
};

const encoder = new TextEncoder();
const subscribers_by_game = new Map<string, Set<StumpEventSubscriber>>();

export function publish_stump_submission(game_id: string) {
	const subscribers = subscribers_by_game.get(game_id);
	if (!subscribers) return;

	for (const subscriber of subscribers) {
		try {
			subscriber.controller.enqueue(encoder.encode('event: stump-submitted\ndata: submitted\n\n'));
		} catch {
			clearInterval(subscriber.heartbeat);
			subscribers.delete(subscriber);
		}
	}
	if (subscribers.size === 0) subscribers_by_game.delete(game_id);
}

export function create_stump_event_stream(game_id: string, signal: AbortSignal) {
	let subscriber: StumpEventSubscriber | null = null;

	const cleanup = () => {
		if (!subscriber) return;
		clearInterval(subscriber.heartbeat);
		const subscribers = subscribers_by_game.get(game_id);
		subscribers?.delete(subscriber);
		if (subscribers?.size === 0) subscribers_by_game.delete(game_id);
		subscriber = null;
	};

	signal.addEventListener('abort', cleanup, { once: true });
	return new ReadableStream<Uint8Array>({
		start(controller) {
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': keep-alive\n\n'));
				} catch {
					cleanup();
				}
			}, 25_000);
			subscriber = { controller, heartbeat };
			const subscribers = subscribers_by_game.get(game_id) ?? new Set<StumpEventSubscriber>();
			subscribers.add(subscriber);
			subscribers_by_game.set(game_id, subscribers);
			controller.enqueue(encoder.encode(': connected\n\n'));
		},
		cancel: cleanup
	});
}
