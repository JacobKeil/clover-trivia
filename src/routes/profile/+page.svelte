<script lang="ts">
	import { CalendarDays, LayoutDashboard, LogOut, MapPin, UsersRound } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let initial = $derived(data.user.name?.trim().charAt(0).toUpperCase() || 'H');
	let joined_date = $derived(
		data.user.createdAt
			? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
					new Date(data.user.createdAt)
				)
			: null
	);
</script>

<svelte:head>
	<title>Profile · Clover Trivia</title>
	<meta name="description" content="Manage your Clover Trivia account." />
</svelte:head>

<section class="mx-auto max-w-4xl py-10 text-[#183d32] md:py-14">
	<div class="border-b border-[#e3ebe4] pb-8">
		<p class="text-[.7rem] font-extrabold tracking-[.12em] text-[#238061] uppercase">
			Your account
		</p>
		<h1 class="mt-2 font-[Kanit] text-4xl font-medium tracking-[-.035em] md:text-5xl">Profile</h1>
		<p class="mt-2 text-[.96rem] text-[#6a7f74]">Your Clover Trivia host account and activity.</p>
	</div>

	<div class="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
		<div class="rounded-2xl border border-[#dce7df] bg-white p-6 shadow-sm">
			<div class="flex items-center gap-4">
				{#if data.user.image}
					<img
						src={data.user.image}
						alt="{data.user.name}'s profile"
						referrerpolicy="no-referrer"
						class="size-16 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-[#d9e5dc]"
					/>
				{:else}
					<span
						class="grid size-16 place-items-center rounded-full bg-[#e6f3e9] font-[Kanit] text-2xl font-medium text-[#176249]"
						>{initial}</span
					>
				{/if}
				<div class="min-w-0">
					<h2 class="truncate font-[Kanit] text-2xl font-medium text-[#173e32]">
						{data.user.name}
					</h2>
					<p class="truncate text-sm text-[#6a7f74]">{data.user.email}</p>
					{#if joined_date}<p class="mt-1 text-xs font-medium text-[#82938a]">
							Member since {joined_date}
						</p>{/if}
				</div>
			</div>

			<div class="mt-7 grid gap-3 sm:grid-cols-3">
				<div class="rounded-xl bg-[#f8fbf8] p-4">
					<MapPin size={17} class="text-[#176249]" />
					<strong class="mt-2 block font-[Kanit] text-2xl font-medium"
						>{data.stats.locations}</strong
					>
					<span class="text-xs font-semibold text-[#71897d]">Locations</span>
				</div>
				<div class="rounded-xl bg-[#f8fbf8] p-4">
					<CalendarDays size={17} class="text-[#176249]" />
					<strong class="mt-2 block font-[Kanit] text-2xl font-medium">{data.stats.games}</strong>
					<span class="text-xs font-semibold text-[#71897d]">Games created</span>
				</div>
				<div class="rounded-xl bg-[#f8fbf8] p-4">
					<UsersRound size={17} class="text-[#176249]" />
					<strong class="mt-2 block font-[Kanit] text-2xl font-medium">{data.stats.teams}</strong>
					<span class="text-xs font-semibold text-[#71897d]">Saved teams</span>
				</div>
			</div>
		</div>

		<aside class="rounded-2xl border border-[#dce7df] bg-white p-4 shadow-sm">
			<a
				href="/dashboard"
				class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#315c4d] transition hover:bg-[#f2f8f3] hover:text-[#176249]"
				><LayoutDashboard size={18} /> Dashboard</a
			>
			<a
				href="/dashboard#locations"
				class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#315c4d] transition hover:bg-[#f2f8f3] hover:text-[#176249]"
				><MapPin size={18} /> Locations</a
			>
			<div class="my-2 border-t border-[#e5ece6]"></div>
			<form method="POST" action="?/sign_out">
				<button
					class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50"
					><LogOut size={18} /> Sign out</button
				>
			</form>
		</aside>
	</div>
</section>
