<script lang="ts">
	import { enhance } from '$app/forms';
	import { Dialog } from 'bits-ui';
	import { Search } from '@lucide/svelte';
	import DialogCloseButton from './DialogCloseButton.svelte';

	type UsedQuestion = {
		question_text: string;
		correct_answer_text: string;
		song_title: string | null;
		song_artist: string | null;
		game_title: string;
	};

	let {
		open = $bindable(false),
		action = '?/search_questions'
	}: { open?: boolean; action?: string } = $props();

	let results = $state<UsedQuestion[]>([]);
	let message = $state<string | null>(null);

	$effect(() => {
		if (!open) {
			results = [];
			message = null;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger
		class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#c8ddce] px-4 py-2.5 text-sm font-bold text-[#246d52] transition-colors hover:bg-[#f2f8f3]"
		><Search size={16} /> Search past questions</Dialog.Trigger
	>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-[#123328]/35 backdrop-blur-sm" />
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#dce7df] bg-white p-6 shadow-2xl outline-hidden"
		>
			<DialogCloseButton />
			<Dialog.Title class="font-[Kanit] text-2xl font-medium text-[#183d32]"
				>Search past questions</Dialog.Title
			>
			<Dialog.Description class="mt-1 text-sm text-[#71837a]"
				>Every word you enter must appear somewhere in the question text.</Dialog.Description
			>
			<form
				method="POST"
				{action}
				class="mt-5 flex gap-2"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							results = (result.data?.results ?? []) as UsedQuestion[];
							message = results.length ? null : 'No matching questions found.';
						} else if (result.type === 'failure') {
							message = (result.data?.message as string) ?? 'Could not search questions.';
						}
					};
				}}
			>
				<input
					required
					name="search"
					placeholder="e.g. movie star wars"
					class="h-11 flex-1 rounded-md border border-[#d6e1d8] px-3 text-sm"
				/>
				<button
					class="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#176249] px-4 text-sm font-bold text-white transition-colors hover:bg-[#12523d]"
					><Search size={16} /> Search</button
				>
			</form>
			{#if message}
				<p class="mt-4 rounded-lg bg-[#f7faf7] px-3 py-2 text-sm text-[#527466]">{message}</p>
			{/if}
			<div class="mt-5 grid gap-3">
				{#each results as result}
					<article class="rounded-xl border border-[#e1e9e3] p-4">
						<p class="text-xs font-extrabold tracking-[.1em] text-[#71837a] uppercase">
							{result.game_title}
						</p>
						<p class="mt-2 font-semibold text-[#183d32]">{result.question_text}</p>
						<p class="mt-3 rounded-lg bg-[#f3f8f3] px-3 py-2 text-sm text-[#315c4d]">
							<span class="font-bold">Answer:</span>
							{result.correct_answer_text}
						</p>
						{#if result.song_title || result.song_artist}
							<p class="mt-3 text-sm text-[#527466]">
								<span class="font-bold">Song:</span>
								{result.song_title ?? '—'}
								{#if result.song_artist}
									<span class="ml-2 font-bold">Artist:</span> {result.song_artist}
								{/if}
							</p>
						{/if}
					</article>
				{/each}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
