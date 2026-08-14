<script lang="ts">
	let {
		total,
		remaining,
		filter,
		onfilterchange
	}: {
		total: number;
		remaining: number;
		filter: 'ALL' | 'NEEDS_SCORING';
		onfilterchange: (filter: 'ALL' | 'NEEDS_SCORING') => void;
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
	<div class="inline-flex rounded-lg border border-[#cfddd2] bg-white p-1 text-xs font-bold">
		<button
			type="button"
			onclick={() => onfilterchange('ALL')}
			class="rounded-md px-3 py-1.5 transition-colors {filter === 'ALL'
				? 'bg-[#176249] text-white'
				: 'text-[#527466] hover:bg-[#edf5ef]'}">All · {total}</button
		>
		<button
			type="button"
			onclick={() => onfilterchange('NEEDS_SCORING')}
			class="rounded-md px-3 py-1.5 transition-colors {filter === 'NEEDS_SCORING'
				? 'bg-amber-500 text-white'
				: 'text-[#8a6514] hover:bg-amber-50'}">Needs scoring · {remaining}</button
		>
	</div>
</div>
