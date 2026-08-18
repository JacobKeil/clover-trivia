<script lang="ts">
	import { onMount } from 'svelte';
	import { navigating } from '$app/state';

	const loading_delay_ms = 250;

	let active_request_count = $state(0);
	let is_visible = $state(false);
	let is_navigating = $derived(navigating.to !== null);
	let is_busy = $derived(active_request_count > 0 || is_navigating);

	onMount(() => {
		document.getElementById('initial-loading')?.remove();

		const original_fetch = window.fetch;

		window.fetch = (async (...args: Parameters<typeof fetch>) => {
			active_request_count += 1;
			try {
				return await original_fetch(...args);
			} finally {
				active_request_count -= 1;
			}
		}) as typeof fetch;

		return () => {
			window.fetch = original_fetch;
		};
	});

	$effect(() => {
		if (!is_busy) {
			is_visible = false;
			return;
		}

		const timer = window.setTimeout(() => {
			is_visible = true;
		}, loading_delay_ms);

		return () => window.clearTimeout(timer);
	});
</script>

{#if is_visible && is_navigating}
	<div
		class="fixed inset-0 z-100 grid place-items-center bg-white/72 px-4 backdrop-blur-[1px]"
		role="status"
		aria-live="polite"
	>
		<div
			class="flex items-center gap-3 rounded-xl border border-[#d7e5da] bg-white px-5 py-4 text-sm font-semibold text-[#173f33] shadow-xl"
		>
			<span class="size-5 animate-spin rounded-full border-2 border-[#8fc9a1] border-t-[#176249]"
			></span>
			<span>Loading page…</span>
		</div>
	</div>
{:else if is_visible}
	<div
		class="pointer-events-none fixed inset-x-0 top-0 z-100 flex justify-center px-4"
		role="status"
		aria-live="polite"
	>
		<div
			class="flex items-center gap-2 rounded-b-lg bg-[#173f33] px-4 py-2 text-sm font-semibold text-white shadow-lg"
		>
			<span class="size-3 animate-spin rounded-full border-2 border-[#b8ddc2] border-t-white"
			></span>
			<span>Loading…</span>
		</div>
	</div>
{/if}
