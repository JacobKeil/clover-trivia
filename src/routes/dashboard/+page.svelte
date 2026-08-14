<script lang="ts">
	import { GameCard, LocationCard } from '$lib/components';
	import { CalendarDays, ClipboardPenLine, MapPin, LogOut, Plus, Sparkles } from '@lucide/svelte';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();

	let first_name = $derived(data.user.name?.split(' ')[0] || 'Host');
</script>

<svelte:head><title>Dashboard · Clover Trivia</title></svelte:head>

<section class="mx-auto max-w-7xl py-10 text-[#183d32] md:py-14">
	<div
		class="flex flex-col gap-6 border-b border-[#e3ebe4] pb-8 sm:flex-row sm:items-end sm:justify-between"
	>
		<div>
			<div
				class="inline-flex items-center gap-2 text-[.7rem] font-extrabold tracking-[.12em] text-[#238061] uppercase"
			>
				<Sparkles size={14} /> Host dashboard
			</div>
			<h1
				class="mt-2 font-[Kanit] text-4xl font-medium tracking-[-.035em] text-[#163e32] md:text-5xl"
			>
				Welcome back, {first_name}.
			</h1>
			<p class="mt-2 text-[.96rem] text-[#6a7f74]">Your next great game night starts here.</p>
		</div>
		<a
			href="/games/create"
			class="inline-flex w-fit items-center gap-2 rounded-md bg-[#176249] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_18px_#17624920] transition hover:bg-[#10523d]"
			><Plus size={17} /> Create a game</a
		>
	</div>

	<div class="mt-8 grid gap-3 sm:grid-cols-3">
		<div class="rounded-xl border border-[#e1eae2] bg-[#f8fbf8] p-4">
			<span class="text-[.62rem] font-extrabold tracking-[.11em] text-[#71897d]"
				>DRAFTS TO FINISH</span
			><strong class="mt-1 block font-[Kanit] text-3xl font-medium text-[#2673a5]"
				>{data.drafts.length}</strong
			>
		</div>
		<div class="rounded-xl border border-[#e1eae2] bg-[#f8fbf8] p-4">
			<span class="text-[.62rem] font-extrabold tracking-[.11em] text-[#71897d]"
				>UPCOMING GAMES</span
			><strong class="mt-1 block font-[Kanit] text-3xl font-medium text-[#197054]"
				>{data.upcoming_games.length}</strong
			>
		</div>
		<div class="rounded-xl border border-[#e1eae2] bg-[#f8fbf8] p-4">
			<span class="text-[.62rem] font-extrabold tracking-[.11em] text-[#71897d]"
				>ACTIVE LOCATIONS</span
			><strong class="mt-1 block font-[Kanit] text-3xl font-medium text-[#315f50]"
				>{data.locations.filter((location) => location.is_active).length}</strong
			>
		</div>
	</div>

	<section class="mt-12">
		<div class="flex items-end justify-between gap-4">
			<div>
				<p class="text-[.7rem] font-extrabold tracking-[.12em] text-[#2875a7] uppercase">
					Keep building
				</p>
				<h2 class="mt-1 font-[Kanit] text-3xl font-medium tracking-[-.03em]">Draft games</h2>
			</div>
			<a
				href="/games/create"
				class="hidden items-center gap-1 text-sm font-bold text-[#27735a] sm:flex"
				>New draft <Plus size={16} /></a
			>
		</div>
		{#if data.drafts.length > 0}
			<div class="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3">
				{#each data.drafts as game (game.id)}
					<GameCard {game} variant="draft" locations={data.locations} />
				{/each}
			</div>
		{:else}
			<div class="mt-5 rounded-xl border border-dashed border-[#ceddd1] bg-[#fbfdfb] p-6">
				<div class="flex items-center gap-3">
					<span class="grid size-10 place-items-center rounded-lg bg-sky-50 text-sky-700"
						><ClipboardPenLine size={20} /></span
					>
					<div>
						<h3 class="font-semibold">Nothing waiting in the wings.</h3>
						<p class="mt-0.5 text-sm text-[#71837a]">
							Start a game now and save it as a draft until it is ready.
						</p>
					</div>
				</div>
			</div>
		{/if}
	</section>

	<section class="mt-12">
		<div class="flex items-end justify-between gap-4">
			<div>
				<p class="text-[.7rem] font-extrabold tracking-[.12em] text-[#238061] uppercase">
					On the calendar
				</p>
				<h2 class="mt-1 font-[Kanit] text-3xl font-medium tracking-[-.03em]">Upcoming games</h2>
			</div>
			<a
				href="/games/create"
				class="inline-flex items-center gap-1 text-sm font-bold text-[#27735a]"
				>Schedule a game <Plus size={16} /></a
			>
		</div>
		{#if data.upcoming_games.length > 0}
			<div class="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3">
				{#each data.upcoming_games as game (game.id)}
					<GameCard {game} variant="upcoming" locations={data.locations} />
				{/each}
			</div>{:else}<div
				class="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-[#ceddd1] bg-[#fbfdfb] p-6"
			>
				<span class="grid size-10 place-items-center rounded-lg bg-[#e6f3e9] text-[#267356]"
					><CalendarDays size={20} /></span
				>
				<div>
					<h3 class="font-semibold">Your calendar is clear.</h3>
					<p class="mt-0.5 text-sm text-[#71837a]">
						Schedule a game when you are ready to make it official.
					</p>
				</div>
			</div>{/if}
	</section>

	<section class="mt-12">
		<div class="flex items-end justify-between gap-4">
			<div>
				<p class="text-[.7rem] font-extrabold tracking-[.12em] text-[#667d73] uppercase">
					Already played
				</p>
				<h2 class="mt-1 font-[Kanit] text-3xl font-medium tracking-[-.03em]">Recent games</h2>
			</div>
		</div>
		{#if data.recent_games.length > 0}<div
				class="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3"
			>
				{#each data.recent_games.slice(0, 3) as game (game.id)}<GameCard
						{game}
						variant="recent"
					/>{/each}
			</div>{:else}<div
				class="mt-5 rounded-xl border border-dashed border-[#d6ded8] bg-[#fbfdfb] p-6 text-sm text-[#71837a]"
			>
				Completed games will show up here, ready for you to look back on.
			</div>{/if}
	</section>

	<section class="mt-12 border-t border-[#e3ebe4] pt-10">
		<div class="flex items-end justify-between gap-4">
			<div>
				<p class="text-[.7rem] font-extrabold tracking-[.12em] text-[#238061] uppercase">
					Your venues
				</p>
				<h2 class="mt-1 font-[Kanit] text-3xl font-medium tracking-[-.03em]">Locations</h2>
			</div>
			<a
				href="/locations/create"
				class="inline-flex items-center gap-1 text-sm font-bold text-[#27735a]"
				>Add location <Plus size={16} /></a
			>
		</div>
		{#if data.locations.length > 0}<div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.locations as location (location.id)}<LocationCard {location} />{/each}
			</div>{:else}<div
				class="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-[#ceddd1] bg-[#fbfdfb] p-6"
			>
				<span class="grid size-10 place-items-center rounded-lg bg-[#e6f3e9] text-[#267356]"
					><MapPin size={20} /></span
				>
				<div>
					<h3 class="font-semibold">Add your first location.</h3>
					<p class="mt-0.5 text-sm text-[#71837a]">
						Locations keep your games, teams, and history organized.
					</p>
				</div>
			</div>
		{/if}
	</section>

	<form action="?/sign_out" method="POST" class="mt-12 border-t border-[#e3ebe4] pt-6">
		<button
			class="inline-flex items-center gap-2 rounded-md border border-[#ecdeda] bg-[#fffaf8] px-3 py-2 text-xs font-bold text-[#8a655f] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
			type="submit"><LogOut size={14} /> Sign out</button
		>
	</form>
</section>
