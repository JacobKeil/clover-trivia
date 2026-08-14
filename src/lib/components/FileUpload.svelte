<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Tooltip as AppTooltip } from '$lib/components/ui';

	// Two-way binding for the raw File object or null
	let { file = $bindable(null) }: { file: File | null } = $props();

	let is_dragging = $state(false);
	let file_input: HTMLInputElement;
	let preview_url = $state<string | null>(null);
	let error_message = $state<string | null>(null);

	const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

	function process_file(selected_file: File | undefined) {
		if (!selected_file) return;
		error_message = null;

		if (!VALID_TYPES.includes(selected_file.type)) {
			error_message = 'Invalid file type. Only JPG, PNG, and WebP are allowed.';
			return;
		}

		// Revoke previous preview URL to avoid memory leaks
		if (preview_url) URL.revokeObjectURL(preview_url);

		// Assign state
		file = selected_file;
		preview_url = URL.createObjectURL(selected_file);
	}

	function remove_file(e: Event) {
		e.stopPropagation(); // Prevents opening the file input dialog
		if (preview_url) URL.revokeObjectURL(preview_url);

		file = null;
		preview_url = null;
		error_message = null;
		if (file_input) file_input.value = '';
	}

	function handle_drop(e: DragEvent) {
		e.preventDefault();
		is_dragging = false;
		const dropped_file = e.dataTransfer?.files?.[0];
		process_file(dropped_file);
	}

	function handle_select(e: Event) {
		const target = e.target as HTMLInputElement;
		const selected_file = target.files?.[0];
		process_file(selected_file);
	}

	onDestroy(() => {
		if (preview_url) URL.revokeObjectURL(preview_url);
	});
</script>

<!-- Drag and drop zone with Tailwind v4 utilities -->
<div
	role="button"
	tabindex="0"
	class="relative flex min-h-48 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 ease-in-out select-none
    {is_dragging
		? 'scale-[0.99] border-primary-dark bg-blue-50/50 shadow-inner'
		: 'border-slate-300 bg-slate-50/30 hover:border-slate-400'}"
	onclick={() => file_input.click()}
	onkeydown={(e) => e.key === 'Enter' && file_input.click()}
	ondragover={(e) => {
		e.preventDefault();
		is_dragging = true;
	}}
	ondragleave={() => (is_dragging = false)}
	ondrop={handle_drop}
>
	<input
		type="file"
		bind:this={file_input}
		accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
		onchange={handle_select}
		class="hidden"
	/>

	{#if preview_url && file}
		<div class="flex w-full flex-col items-center gap-3">
			<div
				class="group relative max-w-xs overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xs"
			>
				<img src={preview_url} alt="Preview" class="max-h-40 w-auto rounded-md object-contain" />

				<!-- Remove file button overlay -->
				<AppTooltip label="Remove image"
					><button
						type="button"
						aria-label="Remove image"
						onclick={remove_file}
						class="absolute top-2 right-2 rounded-full bg-slate-900/70 p-1.5 text-white transition-opacity hover:bg-slate-900 active:scale-95"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
						>
					</button></AppTooltip
				>
			</div>

			<div class="flex flex-col items-center text-xs text-slate-500">
				<span class="font-medium text-slate-700">{file.name}</span>
				<span>Click or drag to replace image</span>
			</div>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-2">
			<div
				class="rounded-lg border border-slate-100 bg-white p-3 text-slate-400 shadow-xs transition-colors group-hover:text-slate-500"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-image-up"
					><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.3" /><path
						d="m11.6 17.8-3.1-3.1a.5.5 0 0 0-.7 0l-4.3 4.3"
					/><path d="m14 12 1.3-1.3a.5.5 0 0 1 .7 0l2.5 2.5" /><circle cx="9" cy="9" r="2" /><path
						d="M19 15v6"
					/><path d="M16 18h6" /></svg
				>
			</div>
			<p class="text-sm font-semibold text-slate-700">
				Drag & drop <span class="text-primary-dark underline">one image</span> here
			</p>
			<p class="text-xs text-slate-500">Supports JPG, JPEG, PNG, and WebP formats</p>
		</div>
	{/if}
</div>

{#if error_message}
	<div
		class="animate-in fade-in slide-in-from-top-1 mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600 duration-150"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-alert-circle"
			><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line
				x1="12"
				x2="12.01"
				y1="16"
				y2="16"
			/></svg
		>
		{error_message}
	</div>
{/if}
