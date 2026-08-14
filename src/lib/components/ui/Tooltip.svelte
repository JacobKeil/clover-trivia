<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		label,
		children,
		class: class_name = ''
	}: { label: string; children: Snippet; class?: string } = $props();
</script>

<Tooltip.Provider>
	<Tooltip.Root delayDuration={350} disableHoverableContent ignoreNonKeyboardFocus>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<span {...props} class={`inline-flex ${class_name}`}>{@render children()}</span>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				sideOffset={6}
				class="z-[100] rounded-md bg-[#183d32] px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg"
			>
				{label}
				<Tooltip.Arrow class="fill-[#183d32]" />
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
</Tooltip.Provider>
