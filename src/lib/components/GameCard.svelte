<script lang="ts">
	import { enhance } from '$app/forms';
	import { Dialog } from 'bits-ui';
	import {
		CalendarDays,
		BookOpen,
		Copy,
		FilePenLine,
		MapPin,
		MonitorPlay,
		Trash2
	} from '@lucide/svelte';
	import { format } from 'date-fns';
	import { Tooltip as AppTooltip } from '$lib/components/ui';
	import type { Dashboard_Game } from '$lib/server/queries/games';

	let {
		game,
		variant = 'upcoming',
		locations = []
	}: {
		game: Dashboard_Game;
		variant?: 'draft' | 'upcoming' | 'recent';
		locations?: { id: string; name: string }[];
	} = $props();

	const variant_styles = {
		draft: {
			label: 'DRAFT',
			badge: 'bg-sky-50 text-sky-800 ring-sky-200',
			accent: 'bg-sky-500'
		},
		upcoming: {
			label: 'UPCOMING',
			badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
			accent: 'bg-emerald-500'
		},
		recent: {
			label: 'COMPLETED',
			badge: 'bg-slate-100 text-slate-600 ring-slate-200',
			accent: 'bg-slate-400'
		}
	};

	let styles = $derived(
		game.status === 'IN_PROGRESS'
			? {
					label: 'IN PROGRESS',
					badge: 'bg-blue-50 text-blue-700 ring-blue-200',
					accent: 'bg-blue-500'
				}
			: variant_styles[variant]
	);
	let destination_locations = $derived(
		locations.filter((location) => location.id !== game.location_id)
	);
	let duplicate_dialog_open = $state(false);
	let delete_dialog_open = $state(false);
</script>

<article
	class="relative overflow-hidden rounded-xl border border-[#e2e9e3] bg-white p-5 shadow-[0_4px_16px_#163b3208] transition duration-200 hover:border-[#bad6c2] hover:bg-[#fbfdfb] hover:shadow-[0_12px_24px_#163b3210]"
>
	<div class="absolute top-0 bottom-0 left-0 w-1 {styles.accent}"></div>
	<div class="relative">
		<div>
			<span
				class="inline-flex rounded-full px-2.5 py-1 text-[.6rem] font-extrabold tracking-[.1em] ring-1 {styles.badge}"
				>{styles.label}</span
			>
			<h3
				class="mt-3 font-[Kanit] text-xl font-medium tracking-[-.02em] break-words text-[#1b4035]"
			>
				{game.title}
			</h3>
		</div>
		<div class="absolute top-0 right-0 flex items-center gap-1.5">
			{#if variant === 'draft'}
				<form method="POST" action="?/schedule_game" use:enhance>
					<input type="hidden" name="game_id" value={game.id} />
					<AppTooltip label="Schedule game"
						><button
							type="submit"
							class="grid size-8 cursor-pointer place-items-center rounded-md border border-sky-200 bg-sky-50 text-sky-800 transition hover:bg-sky-100"
							aria-label={`Schedule ${game.title}`}><CalendarDays size={15} /></button
						></AppTooltip
					>
				</form>
			{/if}
			<AppTooltip label={variant === 'recent' ? 'View recap' : 'Edit game'}
				><a
					class="grid size-8 place-items-center rounded-md bg-[#f1f6f1] text-[#27735a] transition hover:bg-[#176249] hover:text-white"
					href={variant === 'recent' ? `/recap/${game.id}` : `/games/update/${game.id}`}
					aria-label={variant === 'recent' ? `View recap for ${game.title}` : `Edit ${game.title}`}
					>{#if variant === 'recent'}<BookOpen size={15} />{:else}<FilePenLine size={15} />{/if}</a
				></AppTooltip
			>
			{#if variant === 'upcoming'}
				<AppTooltip label="Host game"
					><a
						class="grid size-8 place-items-center rounded-md bg-[#e8f4ec] text-[#176249] transition hover:bg-[#176249] hover:text-white"
						href="/host/{game.location_id}/{game.id}"
						aria-label={`Host ${game.title}`}><MonitorPlay size={15} /></a
					></AppTooltip
				>
			{/if}
			{#if ['DRAFT', 'SCHEDULED'].includes(game.status)}
				{#if destination_locations.length > 0}
					<AppTooltip label="Duplicate game"
						><button
							type="button"
							class="grid size-8 cursor-pointer place-items-center rounded-md border border-[#c8ddce] bg-white text-[#246d52] transition hover:bg-[#176249] hover:text-white"
							onclick={() => (duplicate_dialog_open = true)}
							aria-label={`Duplicate ${game.title}`}><Copy size={14} /></button
						></AppTooltip
					>
				{:else}
					<AppTooltip label="Add another location before duplicating"
						><button
							disabled
							class="grid size-8 cursor-not-allowed place-items-center rounded-md border border-[#dfe8e1] text-[#96a89e]"
							aria-label="Add another location before duplicating this game"
							><Copy size={14} /></button
						></AppTooltip
					>
				{/if}
			{/if}
			{#if variant === 'draft'}
				<Dialog.Root bind:open={delete_dialog_open}>
					<AppTooltip label="Delete draft"
						><Dialog.Trigger
							class="grid size-8 place-items-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition hover:border-rose-300 hover:bg-rose-600 hover:text-white"
							aria-label={`Delete ${game.title}`}><Trash2 size={15} /></Dialog.Trigger
						></AppTooltip
					>
					<Dialog.Portal>
						<Dialog.Overlay class="fixed inset-0 z-50 bg-[#123328]/35 backdrop-blur-sm" />
						<Dialog.Content
							class="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rose-100 bg-white p-6 shadow-2xl outline-hidden"
						>
							<Dialog.Title class="font-[Kanit] text-2xl font-medium text-[#183d32]"
								>Delete game?</Dialog.Title
							>
							<Dialog.Description class="mt-2 text-sm text-[#6a7f74]"
								>This permanently deletes “{game.title}”, its rounds, questions, images in the
								database, and any associated game data. This cannot be undone.</Dialog.Description
							>
							<form method="POST" action="?/delete_game" class="mt-6 flex justify-end gap-2">
								<input type="hidden" name="game_id" value={game.id} />
								<Dialog.Close
									class="rounded-md border border-[#d6e1d8] px-4 py-2.5 text-sm font-bold text-[#4b685c]"
									>Cancel</Dialog.Close
								>
								<button
									class="rounded-md bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
									>Delete game</button
								>
							</form>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			{/if}
			{#if game.status === 'SCHEDULED'}
				<AppTooltip label="Delete game"
					><button
						type="button"
						class="grid size-8 cursor-pointer place-items-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition hover:border-rose-300 hover:bg-rose-600 hover:text-white"
						onclick={() => (delete_dialog_open = true)}
						aria-label={`Delete ${game.title}`}><Trash2 size={15} /></button
					></AppTooltip
				>
			{/if}
		</div>
	</div>
	<div class="mt-4 grid gap-2 border-t border-[#edf1ed] pt-4 text-xs text-[#687d73]">
		<span class="flex items-center gap-2"
			><MapPin size={14} class="text-[#3c8b6c]" /> {game.location_name}</span
		>
		<span class="flex items-center gap-2"
			><CalendarDays size={14} class="text-[#3c8b6c]" />
			{format(game.scheduled_at, 'EEE, MMM d · h:mm a')}</span
		>
	</div>
	{#if ['DRAFT', 'SCHEDULED'].includes(game.status)}
		{#if destination_locations.length > 0}<Dialog.Root bind:open={duplicate_dialog_open}>
				<Dialog.Trigger class="hidden"><Copy size={14} /> Duplicate</Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Overlay class="fixed inset-0 z-50 bg-[#123328]/35 backdrop-blur-sm" />
					<Dialog.Content
						class="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#dce7df] bg-white p-6 shadow-2xl outline-hidden"
					>
						<Dialog.Title class="font-[Kanit] text-2xl font-medium text-[#183d32]"
							>Duplicate game</Dialog.Title
						>
						<Dialog.Description class="mt-1 text-sm text-[#6a7f74]"
							>Creates an independent draft with the same rounds and questions. Teams and scores are
							not copied.</Dialog.Description
						>
						<form method="POST" action="?/duplicate_game" class="mt-5 grid gap-4">
							<input type="hidden" name="source_game_id" value={game.id} />
							<label class="grid gap-1.5 text-xs font-bold text-[#315c4d]"
								>Destination location
								<select
									name="location_id"
									class="h-10 rounded-md border border-[#d6e1d8] bg-white px-3 text-sm font-medium text-[#183d32]"
								>
									{#each destination_locations as location}<option value={location.id}
											>{location.name}</option
										>{/each}
								</select>
							</label>
							<div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)]">
								<label class="grid min-w-0 gap-1.5 text-xs font-bold text-[#315c4d]"
									>Title <input
										name="title"
										required
										value={game.title}
										class="h-10 min-w-0 rounded-md border border-[#d6e1d8] px-3 text-sm font-medium text-[#183d32]"
									/></label
								><label class="grid min-w-0 gap-1.5 text-xs font-bold text-[#315c4d]"
									>Schedule date <input
										name="scheduled_at"
										required
										type="datetime-local"
										value={format(game.scheduled_at, "yyyy-MM-dd'T'HH:mm")}
										class="h-10 w-full min-w-0 rounded-md border border-[#d6e1d8] px-3 text-sm font-medium text-[#183d32]"
									/></label
								>
							</div>
							<fieldset>
								<legend class="text-xs font-bold text-[#315c4d]">Standard wagers</legend>
								<div class="mt-1.5 grid w-full max-w-sm grid-cols-3 gap-2">
									{#each game.standard_wager_options as wager, wager_index}
										<label
											class="grid min-w-0 gap-1 text-[.65rem] font-bold tracking-[.06em] text-[#71837a] uppercase"
											>Question {wager_index + 1}
											<input
												name="standard_wager"
												required
												type="number"
												min="0"
												value={wager}
												class="h-10 w-full min-w-0 rounded-md border border-[#d6e1d8] px-2 text-center text-sm font-bold text-[#183d32]"
											/>
										</label>
									{/each}
								</div>
							</fieldset>
							<p class="text-xs text-[#71837a]">
								The copy keeps this game’s {game.standard_question_count}-wager setup. You can
								adjust bonus values in the copied draft.
							</p>
							<div class="mt-1 flex justify-end gap-2">
								<Dialog.Close
									type="button"
									class="rounded-md border border-[#d6e1d8] px-4 py-2.5 text-sm font-bold text-[#4b685c]"
									>Cancel</Dialog.Close
								>
								<button class="rounded-md bg-[#176249] px-4 py-2.5 text-sm font-bold text-white"
									>Create draft</button
								>
							</div>
						</form>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>{/if}
		{#if game.status === 'SCHEDULED'}<Dialog.Root bind:open={delete_dialog_open}>
				<Dialog.Trigger class="hidden"><Trash2 size={14} /> Delete</Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Overlay class="fixed inset-0 z-50 bg-[#123328]/35 backdrop-blur-sm" />
					<Dialog.Content
						class="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rose-100 bg-white p-6 shadow-2xl outline-hidden"
					>
						<Dialog.Title class="font-[Kanit] text-2xl font-medium text-[#183d32]"
							>Delete game?</Dialog.Title
						>
						<Dialog.Description class="mt-2 text-sm text-[#6a7f74]"
							>This permanently deletes “{game.title}”, its rounds, questions, images in the
							database, and any associated game data. This cannot be undone.</Dialog.Description
						>
						<form method="POST" action="?/delete_game" class="mt-6 flex justify-end gap-2">
							<input type="hidden" name="game_id" value={game.id} />
							<Dialog.Close
								class="rounded-md border border-[#d6e1d8] px-4 py-2.5 text-sm font-bold text-[#4b685c]"
								>Cancel</Dialog.Close
							>
							<button
								class="rounded-md bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
								>Delete game</button
							>
						</form>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>{/if}
	{/if}
</article>
