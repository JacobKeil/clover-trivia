<script lang="ts">
	import { Switch } from 'bits-ui';
	import { untrack } from 'svelte';
	import { FileUpload } from '$lib/components';

	let {
		file = $bindable<File | null>(null),
		image_url = null,
		on_remove
	}: { file?: File | null; image_url?: string | null; on_remove?: () => void } = $props();

	let is_changing = $state(false);
	let include_image = $state(untrack(() => Boolean(image_url || file)));
	let has_saved_image = $derived(Boolean(image_url) && !file && !is_changing);

	function handle_image_toggle(checked: boolean) {
		include_image = checked;
		if (!checked) {
			file = null;
			on_remove?.();
		}
	}

	function begin_change() {
		is_changing = true;
		include_image = true;
	}

	function cancel_change() {
		file = null;
		is_changing = false;
		include_image = true;
	}
</script>

<div>
	<div
		class="flex items-center justify-between gap-4 rounded-lg border border-secondary/15 bg-secondary/[.025] px-3 py-2.5"
	>
		<div>
			<p class="text-surface-content/80 text-xs font-semibold">Include an image</p>
			<p class="mt-0.5 text-[11px] text-secondary/60">
				Show an optional visual with this question.
			</p>
		</div>
		<Switch.Root
			checked={include_image}
			disabled={has_saved_image}
			onCheckedChange={handle_image_toggle}
			aria-label="Include an image with this question"
			class="group relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-secondary/25 p-0.5 transition disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:bg-primary-dark"
		>
			<Switch.Thumb
				class="block size-5 rounded-full bg-white shadow-sm transition-transform group-data-[state=checked]:translate-x-5"
			/>
		</Switch.Root>
	</div>

	{#if has_saved_image}
		<div
			class="bg-surface-100 mt-2 flex items-center justify-between gap-3 rounded-lg border border-secondary/15 p-3 shadow-xs"
		>
			<div class="flex min-w-0 items-center gap-3">
				<img
					src={image_url}
					alt="Current question"
					class="size-14 rounded-md border border-secondary/10 object-cover"
				/>
				<div class="min-w-0">
					<p class="text-surface-content text-xs font-semibold">Current question image</p>
					<a
						href={image_url}
						target="_blank"
						rel="noreferrer"
						class="block truncate text-xs text-primary underline hover:text-primary-dark"
						>View full image</a
					>
				</div>
			</div>
			<button
				type="button"
				onclick={begin_change}
				class="bg-surface-200 text-surface-content cursor-pointer rounded-md border border-secondary/20 px-3 py-1 text-xs font-medium transition-colors hover:bg-secondary/10"
				>Change</button
			>
		</div>
	{:else if include_image}
		<div
			class="mt-2 space-y-2 rounded-lg border border-dashed border-secondary/20 bg-secondary/[.025] p-3"
		>
			<FileUpload bind:file />
			{#if image_url && is_changing}<button
					type="button"
					onclick={cancel_change}
					class="cursor-pointer text-xs font-medium text-secondary hover:underline"
					>Cancel &amp; keep existing image</button
				>{/if}
		</div>
	{/if}
</div>
