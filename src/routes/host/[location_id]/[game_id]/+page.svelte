<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Dialog } from 'bits-ui';
	import {
		ChevronRight,
		CircleQuestionMark,
		ExternalLink,
		Fullscreen,
		Play,
		Trophy
	} from '@lucide/svelte';
	import { onMount } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { DialogCloseButton } from '$lib/components/ui';
	import HostScorecards from './HostScorecards.svelte';
	import HostLeaderboard from './HostLeaderboard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let is_fullscreen = $state(false);
	let is_advancing_slide = $state(false);
	let is_returning_slide = $state(false);
	let presentation_sync_channel: BroadcastChannel | null = null;
	let stump_event_source: EventSource | null = null;

	let current_is_standard = $derived(data.current_round?.round_type === 'STANDARD');
	let is_presentation_popout = $derived(page.url.searchParams.get('presentation') === '1');
	let is_presentation_preview = $derived(page.url.searchParams.get('preview') === '1');
	let is_final_results_bottom = $derived(data.session.phase === 'FINAL_RESULTS_BOTTOM');
	let is_final_results_full = $derived(
		data.session.phase === 'FINAL_RESULTS_FULL' || data.session.phase === 'FINAL_RESULTS_TOP'
	);
	let is_final_results_recap = $derived(data.session.phase === 'FINAL_RESULTS_RECAP');
	let is_showing_final_results = $derived(
		is_final_results_bottom || is_final_results_full || is_final_results_recap
	);
	let final_results_bottom_up = $derived([...data.leaderboard.slice(5)].reverse());
	let leaderboard_bottom_up = $derived([...data.leaderboard].reverse());
	let presentation_height = $state(0);
	let presentation_leaderboard_density = $derived.by(() => {
		if (!presentation_height || !data.leaderboard.length) return 'normal';
		const row_allowance = Math.max(0, presentation_height - 150) / data.leaderboard.length;
		return row_allowance < 42 ? 'tight' : row_allowance < 70 ? 'compact' : 'normal';
	});
	let presentation_leaderboard_row_spacing = $derived(
		presentation_leaderboard_density === 'tight'
			? 'gap-1.5 px-2 py-px'
			: presentation_leaderboard_density === 'compact'
				? 'gap-2 px-3 py-1'
				: 'gap-4 px-5 py-3'
	);
	let presentation_leaderboard_rank_size = $derived(
		presentation_leaderboard_density === 'tight'
			? 'size-4 text-[.55rem]'
			: presentation_leaderboard_density === 'compact'
				? 'size-6 text-xs'
				: 'size-8 text-sm'
	);
	let presentation_leaderboard_text_size = $derived(
		presentation_leaderboard_density === 'tight'
			? 'text-[.85rem]'
			: presentation_leaderboard_density === 'compact'
				? 'text-[1.05rem]'
				: 'text-lg'
	);
	let presentation_leaderboard_points_size = $derived(
		presentation_leaderboard_density === 'tight'
			? 'text-[.85rem]'
			: presentation_leaderboard_density === 'compact'
				? 'text-xl'
				: 'text-3xl'
	);
	let rules_scale = $state(1);
	let rules_display_height = $state<number | undefined>(undefined);
	let presentation_preview_scale = $state(1);
	let presentation_preview_height = $state<number | undefined>(undefined);
	let standard_round_number = $derived(
		data.current_round?.round_type === 'STANDARD'
			? data.game.rounds
					.filter((round) => round.round_type === 'STANDARD')
					.findIndex((round) => round.id === data.current_round?.id) + 1
			: null
	);
	let presentation_label = $derived(
		is_final_results_bottom || is_final_results_full
			? 'FINAL STANDINGS'
			: is_final_results_recap
				? 'GAME RECAP'
			: data.session.phase === 'RULES'
				? 'Trivia Rules'
				: data.session.phase === 'ROUND_INTRO'
					? data.current_round?.name
					: data.session.phase === 'CATEGORIES'
						? current_is_standard
							? `Round ${standard_round_number} Categories`
							: 'CATEGORIES'
						: data.session.phase === 'LEADERBOARD'
							? 'LIVE LEADERBOARD'
							: data.session.phase === 'COMPLETE'
								? 'GAME COMPLETE'
								: current_is_standard
									? `Round ${standard_round_number} · Question ${data.current_question?.order ?? ''}`
									: data.current_round?.name
	);
	let host_status = $derived(
		!data.session.is_started
			? 'Ready to host'
			: data.game.status === 'COMPLETED'
				? 'Game complete'
				: presentation_label
	);
	let current_question_text_size = $derived.by(() => {
		const length = data.current_question?.question_text.length ?? 0;
		if (is_presentation_popout)
			return length > 220
				? 'max-w-6xl text-[clamp(2.25rem,4.5vw,5rem)]'
				: length > 110
					? 'max-w-6xl text-[clamp(2.75rem,5vw,6.25rem)]'
					: 'max-w-6xl text-[clamp(3.25rem,6vw,7.5rem)]';
		return length > 220
			? 'max-w-3xl text-[clamp(1.5rem,3vw,3rem)]'
			: length > 110
				? 'max-w-3xl text-[clamp(1.75rem,3.5vw,3.5rem)]'
				: 'max-w-3xl text-[clamp(2rem,4vw,4rem)]';
	});
	let stump_question_text_size = $derived.by(() => {
		const length = data.active_stump_submission?.question_text.length ?? 0;
		return length > 220
			? 'text-[clamp(2rem,3.75vw,4.5rem)]'
			: length > 110
				? 'text-[clamp(2.25rem,4.25vw,5.25rem)]'
				: 'text-[clamp(2.5rem,5vw,6rem)]';
	});

	function leaderboard_position_for(entry: { team: { id: string } }) {
		return data.leaderboard.findIndex((candidate) => candidate.team.id === entry.team.id) + 1;
	}

	function leaderboard_rank_for(entry: { points: number }) {
		return data.leaderboard.findIndex((candidate) => candidate.points === entry.points) + 1;
	}

	function final_result_rank_for(entry: { team: { id: string } }) {
		return data.leaderboard.findIndex((candidate) => candidate.team.id === entry.team.id) + 1;
	}

	function open_presentation() {
		window.open(
			`${window.location.pathname}?presentation=1`,
			'clover-trivia-presentation',
			'popup=yes,width=1440,height=900'
		);
	}

	async function toggle_fullscreen() {
		if (document.fullscreenElement) await document.exitFullscreen();
		else await document.documentElement.requestFullscreen();
	}

	const host_control_enhance: SubmitFunction = () => {
		return async ({ update }) => {
			// The action response arrives after its database update, so the presentation can safely
			// begin its own refresh while the host console reloads its larger data set.
			presentation_sync_channel?.postMessage('session-updated');
			await update({ reset: false });
		};
	};
	const next_slide_enhance: SubmitFunction = () => {
		is_advancing_slide = true;
		return async ({ update }) => {
			presentation_sync_channel?.postMessage('session-updated');
			await update({ reset: false });
			is_advancing_slide = false;
		};
	};
	const previous_slide_enhance: SubmitFunction = () => {
		is_returning_slide = true;
		return async ({ update }) => {
			presentation_sync_channel?.postMessage('session-updated');
			await update({ reset: false });
			is_returning_slide = false;
		};
	};

	function fit_rules(node: HTMLElement) {
		const update = () => {
			const presentation = node.closest<HTMLElement>('[data-presentation-content]');
			if (!presentation) return;
			// Reserve room for the fixed slide title and a small amount of breathing room.
			const available_height = presentation.clientHeight - 140;
			const natural_height = node.scrollHeight;
			if (!natural_height || available_height <= 0) return;
			rules_scale = Math.min(1, (available_height / natural_height) * 0.98);
			rules_display_height = Math.ceil(natural_height * rules_scale);
		};

		const resize_observer = new ResizeObserver(update);
		resize_observer.observe(node);
		const presentation = node.closest<HTMLElement>('[data-presentation-content]');
		if (presentation) resize_observer.observe(presentation);
		requestAnimationFrame(update);

		return {
			destroy() {
				resize_observer.disconnect();
			}
		};
	}

	function fit_presentation_preview(node: HTMLElement) {
		const update = () => {
			presentation_preview_scale = node.clientWidth / 1440;
			presentation_preview_height = node.clientHeight;
		};
		const resize_observer = new ResizeObserver(update);
		resize_observer.observe(node);
		update();
		return { destroy: () => resize_observer.disconnect() };
	}

	function measure_presentation_height(node: HTMLElement) {
		const update = () => (presentation_height = node.clientHeight);
		const resize_observer = new ResizeObserver(update);
		resize_observer.observe(node);
		update();
		return { destroy: () => resize_observer.disconnect() };
	}

	onMount(() => {
		const channel = new BroadcastChannel(`clover-host-${data.game.id}`);
		presentation_sync_channel = channel;
		channel.onmessage = () => void invalidateAll();
		if (!is_presentation_popout) {
			const event_source = new EventSource(`${window.location.pathname}/stump-events`);
			stump_event_source = event_source;
			event_source.addEventListener('stump-submitted', () => void invalidateAll());
			return () => {
				event_source.close();
				stump_event_source = null;
				channel.close();
				presentation_sync_channel = null;
			};
		}
		const html_overflow = document.documentElement.style.overflow;
		const body_overflow = document.body.style.overflow;
		document.documentElement.style.overflow = 'hidden';
		document.body.style.overflow = 'hidden';
		const update_fullscreen_state = () => {
			is_fullscreen = Boolean(document.fullscreenElement);
		};
		document.addEventListener('fullscreenchange', update_fullscreen_state);
		return () => {
			channel.close();
			presentation_sync_channel = null;
			document.documentElement.style.overflow = html_overflow;
			document.body.style.overflow = body_overflow;
			document.removeEventListener('fullscreenchange', update_fullscreen_state);
		};
	});
</script>

<svelte:head><title>Host {data.game.title} · Clover Trivia</title></svelte:head>

<section
	class={is_presentation_popout
		? 'fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-white text-[#183d32]'
		: 'mx-auto max-w-7xl py-8 text-[#183d32] md:py-10'}
>
	{#if is_presentation_popout && !is_presentation_preview}<button
			type="button"
			onclick={toggle_fullscreen}
			class="absolute top-4 right-4 z-30 inline-flex items-center gap-2 rounded-md bg-[#173f33]/85 px-3 py-2 text-xs font-bold text-white opacity-20 transition hover:opacity-100 focus:opacity-100"
			><Fullscreen size={15} /> {is_fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</button
		>{/if}
	{#if !is_presentation_popout}
		<div
			class="mb-6 flex flex-col gap-4 border-b border-[#e3ebe4] pb-6 sm:flex-row sm:items-end sm:justify-between"
		>
			<div>
				<p class="text-[.7rem] font-extrabold tracking-[.12em] text-[#238061] uppercase">
					Live host console
				</p>
				<h1 class="mt-1 font-[Kanit] text-3xl font-medium tracking-[-.03em] md:text-4xl">
					{data.game.title}
				</h1>
				<p class="mt-1 text-sm text-[#71837a]">
					{data.game.location.name} · {data.game.rounds.length} rounds
				</p>
			</div>
			<div class="flex gap-2">
				{#if !data.session.is_started}<form method="POST" action="?/start">
						<button
							class="inline-flex items-center gap-2 rounded-md bg-[#176249] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_18px_#17624920]"
							><Play size={16} /> Start game</button
						>
					</form>{:else if data.game.status === 'COMPLETED'}<div class="flex items-center gap-2">
						<span
							class="rounded-md border border-[#c8ddce] bg-[#f4faf5] px-4 py-3 text-sm font-bold text-[#246d52]"
							>Game completed</span
						>
						<details class="relative">
							<summary
								class="cursor-pointer list-none rounded-md border border-[#c8ddce] px-4 py-3 text-sm font-bold text-[#246d52] marker:hidden"
								>Recap QR</summary
							>
							<div
								class="absolute top-full right-0 z-30 mt-2 w-72 rounded-xl border border-[#dce7df] bg-white p-4 shadow-xl"
							>
								<img
									src={data.recap_qr_code!}
									alt="Completed game recap QR code"
									class="mx-auto size-48"
								/>
								<p class="mt-3 text-center text-xs font-semibold text-[#527466]">
									Scan to see every question and answer.
								</p>
								<a
									href={data.recap_url}
									target="_blank"
									rel="noreferrer"
									class="mt-2 block truncate text-center text-xs font-bold text-[#176249] underline"
									>Open recap</a
								>
							</div>
						</details>
						<a
							href="/dashboard"
							class="rounded-md border border-[#c8ddce] px-4 py-3 text-sm font-bold text-[#246d52] transition-colors hover:bg-[#f2f8f3]"
							>Back to dashboard</a
						>
					</div>{:else}<div class="flex items-center gap-2">
						<span
							class="rounded-md border border-[#c8ddce] bg-[#f4faf5] px-4 py-3 text-sm font-bold text-[#246d52]"
							>{host_status}</span
						>
						{#if data.can_return_to_scheduled}<Dialog.Root>
								<Dialog.Trigger
									class="rounded-md border border-[#c8ddce] px-4 py-3 text-sm font-bold text-[#246d52] transition-colors hover:bg-[#f2f8f3]"
									>Set as scheduled</Dialog.Trigger
								>
								<Dialog.Portal>
									<Dialog.Overlay class="fixed inset-0 z-50 bg-[#123328]/35 backdrop-blur-sm" />
									<Dialog.Content
										class="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#dce7df] bg-white p-6 shadow-2xl outline-hidden"
									>
										<Dialog.Title class="font-[Kanit] text-2xl font-medium text-[#183d32]"
											>Set game as scheduled?</Dialog.Title
										>
										<Dialog.Description class="mt-2 text-sm leading-6 text-[#6a7f74]"
											>This will stop the active session and return this game to your upcoming
											scheduled games. No scores have been submitted, so no score data will be lost.</Dialog.Description
										>
										<div class="mt-6 flex justify-end gap-2">
											<Dialog.Close
												class="rounded-md border border-[#d6e1d8] px-4 py-2.5 text-sm font-bold text-[#4b685c] hover:bg-[#f5f8f5]"
												>Cancel</Dialog.Close
											>
											<form method="POST" action="?/return_to_scheduled">
												<button
													class="rounded-md bg-[#176249] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#12523d]"
													>Set as scheduled</button
												>
											</form>
										</div>
									</Dialog.Content>
								</Dialog.Portal>
							</Dialog.Root>{/if}
					</div>{/if}
			</div>
		</div>
	{/if}

	<div class={is_presentation_popout ? 'h-full' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]'}>
		{#if !is_presentation_popout}<div
				class="relative aspect-[8/5] overflow-hidden rounded-2xl border border-[#dce7df] bg-white shadow-[0_20px_45px_#163b3212]"
				use:fit_presentation_preview
			>
				<iframe
					title="Presentation preview"
					src={`${page.url.pathname}?presentation=1&preview=1`}
					class="pointer-events-none absolute top-0 left-0 h-[900px] w-[1440px] origin-top-left border-0"
					style={`transform: scale(${presentation_preview_scale})`}
				></iframe>
			</div>{/if}
		<div class={is_presentation_popout ? 'relative h-full overflow-hidden bg-white' : 'hidden'}>
			{#if !is_final_results_recap}<img
				src={data.stump_qr_code}
				alt="Scan to submit a Stump the Host question"
				class="pointer-events-none absolute bottom-6 left-6 z-10 max-h-[4.8rem] max-w-[22%] rounded-md bg-white object-contain p-1 shadow-sm {is_presentation_popout
					? 'bottom-10 left-10 max-h-[9.6rem]'
					: ''}"
			/>{/if}
			{#if data.game.location.logo_url}<img
					src={data.game.location.logo_url}
					alt=""
					class="pointer-events-none absolute right-6 bottom-6 max-h-[4.8rem] max-w-[22%] object-contain opacity-100 {is_presentation_popout
						? 'right-10 bottom-10 max-h-[9.6rem]'
						: ''}"
				/>{/if}
			<div
				data-presentation-content
				use:measure_presentation_height
				class="relative flex h-full min-h-0 flex-col items-center justify-center p-8 text-center {is_final_results_bottom ||
				is_final_results_full ||
				is_final_results_recap
					? 'py-16'
					: 'pt-24'} {is_presentation_popout && !(is_final_results_bottom || is_final_results_full)
					? 'px-8 pt-36 pb-8'
					: ''}"
			>
				<p
					class="absolute top-7 left-1/2 -translate-x-1/2 font-[Kanit] font-medium whitespace-nowrap text-[#2f7559] {is_final_results_bottom ||
					is_final_results_full
						? 'text-sm tracking-[.16em]'
						: is_presentation_popout
							? 'text-4xl tracking-[-.02em] md:text-6xl'
							: 'text-2xl tracking-[-.02em] md:text-3xl'}"
				>
					{presentation_label}
				</p>
				{#key `${data.session.phase}-${data.session.current_round_order}-${data.session.current_question_order}`}<div
						class="clover-presentation-slide flex w-full flex-col items-center"
					>
				{#if is_final_results_recap && data.recap_qr_code}<div class="flex flex-col items-center">
						<p class="mb-5 font-[Kanit] text-2xl font-medium text-[#174735] {is_presentation_popout ? 'text-4xl' : ''}">
							Scan for tonight’s questions and answers
						</p>
						<img
							src={data.recap_qr_code}
							alt="Completed game recap QR code"
							class="size-52 rounded-xl border border-[#dce7df] bg-white p-3 shadow-sm {is_presentation_popout ? 'size-80' : ''}"
						/>
					</div>
				{:else if data.session.phase === 'RULES'}<div
						class="w-full {is_presentation_popout ? 'max-w-[60vw]' : 'max-w-2xl overflow-hidden'}"
						style:height={rules_display_height ? `${rules_display_height}px` : undefined}
					>
						<div
							use:fit_rules
							style:transform={`scale(${rules_scale})`}
							style:transform-origin="top center"
							class="flow-root w-full pb-5 text-left text-base leading-7 text-[#315c4d] [&_h1]:mb-4 [&_h1]:font-[Kanit] [&_h1]:font-medium [&_h2]:mb-3 [&_h2]:font-[Kanit] [&_h2]:font-medium [&_h3]:mb-2 [&_h3]:font-bold [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 {is_presentation_popout
								? 'max-w-none text-[clamp(1.15rem,1.8vw,2rem)] leading-[1.45] [&_h1]:text-[clamp(2.5rem,4vw,5rem)] [&_h2]:text-[clamp(2rem,3vw,3.5rem)] [&_h3]:text-[clamp(1.45rem,2vw,2.25rem)]'
								: 'max-w-2xl [&_h1]:text-4xl [&_h2]:text-3xl [&_h3]:text-xl'}"
						>
							{@html data.game.location.location_rule?.rules_markdown ??
								'<p>Welcome to trivia night! The host will begin shortly.</p>'}
						</div>
					</div>
				{:else if data.session.phase === 'ROUND_INTRO'}<h2
						class="font-[Kanit] text-5xl font-medium tracking-[-.04em] text-[#174735]"
					>
						{data.current_round?.name}
					</h2>
					<p class="mt-3 text-[#6d8478]">Get your wagers ready.</p>
				{:else if data.session.phase === 'CATEGORIES'}<div
						class="flex w-full max-w-4xl flex-col items-center justify-center gap-3 {is_presentation_popout
							? 'gap-5'
							: ''}"
					>
						{#each data.current_categories as category}<span
								class="font-[Kanit] font-medium tracking-[-.02em] text-[#287056] uppercase {is_presentation_popout
									? 'py-2 text-4xl md:text-6xl'
									: 'text-2xl md:text-3xl'}">{category}</span
							>{/each}
					</div>
				{:else if data.session.phase === 'QUESTION' && data.current_question}<h2
						class="font-[Kanit] leading-[1.08] font-medium tracking-[-.04em] text-[#174735] {current_question_text_size}"
					>
						{data.current_question.question_text}
					</h2>
					{#if data.current_question.image_url}<img
							src={data.current_question.image_url}
							alt="Question visual"
							class="mt-7 max-h-52 max-w-full rounded-xl object-contain shadow-sm"
						/>{/if}
				{:else if data.session.phase === 'LEADERBOARD'}<Trophy
						class="mt-5 text-[#bd8a27]"
						size={46}
					/>
					<h2 class="mt-4 font-[Kanit] text-4xl font-medium text-[#174735]">Check the standings</h2>
					<p class="mt-3 text-[#6d8478]">The next round is ready when you are.</p>
				{:else if is_final_results_bottom || is_final_results_full}<div class="w-full max-w-5xl">
						{#if is_final_results_bottom && final_results_bottom_up.length === 0}<p
								class="text-lg font-semibold text-[#6d8478]"
							>
								Every team finished in the top five.
							</p>
						{:else}<div class="mx-auto flex max-w-2xl flex-col gap-1">
								{#each is_final_results_full ? leaderboard_bottom_up : final_results_bottom_up as entry}
									{@const rank = final_result_rank_for(entry)}
									<div
										class="flex min-w-0 items-center rounded-md border border-[#e1e9e3] bg-white text-left shadow-sm {presentation_leaderboard_row_spacing} {rank <=
										3
											? 'border-[#e4d5ad]'
											: ''}"
									>
										{#if rank <= 3}<Trophy
												size={is_presentation_popout ? 18 : 16}
												class={rank === 1
													? 'text-[#bd8a27]'
													: rank === 2
														? 'text-[#9aa6af]'
														: 'text-[#b87333]'}
											/>{:else}<span
												class="grid shrink-0 place-items-center rounded-full bg-[#edf5ef] font-extrabold text-[#286d54] {presentation_leaderboard_rank_size}"
												>{rank}</span
											>{/if}
										<span
											class="min-w-0 flex-1 truncate font-[Kanit] leading-tight font-medium text-[#174735] {presentation_leaderboard_text_size} {is_presentation_popout &&
											presentation_leaderboard_density === 'normal'
												? 'text-[1.05rem]'
												: ''}">{entry.team.name}</span
										><strong
											class="font-[Kanit] leading-tight font-medium text-[#1e624b] {presentation_leaderboard_points_size} {is_presentation_popout &&
											presentation_leaderboard_density === 'normal'
												? 'text-3xl'
												: ''}">{entry.points}</strong
										>
									</div>
								{/each}
							</div>{/if}
					</div>
				{:else if data.has_podium_tie && !data.has_completed_tiebreaker && data.game.rounds.some((round) => round.round_type === 'TIEBREAKER')}<Trophy
						class="mt-5 text-[#bd8a27]"
						size={46}
					/>
					<h2 class="mt-4 font-[Kanit] text-4xl font-medium text-[#174735]">We have a tie!</h2>
					<p class="mt-3 text-[#6d8478]">Final standings are being resolved.</p>
				{:else}<Trophy class="mt-5 text-[#bd8a27]" size={46} />
					<h2 class="mt-4 font-[Kanit] text-4xl font-medium text-[#174735]">That’s the game!</h2>
					<p class="mt-3 text-[#6d8478]">Thanks for playing!</p>{/if}</div
				>{/key}
			</div>
			{#if data.session.is_leaderboard_visible}<div
					class:clover-presentation-slide={data.session.is_leaderboard_visible}
				class="absolute inset-0 z-20 grid place-items-center bg-[#f7fbf8]/95 p-5 backdrop-blur-sm"
				>
					<div class="flex max-h-full w-full max-w-2xl flex-col">
						<div class="mb-3 flex shrink-0 items-center justify-center gap-2 text-[#176249]">
							<Trophy size={is_presentation_popout ? 22 : 18} />
							<h2
								class="font-[Kanit] font-medium {presentation_leaderboard_density === 'tight'
									? 'text-xl'
									: is_presentation_popout
										? 'text-2xl'
										: 'text-xl'}"
							>
								Live leaderboard
							</h2>
						</div>
						<div
							class="mx-auto flex w-full max-w-xl flex-1 [scrollbar-width:thin] [scrollbar-color:#8fac99_transparent] flex-col gap-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#8fac99]"
						>
							{#each leaderboard_bottom_up as entry}<div
									class="flex min-w-0 items-center rounded-md border border-[#e1e9e3] bg-white shadow-sm {presentation_leaderboard_row_spacing}"
								>
									<span
										class="w-3 shrink-0 text-right text-[.65rem] font-medium text-[#9aa9a0] {presentation_leaderboard_density ===
										'tight'
											? 'text-[.55rem]'
											: ''}">{leaderboard_position_for(entry)}</span
									>
									<span
										class="grid shrink-0 place-items-center rounded-full bg-[#edf5ef] font-extrabold text-[#286d54] {presentation_leaderboard_rank_size}"
										>{leaderboard_rank_for(entry)}</span
									>
									<span
										class="min-w-0 flex-1 truncate font-[Kanit] leading-tight font-medium text-[#174735] {presentation_leaderboard_text_size} {is_presentation_popout &&
										presentation_leaderboard_density === 'normal'
											? 'text-[1.05rem]'
											: ''}">{entry.team.name}</span
									>
									<strong
										class="font-[Kanit] leading-tight font-medium text-[#1e624b] {presentation_leaderboard_points_size} {is_presentation_popout &&
										presentation_leaderboard_density === 'normal'
											? 'text-3xl'
											: ''}">{entry.points}</strong
									>
								</div>{/each}
						</div>
					</div>
				</div>{/if}
			{#if data.session.is_stump_the_host_visible && data.active_stump_submission}<div
					class:clover-presentation-slide={data.session.is_stump_the_host_visible}
				class="absolute inset-0 z-20 grid place-items-center bg-[#f7fbf8]/95 p-8 text-center backdrop-blur-sm"
				>
					<div class="max-w-5xl">
						<p class="text-sm font-extrabold tracking-[.16em] text-[#238061] uppercase">
							Stump the host
						</p>
						<h2
							class="mt-5 font-[Kanit] leading-[1.08] font-medium tracking-[-.04em] text-[#174735] {stump_question_text_size}"
						>
							{data.active_stump_submission.question_text}
						</h2>
						{#if data.session.is_stump_answer_revealed}<div
								class="mx-auto mt-8 max-w-3xl rounded-xl border border-[#bfdbc7] bg-white/85 px-6 py-4"
							>
								<p class="text-xs font-extrabold tracking-[.14em] text-[#238061] uppercase">
									Answer
								</p>
								<p class="mt-2 font-[Kanit] text-2xl font-medium text-[#174735] md:text-4xl">
									{data.active_stump_submission.answer_text}
								</p>
							</div>{/if}
						<p class="mt-7 text-lg font-semibold text-[#527466]">
							Submitted by {data.active_stump_submission.submitted_by_team_name}
						</p>
					</div>
				</div>{/if}
		</div>

		{#if !is_presentation_popout}<HostLeaderboard
				leaderboard={data.leaderboard}
				max_height={presentation_preview_height}
			/>{/if}
	</div>

	{#if !is_presentation_popout && data.session.is_started && data.game.status !== 'COMPLETED'}<div
			class="mt-4 flex flex-wrap items-center justify-between gap-3 lg:flex-nowrap"
		>
			<div class="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onclick={open_presentation}
					class="inline-flex items-center gap-2 rounded-md border border-[#c8ddce] px-4 py-3 text-sm font-bold text-[#246d52]"
					><ExternalLink size={16} /> Presentation</button
				>
				{#if data.current_question}<Dialog.Root>
						<Dialog.Trigger
							class="rounded-md border border-[#c8ddce] px-4 py-3 text-sm font-bold text-[#246d52] hover:bg-[#f2f8f3]"
							>Answer & notes</Dialog.Trigger
						>
						<Dialog.Portal>
							<Dialog.Overlay class="fixed inset-0 z-50 bg-[#123328]/35 backdrop-blur-sm" />
							<Dialog.Content
								class="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#dce7df] bg-white p-6 shadow-2xl outline-hidden"
							>
								<DialogCloseButton />
								<Dialog.Title class="font-[Kanit] text-2xl font-medium text-[#183d32]"
									>Question details</Dialog.Title
								>
								<Dialog.Description class="mt-1 text-sm text-[#71837a]"
									>{data.current_question.question_text}</Dialog.Description
								>
								<div class="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
									<p class="text-xs font-extrabold tracking-[.1em] text-emerald-700 uppercase">
										Answer
									</p>
									<p
										class="mt-2 font-[Kanit] text-xl font-medium whitespace-pre-wrap text-[#174735]"
									>
										{data.current_question.correct_answer_text}
									</p>
								</div>
								<div class="mt-3 rounded-xl border border-[#e1e9e3] bg-[#f8fbf8] p-4">
									<p class="text-xs font-extrabold tracking-[.1em] text-[#527466] uppercase">
										Host notes
									</p>
									<p class="mt-2 text-sm leading-6 whitespace-pre-wrap text-[#315c4d]">
										{data.current_question.notes || 'No host notes for this question.'}
									</p>
								</div>
							</Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>{/if}
				<form use:enhance={host_control_enhance} method="POST" action="?/toggle_leaderboard">
					<button
						class="rounded-md border border-[#c8ddce] px-4 py-3 text-sm font-bold text-[#246d52]"
						>{data.session.is_leaderboard_visible ? 'Hide leaderboard' : 'Show leaderboard'}</button
					>
				</form>
				<form use:enhance={host_control_enhance} method="POST" action="?/spin_stump_the_host">
					<button
						disabled={data.stump_submission_count === 0}
						class="inline-flex items-center gap-2 rounded-md border border-[#c8ddce] px-4 py-3 text-sm font-bold text-[#246d52] disabled:cursor-not-allowed disabled:opacity-40"
						><CircleQuestionMark size={16} /> Draw stump ({data.stump_submission_count} left)</button
					>
				</form>
				{#if data.session.is_stump_the_host_visible && !data.session.is_stump_answer_revealed}<form
						use:enhance={host_control_enhance}
						method="POST"
						action="?/reveal_stump_answer"
					>
						<button class="rounded-md bg-[#bd8a27] px-4 py-3 text-sm font-bold text-white"
							>Reveal answer</button
						>
					</form>{:else if data.session.is_stump_the_host_visible && data.active_stump_submission}<Dialog.Root
					>
						<Dialog.Trigger
							class="rounded-md border border-[#c8ddce] px-4 py-3 text-sm font-bold text-[#246d52] hover:bg-[#f2f8f3]"
							>View stump answer</Dialog.Trigger
						>
						<Dialog.Portal>
							<Dialog.Overlay class="fixed inset-0 z-50 bg-[#123328]/35 backdrop-blur-sm" />
							<Dialog.Content
								class="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#dce7df] bg-white p-6 shadow-2xl outline-hidden"
							>
								<DialogCloseButton />
								<Dialog.Title class="font-[Kanit] text-2xl font-medium text-[#183d32]"
									>Stump the Host answer</Dialog.Title
								>
								<Dialog.Description class="mt-1 text-sm text-[#71837a]"
									>{data.active_stump_submission.question_text}</Dialog.Description
								>
								<div class="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-5">
									<p class="text-xs font-extrabold tracking-[.1em] text-emerald-700 uppercase">
										Answer
									</p>
									<p class="mt-2 font-[Kanit] text-2xl font-medium text-[#174735]">
										{data.active_stump_submission.answer_text}
									</p>
								</div>
							</Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>{/if}
				{#if data.session.is_stump_the_host_visible}<form
						use:enhance={host_control_enhance}
						method="POST"
						action="?/close_stump_the_host"
					>
						<button
							class="rounded-md border border-[#c8ddce] px-4 py-3 text-sm font-bold text-[#246d52]"
							>Close stump</button
						>
					</form>{/if}
			</div>
			<div class="ml-auto flex shrink-0 items-center gap-2">
				<form use:enhance={previous_slide_enhance} method="POST" action="?/previous">
					<button
						disabled={data.session.phase === 'RULES' || is_returning_slide}
						class="rounded-md border border-[#c8ddce] px-4 py-3 text-sm font-bold text-[#246d52] disabled:cursor-not-allowed disabled:opacity-40"
						>{is_returning_slide ? 'Loading…' : 'Previous'}</button
					>
				</form>
				{#if data.session.phase === 'COMPLETE' && (!data.has_podium_tie || data.has_completed_tiebreaker)}<form
						use:enhance={host_control_enhance}
						method="POST"
						action="?/show_final_results"
					>
						<button
							class="inline-flex items-center gap-2 rounded-md bg-[#176249] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_18px_#17624920]"
							>Show final standings <Trophy size={17} /></button
						>
					</form>
				{:else if is_final_results_full}<form
						use:enhance={host_control_enhance}
						method="POST"
						action="?/complete"
					>
						<button
							class="inline-flex items-center gap-2 rounded-md bg-[#176249] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_18px_#17624920]"
							>Complete game <Trophy size={17} /></button
						>
					</form>
				{:else if !is_showing_final_results}<form use:enhance={next_slide_enhance} method="POST" action="?/next">
						<button
							disabled={is_advancing_slide}
							class="inline-flex items-center gap-2 rounded-md bg-[#176249] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_18px_#17624920]"
							>{is_advancing_slide ? 'Loading…' : 'Next slide'} <ChevronRight size={17} /></button
						>
					</form>{/if}
			</div>
		</div>{/if}

	{#if !is_presentation_popout && data.session.is_started && data.session.phase === 'COMPLETE' && data.has_podium_tie && !data.has_completed_tiebreaker && data.game.rounds.some((round) => round.round_type === 'TIEBREAKER')}<div
			class="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-300 bg-white px-5 py-4"
		>
			<div>
				<p class="text-xs font-extrabold tracking-[.1em] text-rose-700 uppercase">
					Tiebreaker needed
				</p>
				<p class="mt-1 font-semibold text-[#613232]">
					{data.tiebreaker_team_count}
					{data.tiebreaker_team_count === 1 ? ' team is' : ' teams are'} tied for a podium spot.
				</p>
			</div>
			<form use:enhance={host_control_enhance} method="POST" action="?/start_tiebreaker">
				<button class="rounded-md bg-[#176249] px-4 py-3 text-sm font-bold text-white"
					>Start tiebreaker</button
				>
			</form>
		</div>{/if}

	{#if !is_presentation_popout && is_showing_final_results}<div
			class="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#dce7df] bg-white px-5 py-4"
		>
			<div>
				<p class="text-xs font-extrabold tracking-[.1em] text-[#238061] uppercase">Final results</p>
				<p class="mt-1 font-semibold text-[#315c4d]">
					{is_final_results_recap
						? 'Showing the recap QR code.'
						: is_final_results_full
							? 'Showing the complete leaderboard.'
							: 'Showing 6th place through last.'}
				</p>
			</div>
			<form use:enhance={host_control_enhance} method="POST" action="?/toggle_final_results">
				<input
					type="hidden"
					name="view"
					value={is_final_results_recap ? 'FULL' : is_final_results_full ? 'RECAP' : 'FULL'}
				/>
				<button class="rounded-md bg-[#176249] px-4 py-3 text-sm font-bold text-white"
					>{is_final_results_recap
						? 'Back to final standings'
						: is_final_results_full
							? 'Show recap QR'
							: 'Show full leaderboard'}</button
				>
			</form>
		</div>{/if}

	{#if !is_presentation_popout}<HostScorecards {data} />{/if}
</section>
