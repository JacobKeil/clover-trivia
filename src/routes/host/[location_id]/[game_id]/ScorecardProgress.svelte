<script lang="ts">
	let {
		total,
		remaining,
		filter,
		onfilterchange,
		team_search,
		onteamsearchchange
	}: {
		total: number;
		remaining: number;
		filter: 'ALL' | 'NEEDS_SCORING';
		onfilterchange: (filter: 'ALL' | 'NEEDS_SCORING') => void;
		team_search: string;
		onteamsearchchange: (search: string) => void;
	} = $props();
</script>

<div
	class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dbe8de] bg-[#f8fbf8] px-4 py-3"
>
	<div>
		<p class="text-xs font-extrabold tracking-[.09em] text-[#577566] uppercase">Scoring progress</p>
		<p class="mt-0.5 text-sm font-semibold text-[#315c4d]">
			{remaining === 0
				? 'Every team has been scored.'
				: `${remaining} ${remaining === 1 ? 'team still needs' : 'teams still need'} scoring.`}
		</p>
	</div>
	<div class="flex flex-wrap items-center justify-end gap-2">
		<label class="sr-only" for="scorecard-team-search">Search teams</label>
		<input
			id="scorecard-team-search"
			value={team_search}
			oninput={(event) => onteamsearchchange(event.currentTarget.value)}
			placeholder="Search teams…"
			class="h-9 w-40 rounded-md border border-[#d8e4db] bg-white px-3 text-sm font-medium text-[#315c4d] outline-none focus:border-[#238061] focus:ring-2 focus:ring-[#238061]/15"
		/>
		<div
			class="inline-flex overflow-hidden rounded-lg border border-[#cfddd2] bg-white text-xs font-bold"
		>
			<button
				type="button"
				onclick={() => onfilterchange('ALL')}
				class="border-r border-[#cfddd2] px-3 py-1.5 transition-colors {filter === 'ALL'
					? 'bg-[#176249] text-white'
					: 'text-[#527466] hover:bg-[#edf5ef]'}">All · {total}</button
			>
			<button
				type="button"
				onclick={() => onfilterchange('NEEDS_SCORING')}
				class="px-3 py-1.5 transition-colors {filter === 'NEEDS_SCORING'
					? 'bg-amber-500 text-white'
					: 'text-[#8a6514] hover:bg-amber-50'}">Needs scoring · {remaining}</button
			>
		</div>
	</div>
</div>
