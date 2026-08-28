<script lang="ts">
	import { enhance } from '$app/forms';
	import { Combobox, Dialog } from 'bits-ui';
	import { Check, CirclePlus, Trash2, X } from '@lucide/svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Tooltip as AppTooltip } from '$lib/components/ui';
	import { toast } from '$lib/toast.svelte';
	import ScorecardProgress from './ScorecardProgress.svelte';
	import ManageScoresDialog from './ManageScoresDialog.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let selected_wagers = $state<Record<string, number>>({});
	let final_wager_drafts = $state<Record<string, string>>({});
	let selected_saved_team_id = $state('');
	let saved_team_search = $state('');
	let is_saved_team_search_open = $state(false);
	let saved_team_form = $state<HTMLFormElement | null>(null);
	let new_team_input = $state<HTMLInputElement | null>(null);
	let saved_team_viewport = $state<HTMLElement | null>(null);
	let saved_team_scroll_thumb = $state({ top: 0, height: 0, visible: false });
	let filtered_saved_teams = $derived(
		data.available_teams.filter((team) =>
			team.name.toLowerCase().includes(saved_team_search.trim().toLowerCase())
		)
	);
	let current_is_standard = $derived(data.current_round?.round_type === 'STANDARD');
	let current_is_halftime = $derived(data.current_round?.round_type === 'HALFTIME');
	let current_is_final = $derived(data.current_round?.round_type === 'FINAL');
	let current_is_tiebreaker = $derived(data.current_round?.round_type === 'TIEBREAKER');
	let scorecard_filter = $state<'ALL' | 'NEEDS_SCORING'>('ALL');
	let team_search_query = $state('');
	let current_scorecards = $derived(
		current_is_tiebreaker ? data.tiebreaker_scorecards : data.scorecards
	);
	let unscored_team_count = $derived(
		current_scorecards.filter((entry) =>
			current_is_tiebreaker ? !entry.current_tiebreaker_submission : !entry.current_submission
		).length
	);
	let visible_scorecards = $derived(
		scorecard_filter === 'NEEDS_SCORING'
			? current_scorecards.filter((entry) =>
					current_is_tiebreaker ? !entry.current_tiebreaker_submission : !entry.current_submission
				)
			: current_scorecards
	);
	let displayed_scorecards = $derived(
		visible_scorecards.filter((entry) =>
			entry.team.name.toLowerCase().includes(team_search_query.trim().toLowerCase())
		)
	);

	function select_wager(team_id: string, wager: number) {
		selected_wagers[team_id] = wager;
	}
	function final_wager_value(team_id: string, saved_wager: number | null) {
		return final_wager_drafts[team_id] ?? saved_wager?.toString() ?? '';
	}
	function standard_wager_value(team_id: string, saved_wager: number | null) {
		return selected_wagers[team_id] ?? saved_wager;
	}
	function notify_presentation() {
		const channel = new BroadcastChannel(`clover-host-${data.game.id}`);
		channel.postMessage('scores-updated');
		channel.close();
	}
	function show_action_error(data: unknown, fallback: string) {
		const message =
			typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
				? data.message
				: fallback;
		toast.error(message);
	}
	const score_enhance: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type !== 'success') {
				show_action_error(
					result.type === 'failure' ? result.data : undefined,
					'Could not update the score.'
				);
				return;
			}
			selected_wagers = {};
			notify_presentation();
		};
	};
	const team_enhance: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: true });
			if (result.type !== 'success') {
				show_action_error(
					result.type === 'failure' ? result.data : undefined,
					'Could not add the team.'
				);
				return;
			}
			selected_saved_team_id = '';
			saved_team_search = '';
			is_saved_team_search_open = false;
			notify_presentation();
		};
	};
	const create_team_enhance: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: result.type === 'success' });
			if (result.type !== 'success') {
				show_action_error(
					result.type === 'failure' ? result.data : undefined,
					'Could not add the team.'
				);
				return;
			}
			notify_presentation();
			requestAnimationFrame(() => new_team_input?.focus());
		};
	};
	const previous_teams_enhance: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type !== 'success') {
				show_action_error(
					result.type === 'failure' ? result.data : undefined,
					'Could not add teams from the previous game.'
				);
				return;
			}
			notify_presentation();
			toast.success('Added teams from the previous game.');
		};
	};
	const remove_team_enhance: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type !== 'success') {
				show_action_error(
					result.type === 'failure' ? result.data : undefined,
					'Could not remove the team.'
				);
				return;
			}
			notify_presentation();
			toast.success('Team removed from this game.');
		};
	};
	function add_saved_team(team_id: string) {
		selected_saved_team_id = team_id;
		is_saved_team_search_open = false;
		requestAnimationFrame(() => saved_team_form?.requestSubmit());
	}
	function add_matching_saved_team() {
		const search = saved_team_search.trim().toLocaleLowerCase();
		const exact_match = filtered_saved_teams.find(
			(team) => team.name.trim().toLocaleLowerCase() === search
		);
		const team = exact_match ?? filtered_saved_teams[0];
		if (team) add_saved_team(team.id);
	}
	function update_saved_team_scroll_thumb() {
		const viewport = saved_team_viewport;
		if (!viewport) return;
		const overflow = viewport.scrollHeight - viewport.clientHeight;
		const track_height = viewport.clientHeight - 24;
		const height = Math.max(20, (viewport.clientHeight / viewport.scrollHeight) * track_height);
		saved_team_scroll_thumb = {
			top: overflow > 0 ? (viewport.scrollTop / overflow) * (track_height - height) : 0,
			height,
			visible: overflow > 1
		};
	}
	$effect(() => {
		filtered_saved_teams.length;
		is_saved_team_search_open;
		requestAnimationFrame(update_saved_team_scroll_thumb);
	});
</script>

<section class="mt-8 rounded-2xl border border-[#dce7df] bg-white p-5 shadow-sm md:p-6">
	<div
		class="flex flex-col gap-4 border-b border-[#e8eee9] pb-5 sm:flex-row sm:items-end sm:justify-between"
	>
		<div>
			<p class="text-[.7rem] font-extrabold tracking-[.12em] text-[#238061] uppercase">
				Scorecards
			</p>
			<h2 class="mt-1 font-[Kanit] text-3xl font-medium tracking-[-.03em]">Teams in this game</h2>
		</div>
		<div class="flex flex-wrap gap-2">
			{#if data.previous_game}
				<form use:enhance={previous_teams_enhance} method="POST" action="?/add_previous_teams">
					<button
						disabled={data.previous_game.available_team_count === 0}
						class="inline-flex h-9 items-center gap-1 rounded-md border border-[#c8ddce] px-3 text-xs font-bold text-[#246d52] hover:bg-[#f2f8f3] disabled:cursor-not-allowed disabled:opacity-40"
					>
						Add {data.previous_game.available_team_count} from last game
					</button>
				</form>
			{/if}
			<form
				bind:this={saved_team_form}
				use:enhance={team_enhance}
				method="POST"
				action="?/add_team"
			>
				<Combobox.Root
					type="single"
					name="team_id"
					items={data.available_teams.map((team) => ({ value: team.id, label: team.name }))}
					bind:value={selected_saved_team_id}
					bind:open={is_saved_team_search_open}
					disabled={!data.available_teams.length}
				>
					<Combobox.Input
						placeholder={data.available_teams.length ? 'Add saved team…' : 'No saved teams'}
						oninput={(event) => (saved_team_search = event.currentTarget.value)}
						onkeydown={(event) => {
							if (event.key !== 'Enter') return;
							event.preventDefault();
							add_matching_saved_team();
						}}
						onfocus={() => (is_saved_team_search_open = true)}
						class="h-9 w-44 rounded-md border border-[#d8e4db] bg-white px-3 text-xs outline-none focus:border-[#238061] focus:ring-2 focus:ring-[#238061]/15 disabled:bg-[#f5f7f5]"
					/>
					<Combobox.Portal>
						<Combobox.Content
							sideOffset={6}
							class="relative z-50 max-h-56 w-56 overflow-hidden rounded-lg border border-[#d8e4db] bg-white p-1 shadow-lg"
						>
							<div
								bind:this={saved_team_viewport}
								onscroll={update_saved_team_scroll_thumb}
								class="max-h-54 [scrollbar-width:none] overflow-y-auto pr-3 [&::-webkit-scrollbar]:hidden"
							>
								<Combobox.Viewport>
									{#each filtered_saved_teams as team}<Combobox.Item
											value={team.id}
											label={team.name}
											class="block cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-[#315c4d] outline-none data-[highlighted]:bg-[#eff8f1] data-[selected]:bg-[#dff1e4]"
											onclick={() => add_saved_team(team.id)}>{team.name}</Combobox.Item
										>{/each}
									{#if !filtered_saved_teams.length}<p class="px-3 py-2 text-sm text-[#71837a]">
											No teams match that search.
										</p>{/if}
								</Combobox.Viewport>
							</div>
							{#if saved_team_scroll_thumb.visible}<div
									aria-hidden="true"
									class="pointer-events-none absolute top-3 right-1.5 bottom-3 w-1 rounded-full bg-[#edf4ee]"
								>
									<div
										class="w-full rounded-full bg-[#8fac99]"
										style={`height: ${saved_team_scroll_thumb.height}px; transform: translateY(${saved_team_scroll_thumb.top}px)`}
									></div>
								</div>{/if}
						</Combobox.Content>
					</Combobox.Portal>
				</Combobox.Root>
			</form>
			<form use:enhance={create_team_enhance} method="POST" action="?/add_team" class="flex gap-2">
				<input
					bind:this={new_team_input}
					required
					name="team_name"
					placeholder="New team name"
					class="h-9 w-36 rounded-md border border-[#d8e4db] px-3 text-xs"
				/><button
					class="inline-flex h-9 items-center gap-1 rounded-md bg-[#176249] px-3 text-xs font-bold text-white"
					><CirclePlus size={14} /> Create & add</button
				>
			</form>
		</div>
	</div>
	<div class="mt-4 flex flex-wrap items-center gap-3">
		<ManageScoresDialog {data} />
	</div>

	{#if !data.session.is_started}<p class="py-8 text-center text-sm text-[#71837a]">
			Start the game to begin scoring answers.
		</p>{:else}
		{#if data.current_question}<ScorecardProgress
				total={current_scorecards.length}
				remaining={unscored_team_count}
				filter={scorecard_filter}
				onfilterchange={(filter) => (scorecard_filter = filter)}
				team_search={team_search_query}
				onteamsearchchange={(search) => (team_search_query = search)}
			/>{/if}
		{#if displayed_scorecards.length > 0}<div class="mt-4 grid gap-4 lg:grid-cols-3">
				{#each displayed_scorecards as entry (entry.team.id)}
					{@const needs_scoring = current_is_tiebreaker
						? !entry.current_tiebreaker_submission
						: !entry.current_submission}
					<article
						class="rounded-xl border p-3 transition-colors {data.current_question && needs_scoring
							? 'border-[#d5b86a] bg-white'
							: 'border-[#e1e9e3] bg-white'}"
					>
						<div class="flex items-center justify-between">
							<div>
								<h3 class="font-[Kanit] text-lg font-medium">{entry.team.name}</h3>
								{#if data.current_question}<p
										class="mt-0.5 text-[.62rem] font-extrabold tracking-[.09em] uppercase {needs_scoring
											? 'text-[#936b19]'
											: 'text-emerald-700'}"
									>
										{needs_scoring ? 'Needs scoring' : 'Scored'}
									</p>{/if}
							</div>
							<div class="flex items-center gap-2">
								<Dialog.Root>
									<Dialog.Trigger
										class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-bold text-[#71837a] transition hover:bg-rose-50 hover:text-rose-700"
									>
										<X size={15} /> Remove
									</Dialog.Trigger>
									<Dialog.Portal>
										<Dialog.Overlay class="fixed inset-0 z-50 bg-[#123328]/35 backdrop-blur-sm" />
										<Dialog.Content
											class="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#dce7df] bg-white p-6 shadow-2xl outline-hidden"
										>
											<Dialog.Title class="font-[Kanit] text-2xl font-medium text-[#183d32]"
												>Remove <span class="text-[#176249]">{entry.team.name}</span>?</Dialog.Title
											>
											<Dialog.Description class="mt-2 text-sm leading-6 text-[#6a7f74]">
												{#if entry.submission_count > 0}
													This team has {entry.submission_count} saved
													{entry.submission_count === 1 ? 'submission' : 'submissions'} for this game.
													Removing the team will permanently delete them from this game’s scores.
												{:else}
													This removes the team from this game’s scorecards. The saved team will
													remain available for future games.
												{/if}
											</Dialog.Description>
											<div class="mt-6 flex justify-end gap-2">
												<Dialog.Close
													class="rounded-md border border-[#d6e1d8] px-4 py-2.5 text-sm font-bold text-[#4b685c] hover:bg-[#f5f8f5]"
													>Cancel</Dialog.Close
												>
												<form
													use:enhance={remove_team_enhance}
													method="POST"
													action="?/remove_team"
												>
													<input type="hidden" name="team_id" value={entry.team.id} />
													<button
														type="submit"
														class="rounded-md bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
													>
														Remove team
													</button>
												</form>
											</div>
										</Dialog.Content>
									</Dialog.Portal>
								</Dialog.Root>
								{#if data.current_question && !needs_scoring}
									<form use:enhance={score_enhance} method="POST" action="?/clear_score">
										<input type="hidden" name="team_id" value={entry.team.id} />
										<input type="hidden" name="question_id" value={data.current_question.id} />
										<AppTooltip label="Clear score">
											<button
												type="submit"
												aria-label={`Clear ${entry.team.name}'s score for this question`}
												class="grid size-7 place-items-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-600 hover:text-white"
												><Trash2 size={14} /></button
											>
										</AppTooltip>
									</form>
								{/if}
								<strong class="font-[Kanit] text-xl text-[#1d684e]">{entry.points}</strong>
							</div>
						</div>
						{#if data.current_question && current_is_standard}<div
								class="mt-3 border-t border-[#edf1ed] pt-3"
							>
								{#if entry.current_submission}<div
										class="flex flex-wrap items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800"
									>
										<span class="text-emerald-700">Saved</span>
										<span class="rounded bg-white px-2 py-1 text-[#246d52]"
											>{entry.current_submission.wager} pts</span
										>
										<span
											class="inline-flex items-center gap-1 {entry.current_submission
												.is_correct_primary
												? 'text-emerald-700'
												: 'text-rose-700'}"
											>{#if entry.current_submission.is_correct_primary}<Check size={14} /> Correct{:else}<X
													size={14}
												/> Incorrect{/if}</span
										>
										<span
											>{entry.current_submission.points_awarded > 0 ? '+' : ''}{entry
												.current_submission.points_awarded} pts</span
										>
									</div>{/if}
								<div class="mt-2 flex flex-wrap gap-1.5">
									{#each data.game.standard_wager_options as wager}<button
											type="button"
											disabled={entry.used_wagers.includes(wager)}
											onclick={() => select_wager(entry.team.id, wager)}
											class="rounded-md border px-3 py-1.5 text-xs font-bold {selected_wagers[
												entry.team.id
											] === wager ||
											(selected_wagers[entry.team.id] === undefined &&
												entry.current_submission?.wager === wager)
												? 'border-[#176249] bg-[#176249] text-white'
												: 'border-[#d6e1d8] text-[#315c4d]'} disabled:cursor-not-allowed disabled:opacity-35"
											>{wager}</button
										>{/each}
									{#if data.current_question!.question_type === 'TWO_PART_BONUS'}
										<label
											class="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800"
											><input
												type="checkbox"
												name="bonus_correct"
												value="true"
												form={`standard-score-${entry.team.id}-${data.current_question!.id}`}
												checked={entry.current_submission?.is_correct_bonus ?? false}
											/>
											+{data.current_question!.bonus_points_value} bonus</label
										>
									{/if}
									<form
										id={`standard-score-${entry.team.id}-${data.current_question!.id}`}
										use:enhance={score_enhance}
										method="POST"
										action="?/score"
										class="ml-auto inline-flex gap-1"
									>
										<input type="hidden" name="team_id" value={entry.team.id} /><input
											type="hidden"
											name="question_id"
											value={data.current_question!.id}
										/><input
											type="hidden"
											name="wager"
											value={standard_wager_value(
												entry.team.id,
												entry.current_submission?.wager ?? null
											) ?? ''}
										/><button
											name="correct"
											value="true"
											disabled={!standard_wager_value(
												entry.team.id,
												entry.current_submission?.wager ?? null
											) ||
												entry.used_wagers.includes(
													standard_wager_value(
														entry.team.id,
														entry.current_submission?.wager ?? null
													)!
												)}
											aria-label="Mark correct"
											class="grid size-8 place-items-center rounded-md border font-bold disabled:opacity-35 {entry
												.current_submission?.is_correct_primary
												? 'border-emerald-600 bg-emerald-600 text-white'
												: 'border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50'}"
											><Check size={16} /></button
										><button
											name="correct"
											value="false"
											disabled={!standard_wager_value(
												entry.team.id,
												entry.current_submission?.wager ?? null
											) ||
												entry.used_wagers.includes(
													standard_wager_value(
														entry.team.id,
														entry.current_submission?.wager ?? null
													)!
												)}
											aria-label="Mark incorrect"
											class="grid size-8 place-items-center rounded-md border font-bold disabled:opacity-35 {!entry
												.current_submission?.is_correct_primary && entry.current_submission
												? 'border-rose-600 bg-rose-600 text-white'
												: 'border-rose-600 bg-white text-rose-700 hover:bg-rose-50'}"
											><X size={16} /></button
										>
									</form>
								</div>
							</div>
						{:else if current_is_halftime}<form
								use:enhance={score_enhance}
								method="POST"
								action="?/score"
								class="mt-3 flex flex-wrap items-end gap-2 border-t border-[#edf1ed] pt-3"
							>
								<input type="hidden" name="team_id" value={entry.team.id} /><input
									type="hidden"
									name="question_id"
									value={data.current_question!.id}
								/><input type="hidden" name="correct" value="true" />
								{#if entry.current_submission}<div
										class="w-full rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
									>
										Already scored · {entry.current_submission.items_correct}/{data
											.current_question!.max_items} correct · {entry.current_submission
											.points_awarded} points
									</div>{/if}
								<div class="flex w-full items-end gap-2">
									<label class="text-xs font-semibold"
										>Correct items <input
											name="items_correct"
											type="number"
											min="0"
											max={data.current_question!.max_items}
											value={entry.current_submission?.items_correct ?? 0}
											class="mt-1 block h-9 w-20 rounded-md border border-[#d6e1d8] px-2"
										/></label
									><button
										aria-label={entry.current_submission
											? 'Update halftime score'
											: 'Save halftime score'}
										class="ml-auto grid size-9 cursor-pointer place-items-center rounded-md border border-emerald-600 bg-white text-emerald-700 transition-colors hover:bg-emerald-50"
										><Check size={17} /></button
									>
								</div>
							</form>
						{:else if current_is_final}<form
								use:enhance={score_enhance}
								method="POST"
								action="?/score"
								class="mt-3 flex flex-wrap items-end gap-2 border-t border-[#edf1ed] pt-3"
							>
								<input type="hidden" name="team_id" value={entry.team.id} /><input
									type="hidden"
									name="question_id"
									value={data.current_question!.id}
								/>{#if entry.current_submission}<div
										class="flex w-full flex-wrap items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800"
									>
										<span class="text-emerald-700">Saved</span>
										<span class="rounded bg-white px-2 py-1 text-[#246d52]"
											>{entry.current_submission.wager} pts</span
										>
										<span
											class="inline-flex items-center gap-1 {entry.current_submission
												.is_correct_primary
												? 'text-emerald-700'
												: 'text-rose-700'}"
											>{#if entry.current_submission.is_correct_primary}<Check size={14} /> Correct{:else}<X
													size={14}
												/> Incorrect{/if}</span
										>
										<span
											>{entry.current_submission.points_awarded > 0 ? '+' : ''}{entry
												.current_submission.points_awarded} pts</span
										>
									</div>{/if}
								<div class="flex w-full items-end gap-2">
									<label class="text-xs font-semibold"
										>Wager <input
											required
											name="wager"
											type="number"
											min={data.current_round?.min_wager ?? 0}
											max={data.current_round?.max_wager ?? 50}
											value={final_wager_value(
												entry.team.id,
												entry.current_submission?.wager ?? null
											)}
											oninput={(event) =>
												(final_wager_drafts[entry.team.id] = event.currentTarget.value)}
											class="mt-1 block h-9 w-20 rounded-md border border-[#d6e1d8] px-2"
										/></label
									>
									<div class="ml-auto inline-flex gap-1.5">
										<button
											name="correct"
											value="true"
											aria-label="Mark final answer correct"
											class="grid size-9 cursor-pointer place-items-center rounded-md border border-emerald-600 font-bold transition-colors {entry
												.current_submission?.is_correct_primary
												? 'bg-emerald-600 text-white'
												: 'bg-white text-emerald-700 hover:bg-emerald-50'}"
										>
											<Check size={17} />
										</button>
										<button
											name="correct"
											value="false"
											aria-label="Mark final answer incorrect"
											class="grid size-9 cursor-pointer place-items-center rounded-md border border-rose-600 font-bold transition-colors {entry.current_submission &&
											!entry.current_submission.is_correct_primary
												? 'bg-rose-600 text-white'
												: 'bg-white text-rose-700 hover:bg-rose-50'}"
										>
											<X size={17} />
										</button>
									</div>
								</div>
							</form>
						{:else if current_is_tiebreaker}<form
								use:enhance={score_enhance}
								method="POST"
								action="?/tiebreaker"
								class="mt-3 flex flex-wrap items-end gap-2 border-t border-[#edf1ed] pt-3"
							>
								<input type="hidden" name="team_id" value={entry.team.id} /><input
									type="hidden"
									name="question_id"
									value={data.current_question!.id}
								/>{#if entry.current_tiebreaker_submission}<div
										class="w-full rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
									>
										Submission recorded: {entry.current_tiebreaker_submission.submitted_answer}
									</div>{/if}
								<div class="flex w-full items-end gap-2">
									<label class="text-xs font-semibold"
										>Numeric answer <input
											required
											name="submitted_answer"
											type="number"
											step="any"
											value={entry.current_tiebreaker_submission?.submitted_answer ?? ''}
											class="mt-1 block h-9 w-28 rounded-md border border-[#d6e1d8] px-2"
										/></label
									><button
										aria-label={entry.current_tiebreaker_submission
											? 'Update tiebreaker submission'
											: 'Record tiebreaker submission'}
										class="ml-auto grid size-9 cursor-pointer place-items-center rounded-md border border-emerald-600 transition-colors {entry.current_tiebreaker_submission
											? 'bg-emerald-600 text-white hover:bg-emerald-700'
											: 'bg-white text-emerald-700 hover:bg-emerald-50'}"
										><Check size={17} /></button
									>
								</div>
							</form>{/if}
					</article>{/each}
			</div>{:else if team_search_query.trim()}<div
				class="mt-4 rounded-xl border border-dashed border-[#cfded2] bg-[#f8fbf8] px-4 py-8 text-center"
			>
				<p class="text-sm font-semibold text-[#315c4d]">No teams match that search.</p>
			</div>{:else if data.current_question}<div
				class="mt-4 rounded-xl border border-dashed border-[#cfded2] bg-[#f8fbf8] px-4 py-8 text-center"
			>
				<p class="text-sm font-semibold text-[#315c4d]">Every team is scored for this question.</p>
				<button
					type="button"
					onclick={() => (scorecard_filter = 'ALL')}
					class="mt-2 text-xs font-bold text-[#176249] underline decoration-[#9bc9ac] underline-offset-4 hover:text-[#0e4c36]"
					>Show all teams</button
				>
			</div>{/if}{/if}
</section>
