<script lang="ts">
	import { CalendarDays, ChevronLeft, ChevronRight, Trophy } from '@lucide/svelte';
	import { format } from 'date-fns';

	let { data } = $props();
	let has_previous = $derived(data.page > 1);
	let has_next = $derived(data.page < data.total_pages);
</script>

<svelte:head><title>{data.location.name} Game History · Clover Trivia</title></svelte:head>

<section class="mx-auto max-w-5xl py-10 text-[#183d32] md:py-14">
	<header class="overflow-hidden rounded-2xl border border-[#dce7df] bg-[#f5faf5] shadow-sm">
		{#if data.location.picture_url}
			<img src={data.location.picture_url} alt="" class="h-40 w-full object-cover" />
		{/if}
		<div class="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
			{#if data.location.logo_url}<img
					src={data.location.logo_url}
					alt=""
					class="size-18 shrink-0 rounded-xl bg-white object-contain p-2 shadow-sm"
				/>{/if}
			<div>
				<p class="text-xs font-extrabold tracking-[.14em] text-[#238061] uppercase">
					Trivia history
				</p>
				<h1 class="mt-1 font-[Kanit] text-4xl font-medium tracking-[-.04em] md:text-5xl">
					{data.location.name}
				</h1>
				<p class="mt-2 text-[#5e756a]">{data.location.address}</p>
			</div>
		</div>
	</header>

	<div class="mt-9 flex items-end justify-between gap-4">
		<div>
			<h2 class="font-[Kanit] text-3xl font-medium">Completed games</h2>
			<p class="mt-1 text-sm text-[#71837a]">
				{data.total}
				{data.total === 1 ? 'game' : 'games'} played here.
			</p>
		</div>
		<Trophy size={24} class="text-[#bd8a27]" />
	</div>

	{#if data.games.length}
		<div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.games as game (game.id)}
				<a
					href="/recap/{game.id}"
					class="group rounded-xl border border-[#dce7df] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a9cdb3] hover:shadow-md"
				>
					<p
						class="flex items-center gap-2 text-xs font-extrabold tracking-[.1em] text-[#71837a] uppercase"
					>
						<CalendarDays size={14} />
						{format(new Date(game.scheduled_at), 'MMM d, yyyy')}
					</p>
					<h3
						class="mt-3 font-[Kanit] text-2xl font-medium text-[#1b4035] group-hover:text-[#176249]"
					>
						{game.title}
					</h3>
					<p class="mt-3 text-sm font-bold text-[#267356]">View recap →</p>
				</a>
			{/each}
		</div>
	{:else}
		<div
			class="mt-5 rounded-xl border border-dashed border-[#ceddd1] bg-[#fbfdfb] p-7 text-center text-[#71837a]"
		>
			Completed games will appear here after their recaps are published.
		</div>
	{/if}

	{#if data.total_pages > 1}
		<nav class="mt-8 flex items-center justify-center gap-3" aria-label="Game history pages">
			{#if has_previous}<a
					href="?page={data.page - 1}"
					class="inline-flex items-center gap-1 rounded-md border border-[#cbdcd0] bg-white px-3 py-2 text-sm font-bold text-[#315f50] hover:bg-[#edf5ef]"
					><ChevronLeft size={16} /> Previous</a
				>{/if}
			<span class="text-sm font-semibold text-[#5e756a]"
				>Page {data.page} of {data.total_pages}</span
			>
			{#if has_next}<a
					href="?page={data.page + 1}"
					class="inline-flex items-center gap-1 rounded-md border border-[#cbdcd0] bg-white px-3 py-2 text-sm font-bold text-[#315f50] hover:bg-[#edf5ef]"
					>Next <ChevronRight size={16} /></a
				>{/if}
		</nav>
	{/if}
</section>
