<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { InputField, FileUpload, WYSIWYG } from '$lib/components';
	import { untrack } from 'svelte';
	import { type TipexEditor } from '@friendofsvelte/tipex';

	let { data }: { data: PageData } = $props();

	const initial_location = untrack(() => data.location);

	let location_form = $state({
		name: initial_location?.name ?? '',
		address: initial_location?.address ?? '',
		logo_file: null as File | null,
		picture_file: null as File | null,
		location_rules: initial_location?.location_rule?.rules_markdown ?? '',
		is_active: initial_location?.is_active ?? true,
		default_question_count: initial_location?.default_question_count ?? 3
	});

	let existing_logo_url = $state<string | null>(initial_location?.logo_url ?? null);
	let existing_picture_url = $state<string | null>(initial_location?.picture_url ?? null);

	let is_changing_logo = $state(false);
	let is_changing_picture = $state(false);

	let is_submitting = $state(false);
	let error_message = $state<string | null>(null);

	let tiptap_editor = $state<TipexEditor>();

	function handle_rules_update() {
		if (tiptap_editor) {
			location_form.location_rules = tiptap_editor.getHTML();
		}
	}

	function cancel_logo_change() {
		is_changing_logo = false;
		location_form.logo_file = null;
	}

	function cancel_picture_change() {
		is_changing_picture = false;
		location_form.picture_file = null;
	}
</script>

<svelte:head>
	<title>Edit - {location_form.name}</title>
</svelte:head>

<section class="mx-auto my-8 flex max-w-4xl flex-col space-y-8 text-secondary">
	<div class="flex items-center justify-between border-b border-secondary/10 pb-4">
		<div class="flex flex-col">
			<h1 class="text-3xl font-bold tracking-tight text-primary-dark">Update Location</h1>
			<p class="mt-1 text-sm text-secondary/80">
				Manage venue settings, upload images, and update game rules.
			</p>
		</div>

		<div
			class="bg-surface-100 flex items-center gap-3 rounded-lg border border-secondary/10 p-3 shadow-xs"
		>
			<div class="flex flex-col text-left">
				<span class="text-surface-content/60 text-[11px] font-semibold tracking-wider uppercase"
					>Status</span
				>
				<span
					class="text-sm font-medium {location_form.is_active
						? 'text-emerald-600'
						: 'text-red-400'}"
				>
					{location_form.is_active ? 'Active' : 'Inactive'}
				</span>
			</div>
			<label class="relative inline-flex cursor-pointer items-center">
				<input type="checkbox" class="peer sr-only" bind:checked={location_form.is_active} />
				<div
					class="peer h-5 w-9 rounded-full bg-secondary/20 peer-checked:bg-primary-dark peer-focus:outline-hidden after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:border after:border-secondary/30 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"
				></div>
			</label>
		</div>
	</div>

	<form
		method="POST"
		action="?/update"
		enctype="multipart/form-data"
		use:enhance={({ formData }) => {
			is_submitting = true;
			error_message = null;

			if (location_form.logo_file) {
				formData.set('logo_file', location_form.logo_file);
			}
			if (location_form.picture_file) {
				formData.set('picture_file', location_form.picture_file);
			}
			if (location_form.location_rules) {
				formData.set('location_rules', location_form.location_rules);
			}
			formData.set('default_question_count', location_form.default_question_count.toString());
			formData.set('is_active', location_form.is_active ? 'true' : 'false');

			return async ({ result }) => {
				is_submitting = false;

				if (result.type === 'failure') {
					error_message = (result.data?.message as string) || 'Failed to update location.';
				} else {
					await goto('/dashboard');
				}
			};
		}}
		class="flex flex-col space-y-6"
	>
		<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
			<InputField
				required
				name="name"
				label="Location Name *"
				placeholder="Enter the location name..."
				bind:value={location_form.name}
			/>
			<InputField
				required
				name="address"
				label="Location Address *"
				placeholder="Enter the address..."
				bind:value={location_form.address}
			/>
		</div>

		<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
			<div class="flex flex-col space-y-1">
				<span class="text-surface-content/80 text-xs font-semibold">Upload Logo</span>
				{#if existing_logo_url && !is_changing_logo}
					<div
						class="bg-surface-100 relative flex items-center justify-between rounded-lg border border-secondary/15 p-3 shadow-xs"
					>
						<div class="flex items-center space-x-3 overflow-hidden">
							<img
								src={existing_logo_url}
								alt="Logo"
								class="h-12 w-12 rounded-md border border-secondary/10 object-cover"
							/>
							<div class="flex flex-col overflow-hidden text-ellipsis">
								<span class="text-surface-content text-xs font-semibold">Current Logo</span>
								<a
									href={existing_logo_url}
									target="_blank"
									rel="noreferrer"
									class="truncate text-xs text-primary underline hover:text-primary-dark"
								>
									View Full Image
								</a>
							</div>
						</div>
						<button
							type="button"
							onclick={() => (is_changing_logo = true)}
							class="bg-surface-200 text-surface-content cursor-pointer rounded-md border border-secondary/20 px-3 py-1 text-xs font-medium transition-colors hover:bg-secondary/10"
						>
							Change
						</button>
					</div>
				{:else}
					<div class="flex flex-col space-y-1">
						<FileUpload bind:file={location_form.logo_file} />
						{#if existing_logo_url}
							<button
								type="button"
								onclick={cancel_logo_change}
								class="cursor-pointer self-end text-xs font-medium text-secondary hover:underline"
							>
								Cancel & keep existing image
							</button>
						{/if}
					</div>
				{/if}
			</div>

			<div class="flex flex-col space-y-1">
				<span class="text-surface-content/80 text-xs font-semibold">Upload Location Picture</span>
				{#if existing_picture_url && !is_changing_picture}
					<div
						class="bg-surface-100 relative flex items-center justify-between rounded-lg border border-secondary/15 p-3 shadow-xs"
					>
						<div class="flex items-center space-x-3 overflow-hidden">
							<img
								src={existing_picture_url}
								alt="Location"
								class="h-12 w-12 rounded-md border border-secondary/10 object-cover"
							/>
							<div class="flex flex-col overflow-hidden text-ellipsis">
								<span class="text-surface-content text-xs font-semibold">Current Photo</span>
								<a
									href={existing_picture_url}
									target="_blank"
									rel="noreferrer"
									class="truncate text-xs text-primary underline hover:text-primary-dark"
								>
									View Full Image
								</a>
							</div>
						</div>
						<button
							type="button"
							onclick={() => (is_changing_picture = true)}
							class="bg-surface-200 text-surface-content cursor-pointer rounded-md border border-secondary/20 px-3 py-1 text-xs font-medium transition-colors hover:bg-secondary/10"
						>
							Change
						</button>
					</div>
				{:else}
					<div class="flex flex-col space-y-1">
						<FileUpload bind:file={location_form.picture_file} />
						{#if existing_picture_url}
							<button
								type="button"
								onclick={cancel_picture_change}
								class="cursor-pointer self-end text-xs font-medium text-secondary hover:underline"
							>
								Cancel & keep existing image
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<div class="flex flex-col space-y-1">
			<span class="text-surface-content/80 text-xs font-semibold">Locations Rules</span>
			<WYSIWYG
				bind:tiptap_editor
				body={location_form.location_rules}
				label=""
				{handle_rules_update}
			/>
		</div>

		<div class="space-y-3 pt-2">
			<div>
				<h2 class="text-surface-content/70 text-lg font-bold">Round Defaults</h2>
				<hr class="my-2 border-secondary/20" />
			</div>

			<div class="w-44">
				<InputField
					type="number"
					min="1"
					max="20"
					label="Standard-round question count"
					name="default_question_count"
					description="Used as the template for new games; existing games keep their own setup."
					class="text-center font-bold"
					bind:value={location_form.default_question_count}
				/>
			</div>
		</div>

		<hr class="my-2 border-secondary/20" />

		{#if error_message}
			<p class="rounded-lg bg-rose-500/10 p-3 text-sm font-medium text-rose-600">{error_message}</p>
		{/if}

		<div class="flex justify-end">
			<button
				disabled={is_submitting}
				class="cursor-pointer rounded-md bg-primary-dark px-6 py-2.5 font-semibold text-white shadow-md hover:bg-primary-dark/90 disabled:opacity-40"
				type="submit"
			>
				{is_submitting ? 'Saving Changes...' : 'Save Changes'}
			</button>
		</div>
	</form>
</section>

<style>
	/* Prevent TipTap placeholder from showing if editor has actual content */
	:global(.tiptap p.is-editor-empty:first-child::before) {
		color: #adb5bd;
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	:global(.peer.appearance-none) {
		display: none !important;
	}

	/* Force hide placeholder when editor isn't strictly empty */
	:global(.tiptap:not(.is-editor-empty) .is-editor-empty::before) {
		display: none !important;
		content: '' !important;
	}
</style>
