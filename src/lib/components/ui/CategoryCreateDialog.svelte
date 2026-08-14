<script lang="ts">
	import { Dialog } from 'bits-ui';

	let {
		open = $bindable(false),
		name = $bindable(''),
		oncreate
	}: {
		open?: boolean;
		name?: string;
		oncreate: () => void;
	} = $props();

	function submit_on_enter(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		oncreate();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
		<Dialog.Content
			class="fixed top-[50%] left-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] space-y-4 rounded-xl border border-secondary/20 bg-white p-6 shadow-xl outline-hidden"
		>
			<Dialog.Title class="text-surface-content text-lg font-bold">Add New Category</Dialog.Title>
			<Dialog.Description class="text-surface-content/60 text-xs">
				Create a new question category to select for this question and store in your account.
			</Dialog.Description>
			<div class="flex flex-col space-y-1">
				<label for="new_cat_name" class="text-surface-content/80 text-xs font-semibold"
					>Category Name</label
				>
				<input
					id="new_cat_name"
					type="text"
					placeholder="e.g. Sports, Geography, Movies"
					class="bg-surface-100 text-surface-content h-9 w-full rounded-md border border-secondary/20 px-3 text-xs shadow-xs focus:border-primary focus:outline-hidden"
					bind:value={name}
					onkeydown={submit_on_enter}
				/>
			</div>
			<div class="flex justify-end space-x-2 pt-2">
				<Dialog.Close
					class="text-surface-content cursor-pointer rounded-md bg-secondary/10 px-4 py-2 text-xs font-semibold hover:bg-secondary/20"
					>Cancel</Dialog.Close
				>
				<button
					type="button"
					class="cursor-pointer rounded-md bg-primary-dark px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark/90"
					onclick={oncreate}>Create Category</button
				>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
