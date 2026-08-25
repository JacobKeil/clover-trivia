<script lang="ts">
	import { flip } from 'svelte/animate';
	import { MonitorUp, Trophy } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { leaderboard, max_height }: { leaderboard: PageData['leaderboard']; max_height?: number } =
		$props();
	let bottom_up = $derived([...leaderboard].reverse());

	function rank_for(entry: PageData['leaderboard'][number]) {
		return leaderboard.findIndex((candidate) => candidate.points === entry.points) + 1;
	}
</script>

<aside
	class="flex min-h-115 flex-col overflow-hidden rounded-2xl border border-[#dce7df] bg-white p-5 shadow-sm lg:min-h-0 lg:self-start"
	style:min-height={max_height ? `${max_height}px` : undefined}
	style:max-height={max_height ? `${max_height}px` : undefined}
>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2 text-[#176249]">
			<MonitorUp size={18} /><span class="text-xs font-extrabold tracking-[.1em]"
				>LIVE LEADERBOARD</span
			>
		</div>
		<Trophy size={17} class="text-[#bd8a27]" />
	</div>
	<div
		class="mt-5 grid flex-1 [scrollbar-width:thin] [scrollbar-color:#8fac99_transparent] content-start gap-2 overflow-y-scroll pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#8fac99] [&::-webkit-scrollbar-track]:bg-[#edf4ee]"
	>
		{#if leaderboard.length}{#each bottom_up as entry, index (entry.team.id)}<div
					animate:flip={{ duration: 420 }}
					class="flex items-center gap-2.5 rounded-md {rank_for(entry) <= 3
						? 'bg-[#f6faf5]'
						: 'bg-[#fbfcfb]'} px-2.5 py-1.5"
				>
					<span class="w-3 text-right text-[.65rem] font-medium text-[#9aa9a0]"
						>{leaderboard.length - index}</span
					>
					<span
						class="grid size-5 place-items-center rounded-full bg-[#dfeee2] text-[.65rem] font-extrabold text-[#286d54]"
						>{rank_for(entry)}</span
					><span class="min-w-0 flex-1 truncate text-[.8rem] font-semibold">{entry.team.name}</span
					><strong class="font-[Kanit] text-lg leading-none font-medium text-[#1e624b]"
						>{entry.points}</strong
					>
				</div>{/each}{:else}<p class="rounded-lg bg-[#f7faf7] p-4 text-sm text-[#71837a]">
				Add teams to start the live leaderboard.
			</p>{/if}
	</div>
</aside>
