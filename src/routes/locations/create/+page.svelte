<script lang="ts">
	import { enhance } from '$app/forms';
	import type { CreateLocationForm } from './store';
	import type { TipexEditor } from '@friendofsvelte/tipex';
	import { FileUpload, InputField, WYSIWYG } from '$lib/components';

	let location_form = $state<CreateLocationForm>({
		name: '',
		address: '',
		logo_file: null,
		picture_file: null,
		location_rules: undefined,
		is_active: true,
		default_question_count: 3
	});

	let is_submitting = $state(false);
	let error_message = $state<string | null>(null);
	let tiptap_editor = $state<TipexEditor>();

	function handle_rules_update() {
		if (tiptap_editor) {
			location_form.location_rules = tiptap_editor.getHTML();
		}
	}
</script>

<svelte:head>
	<title>Create Location - Clover Trivia</title>
</svelte:head>

<section class="mx-auto my-8 flex max-w-5xl flex-col space-y-8 text-secondary">
	<div class="border-b border-secondary/10 pb-4">
		<h1 class="text-3xl font-bold tracking-tight text-primary-dark">Create New Location</h1>
		<p class="mt-1 text-sm text-secondary/80">
			Add your new location. Setup rules and game template!
		</p>
	</div>

	<form
		method="POST"
		action="?/create"
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

			return async ({ result, update }) => {
				is_submitting = false;

				if (result.type === 'failure') {
					error_message = (result.data?.message as string) || 'An error occurred';
				} else {
					await update();
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
				<FileUpload bind:file={location_form.logo_file} />
			</div>
			<div class="flex flex-col space-y-1">
				<span class="text-surface-content/80 text-xs font-semibold">Upload Location Picture</span>
				<FileUpload bind:file={location_form.picture_file} />
			</div>
		</div>

		<div class="flex flex-col space-y-1">
			<span class="text-surface-content/80 text-xs font-semibold">Locations Rules</span>
			<WYSIWYG bind:tiptap_editor body={undefined} label="" {handle_rules_update} />
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
					description="Every standard round in a new game will use this count."
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
				{is_submitting ? 'Creating...' : 'Create Location'}
			</button>
		</div>
	</form>
</section>
