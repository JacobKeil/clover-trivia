<script lang="ts">
	import {
		CalendarDays,
		ChevronLeft,
		ChevronRight,
		FilePenLine,
		MonitorPlay,
		Plus,
		Trophy
	} from '@lucide/svelte';
	import { format } from 'date-fns';

	let { data } = $props();
	let has_previous = $derived(data.page > 1);
	let has_next = $derived(data.page < data.total_pages);
	let status_style = (status: string) =>
		({
			DRAFT: 'bg-sky-50 text-sky-800',
			SCHEDULED: 'bg-emerald-50 text-emerald-700',
			IN_PROGRESS: 'bg-blue-50 text-blue-700',
			COMPLETED: 'bg-slate-100 text-slate-600'
		})[status] ?? 'bg-slate-100 text-slate-600';
</script>

<svelte:head><title>All Games · Clover Trivia</title></svelte:head>

<section class="mx-auto max-w-6xl py-10 text-[#183d32] md:py-14">
	<div
		class="flex flex-col gap-5 border-b border-[#e3ebe4] pb-7 sm:flex-row sm:items-end sm:justify-between"
	>
		<div>
			<p class="text-xs font-extrabold tracking-[.14em] text-[#238061] uppercase">Host library</p>
			<h1 class="mt-1 font-[Kanit] text-4xl font-medium tracking-[-.04em] md:text-5xl">
				All games
			</h1>
			<p class="mt-2 text-[#6a7f74]">
				Every draft, scheduled game, live game, and completed recap in one place.
			</p>
		</div>
		<a
			href="/games/create"
			class="inline-flex w-fit items-center gap-2 rounded-md bg-[#176249] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#10523d]"
			><Plus size={17} /> Create a game</a
		>
	</div>

	{#if data.games.length}<div class="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.games as game (game.id)}<article
					class="rounded-xl border border-[#dce7df] bg-white p-5 shadow-sm"
				>
					<div class="flex items-start justify-between gap-3">
						<span
							class="rounded-full px-2.5 py-1 text-[.65rem] font-extrabold tracking-[.1em] {status_style(
								game.status
							)}">{game.status.replace('_', ' ')}</span
						><span class="text-xs text-[#71837a]"
							>{format(new Date(game.scheduled_at), 'MMM d, yyyy')}</span
						>
					</div>
					<h2 class="mt-4 font-[Kanit] text-2xl font-medium text-[#1b4035]">{game.title}</h2>
					<p class="mt-1 flex items-center gap-1.5 text-sm text-[#5e756a]">
						<CalendarDays size={14} />
						{game.location_name}
					</p>
					<div class="mt-5 flex flex-wrap gap-2">
						{#if game.status === 'COMPLETED'}<a
								href="/recap/{game.id}"
								class="inline-flex items-center gap-1 rounded-md bg-[#eff4f0] px-3 py-2 text-sm font-bold text-[#246d52] hover:bg-[#e1ede4]"
								><Trophy size={15} /> Recap</a
							>{:else}<a
								href="/games/update/{game.id}"
								class="inline-flex items-center gap-1 rounded-md bg-[#eff4f0] px-3 py-2 text-sm font-bold text-[#246d52] hover:bg-[#e1ede4]"
								><FilePenLine size={15} /> Edit</a
							>{/if}{#if game.status === 'SCHEDULED' || game.status === 'IN_PROGRESS'}<a
								href="/host/{game.location_id}/{game.id}"
								class="inline-flex items-center gap-1 rounded-md bg-[#176249] px-3 py-2 text-sm font-bold text-white hover:bg-[#10523d]"
								><MonitorPlay size={15} /> Host</a
							>{/if}
					</div>
				</article>{/each}
		</div>{:else}<div
			class="mt-7 rounded-xl border border-dashed border-[#ceddd1] bg-[#fbfdfb] p-7 text-center text-[#71837a]"
		>
			No games yet. Create your first game to begin building your library.
		</div>{/if}

	{#if data.total_pages > 1}<nav
			class="mt-8 flex items-center justify-center gap-3"
			aria-label="Games pages"
		>
			{#if has_previous}<a
					href="?page={data.page - 1}"
					class="inline-flex items-center gap-1 rounded-md border border-[#cbdcd0] bg-white px-3 py-2 text-sm font-bold text-[#315f50] hover:bg-[#edf5ef]"
					><ChevronLeft size={16} /> Previous</a
				>{/if}<span class="text-sm font-semibold text-[#5e756a]"
				>Page {data.page} of {data.total_pages}</span
			>{#if has_next}<a
					href="?page={data.page + 1}"
					class="inline-flex items-center gap-1 rounded-md border border-[#cbdcd0] bg-white px-3 py-2 text-sm font-bold text-[#315f50] hover:bg-[#edf5ef]"
					>Next <ChevronRight size={16} /></a
				>{/if}
		</nav>{/if}
</section>
