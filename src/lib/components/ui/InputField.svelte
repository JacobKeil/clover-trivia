<script lang="ts">
	import { Label } from 'bits-ui';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		label = '',
		description = '',
		value = $bindable(''),
		...restProps
	}: {
		label?: string;
		description?: string;
		value?: string | number | null;
	} & HTMLInputAttributes = $props();
</script>

<div class="flex flex-col space-y-1">
	{#if label}
		<Label.Root class="text-surface-content/80 text-xs font-semibold">
			{label}
		</Label.Root>
	{/if}
	<input
		bind:value
		{...restProps}
		class="bg-surface-100 text-surface-content h-9 w-full rounded-md border border-secondary/20 px-3 text-xs shadow-xs focus:border-primary focus:outline-hidden disabled:opacity-50"
	/>
	{#if description}
		<p class="text-[11px] leading-4 text-secondary/60">{description}</p>
	{/if}
</div>
