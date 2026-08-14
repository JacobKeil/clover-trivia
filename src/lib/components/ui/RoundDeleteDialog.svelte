<script lang="ts">
	import { Dialog } from 'bits-ui';

	let {
		open = $bindable(false),
		round_name,
		onconfirm
	}: {
		open?: boolean;
		round_name?: string;
		onconfirm: () => void;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-secondary/20 bg-white p-6 shadow-xl outline-hidden"
		>
			<Dialog.Title class="text-surface-content text-lg font-bold">Delete round?</Dialog.Title>
			<Dialog.Description class="text-surface-content/65 mt-2 text-sm">
				This removes {round_name ?? 'this round'} and all of its questions from this game draft.
			</Dialog.Description>
			<div class="mt-6 flex justify-end gap-2">
				<Dialog.Close
					class="rounded-md bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary"
					>Cancel</Dialog.Close
				>
				<button
					type="button"
					onclick={onconfirm}
					class="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
					>Delete round</button
				>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
