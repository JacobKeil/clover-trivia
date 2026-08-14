<script lang="ts">
	import type { Location_Dashboard } from '$lib/server/queries/locations';
	import { format } from 'date-fns';
	import { BarChart3, CalendarDays, MapPin, Settings2 } from '@lucide/svelte';
	import { Tooltip as AppTooltip } from '$lib/components/ui';
	let { location }: { location: Location_Dashboard } = $props();
</script>

<article
	class="group overflow-hidden rounded-xl border border-[#e2e9e3] bg-white shadow-[0_4px_16px_#163b3208] transition duration-200 hover:border-[#bad6c2] hover:bg-[#fbfdfb] hover:shadow-[0_12px_24px_#163b3210]"
>
	<div class="relative">
		{#if location.picture_url}
			<img src={location.picture_url} class="h-36 w-full object-cover" alt={location.name} />
		{:else}
			<div class="flex h-36 items-end bg-[linear-gradient(125deg,#dceee2,#b6d9c3)] p-4">
				<span class="font-[Kanit] text-2xl font-medium text-[#32634f]"
					>{location.name.slice(0, 1)}</span
				>
			</div>
		{/if}
		{#if location.logo_url}
			<div
				class="absolute top-3 left-3 grid size-12 place-items-center rounded-full border border-white/70 bg-white/75 p-1.5 shadow-md backdrop-blur-sm"
			>
				<img
					src={location.logo_url}
					alt={`${location.name} logo`}
					class="size-full rounded-full object-contain opacity-85"
				/>
			</div>
		{/if}
		<div class="absolute top-3 right-3 flex items-center gap-2">
			{#if location.is_active}
				<span
					class="rounded-full bg-[#176249] px-2.5 py-2 text-[.6rem] font-extrabold tracking-[.1em] text-white"
					>ACTIVE</span
				>
			{:else}
				<span
					class="rounded-full bg-rose-700 px-2.5 py-2 text-[.6rem] font-extrabold tracking-[.1em] text-white"
					>INACTIVE</span
				>
			{/if}
			<AppTooltip label="Location statistics"
				><a
					aria-label="View statistics for {location.name}"
					href="/locations/{location.id}/stats"
					class="grid size-7 place-items-center rounded-full bg-white text-[#176249] shadow-sm transition hover:bg-[#eaf5ec]"
				>
					<BarChart3 size={14} />
				</a></AppTooltip
			>
			<AppTooltip label="Edit location"
				><a
					aria-label="Edit {location.name}"
					href="/locations/update/{location.id}"
					class="grid size-7 place-items-center rounded-full bg-white text-[#176249] shadow-sm transition hover:rotate-12"
				>
					<Settings2 size={14} />
				</a></AppTooltip
			>
		</div>
	</div>
	<div class="p-4">
		<h3 class="font-[Kanit] text-lg font-medium text-[#1b4035]">{location.name}</h3>
		<p class="mt-1 flex items-start gap-1.5 text-xs leading-5 text-[#71837a]">
			<MapPin size={14} class="mt-0.5 shrink-0 text-[#3c8b6c]" />{location.address}
		</p>
		<div class="mt-4 border-t border-[#edf1ed] pt-3">
			<p class="text-[.6rem] font-extrabold tracking-[.1em] text-[#739184]">LAST GAME</p>
			{#if location.games.length == 0}
				<p class="mt-1.5 text-sm text-[#71837a]">No games played yet.</p>
			{:else}
				<p class="mt-1.5 text-sm font-semibold text-[#36584b]">{location.games[0].title}</p>
				<p class="mt-1 flex items-center gap-1.5 text-xs text-[#71837a]">
					<CalendarDays size={13} />{format(
						location.games[0].scheduled_at,
						"MMM d, yyyy 'at' h:mm a"
					)}
				</p>
			{/if}
		</div>
	</div>
</article>
