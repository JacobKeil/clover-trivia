<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { X } from '@lucide/svelte';
	import Tooltip from './Tooltip.svelte';

	let { label = 'Close dialog' }: { label?: string } = $props();
</script>

<Tooltip {label} class="absolute top-4 right-4">
	<Dialog.Close
		aria-label={label}
		class="grid size-8 cursor-pointer place-items-center rounded-md text-[#527466] transition-colors hover:bg-[#edf4ee] hover:text-[#183d32] focus:ring-2 focus:ring-[#83b99b] focus:outline-hidden"
		><X size={18} /></Dialog.Close
	>
</Tooltip>
