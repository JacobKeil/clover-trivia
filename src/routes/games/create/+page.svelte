<script lang="ts">
	import { enhance } from '$app/forms';
	import { ChevronDown, Trash2 } from '@lucide/svelte';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';

	import {
		StandardRoundForm,
		HalftimeQuestionForm,
		FinalQuestionForm,
		TiebreakerQuestionForm
	} from '$lib/components/forms';

	import {
		CategoryCreateDialog,
		LocationSelect,
		QuestionSearchDialog,
		RoundDeleteDialog
	} from '$lib/components/ui';

	import type { CreateGameForm, QuestionSetup, QuestionCategory } from '$lib/game-builder-types';
	import { validate_game_rounds, type RoundValidationErrors } from '$lib/game-builder-validation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let form_state = $state<CreateGameForm>({
		name: '',
		location_id: '',
		scheduled_at: new Date(),
		standard_question_count: 3,
		standard_wager_options: [5, 10, 15],
		new_categories: [],
		rounds: []
	});

	let global_wagers = $state<number[]>([5, 10, 15, 20, 25]);
	let is_submitting = $state(false);
	let error_message = $state<string | null>(null);
	let open_rounds = $state<Record<number, boolean>>({});
	let round_errors = $state<RoundValidationErrors>({});
	let is_delete_round_dialog_open = $state(false);
	let pending_round_index = $state<number | null>(null);
	let is_question_search_open = $state(false);

	// Category creation dialog state managed cleanly
	let is_category_dialog_open = $state(false);
	let new_category_name = $state('');
	let target_question_ref = $state<{ round_idx: number; q_idx: number } | null>(null);

	let selected_location = $derived(
		data.locations?.find((loc) => loc.id === form_state.location_id)
	);

	let has_rounds = $derived(form_state.rounds.length > 0);

	let location_options = $derived(
		(data.locations ?? []).map((loc) => ({
			label: loc.name,
			value: loc.id
		}))
	);

	let combined_categories = $derived<QuestionCategory[]>([
		...(data.categories ?? []).map((cat) => ({
			id: cat.id,
			name: cat.name
		})),
		...form_state.new_categories
	]);

	let category_options = $derived(
		[...combined_categories]
			.sort((first, second) =>
				first.name.localeCompare(second.name, undefined, { sensitivity: 'base' })
			)
			.map((cat) => ({
				label: cat.name,
				value: cat.id
			}))
	);

	function open_add_category_dialog(round_idx: number, q_idx: number) {
		target_question_ref = { round_idx, q_idx };
		new_category_name = '';
		is_category_dialog_open = true;
	}

	function handle_create_category() {
		const name = new_category_name.trim();
		if (!name) return;
		const existing_category = combined_categories.find(
			(category) => category.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
		);
		if (existing_category) {
			if (target_question_ref) {
				const { round_idx, q_idx } = target_question_ref;
				if (form_state.rounds[round_idx]?.questions[q_idx]) {
					form_state.rounds[round_idx].questions[q_idx].category_id = existing_category.id;
					form_state.rounds = [...form_state.rounds];
				}
			}
			is_category_dialog_open = false;
			target_question_ref = null;
			return;
		}

		const temp_id = `temp_cat_${Date.now()}`;
		const new_cat: QuestionCategory = { id: temp_id, name, is_new: true };

		form_state.new_categories.push(new_cat);

		if (target_question_ref) {
			const { round_idx, q_idx } = target_question_ref;
			if (form_state.rounds[round_idx]?.questions[q_idx]) {
				form_state.rounds[round_idx].questions[q_idx].category_id = temp_id;
				form_state.rounds = [...form_state.rounds];
			}
		}

		is_category_dialog_open = false;
		target_question_ref = null;
	}

	function go_to_create_location() {
		window.location.assign('/locations/create');
	}

	function create_blank_questions(count: number): QuestionSetup[] {
		return Array.from({ length: count }, (_, i) => ({
			question_number: i + 1,
			question_type: 'SINGLE',
			question_text: '',
			answer: '',
			image_file: null,
			max_items: 1,
			category_id: undefined,
			bonus_points: null,
			song_name: '',
			song_artist: '',
			notes: ''
		}));
	}

	function focus_new_round(round_idx: number) {
		let new_open_state: Record<number, boolean> = {};

		// Loop through all existing rounds and explicitly set them to false
		form_state.rounds.forEach((_, idx) => {
			new_open_state[idx] = false;
		});

		// Set only the newly added round to true
		new_open_state[round_idx] = true;

		// Assign back to trigger Svelte 5 reactivity
		open_rounds = new_open_state;
	}

	function update_round_numbering() {
		let standard_counter = 0;
		form_state.rounds.forEach((rd, i) => {
			rd.round_number = i + 1;
			if (rd.round_type === 'STANDARD') {
				standard_counter++;
				rd.name = `Round ${standard_counter}`;
			} else if (rd.round_type === 'HALFTIME') {
				rd.name = 'Halftime Question';
			} else if (rd.round_type === 'FINAL') {
				rd.name = 'Final Question';
			} else if (rd.round_type === 'TIEBREAKER') {
				rd.name = 'Tiebreaker Question';
			}
		});
	}

	function add_standard_round() {
		if (!selected_location) return;
		const count = form_state.standard_question_count;
		const new_idx = form_state.rounds.length;

		const active_wagers = form_state.standard_wager_options;

		form_state.rounds.push({
			round_number: 0,
			name: '',
			round_type: 'STANDARD',
			points_type: 'WAGER',
			wager_options: active_wagers,
			questions: create_blank_questions(count)
		});

		update_round_numbering();
		focus_new_round(new_idx);
	}

	function add_halftime_round() {
		if (!selected_location) return;
		const new_idx = form_state.rounds.length;

		form_state.rounds.push({
			round_number: 0,
			name: '',
			round_type: 'HALFTIME',
			points_type: 'STATIC',
			wager_options: [],
			questions: [
				{
					question_number: 1,
					question_type: 'SINGLE',
					question_text: '',
					answer: '',
					image_file: null,
					max_items: 5,
					points_per_item: 5,
					answer_items: Array.from({ length: 5 }, () => ''),
					category_id: undefined,
					bonus_points: null,
					song_name: '',
					song_artist: '',
					notes: ''
				}
			]
		});

		update_round_numbering();
		focus_new_round(new_idx);
	}

	function add_final_round() {
		if (!selected_location) return;
		const new_idx = form_state.rounds.length;

		form_state.rounds.push({
			round_number: 0,
			name: '',
			round_type: 'FINAL',
			points_type: 'RANGE',
			wager_options: [],
			questions: create_blank_questions(1)
		});

		update_round_numbering();
		focus_new_round(new_idx);
	}

	function add_tiebreaker_round() {
		if (!selected_location) return;
		const new_idx = form_state.rounds.length;

		form_state.rounds.push({
			round_number: 0,
			name: '',
			round_type: 'TIEBREAKER',
			points_type: 'STATIC',
			wager_options: [],
			questions: [
				{
					question_number: 1,
					question_type: 'SINGLE',
					question_text: '',
					answer: '',
					image_file: null,
					max_items: 1,
					numeric_answer: null,
					category_id: undefined,
					bonus_points: null,
					song_name: '',
					song_artist: '',
					notes: ''
				}
			]
		});

		update_round_numbering();
		focus_new_round(new_idx);
	}

	function remove_round(index: number) {
		form_state.rounds.splice(index, 1);
		update_round_numbering();
	}

	function request_round_removal(index: number) {
		pending_round_index = index;
		is_delete_round_dialog_open = true;
	}

	function confirm_round_removal() {
		if (pending_round_index !== null) remove_round(pending_round_index);
		pending_round_index = null;
		is_delete_round_dialog_open = false;
	}
</script>

<svelte:head>
	<title>Create Game {form_state.name.length > 0 ? `- ${form_state.name}` : ''}</title>
</svelte:head>

<section class="mx-auto my-8 flex max-w-5xl flex-col space-y-8 text-secondary">
	<div class="border-b border-secondary/10 pb-4">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-primary-dark">Create New Game</h1>
				<p class="mt-1 text-sm text-secondary/80">
					Set your game details, lock in a venue, and compose your questions and wagers.
				</p>
			</div>
			<QuestionSearchDialog bind:open={is_question_search_open} />
		</div>
	</div>

	<form
		method="POST"
		action="?/create"
		enctype="multipart/form-data"
		use:enhance={({ formData, cancel }) => {
			const validation_errors = validate_game_rounds(form_state.rounds);
			round_errors = validation_errors;
			const first_invalid_round = Object.keys(validation_errors)[0];
			if (first_invalid_round !== undefined) {
				open_rounds = { ...open_rounds, [Number(first_invalid_round)]: true };
				error_message = 'Finish the highlighted round fields before saving.';
				cancel();
				return;
			}
			is_submitting = true;
			error_message = null;

			form_state.standard_question_count = selected_location?.default_question_count ?? 3;
			form_state.standard_wager_options = global_wagers.slice(
				0,
				form_state.standard_question_count
			);
			form_state.rounds.forEach((round, round_idx) =>
				round.questions.forEach((question, question_idx) => {
					if (question.image_file)
						formData.set(`question_image_${round_idx}_${question_idx}`, question.image_file);
				})
			);
			const rounds_payload = form_state.rounds.map((round) => ({
				...round,
				questions: round.questions.map(({ image_file, ...question }) => question)
			}));
			formData.set('rounds', JSON.stringify(rounds_payload));
			formData.set('new_categories', JSON.stringify(form_state.new_categories));
			formData.set('standard_question_count', form_state.standard_question_count.toString());
			formData.set('standard_wager_options', JSON.stringify(form_state.standard_wager_options));

			return async ({ result, update }) => {
				is_submitting = false;
				if (result.type === 'failure') {
					error_message = (result.data?.message as string) || 'Failed to create game.';
				} else {
					await update();
				}
			};
		}}
		class="flex flex-col space-y-8"
	>
		<div class="bg-surface-100/80 space-y-6 rounded-xl backdrop-blur-xs">
			<h2 class="text-surface-content/60 text-xl font-bold">1. Game Information</h2>

			<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
				<div class="flex flex-col space-y-1">
					<label for="name" class="text-surface-content/80 text-xs font-semibold">Game Name *</label
					>
					<input
						required
						id="name"
						name="name"
						type="text"
						placeholder="e.g. Tuesday Pub Trivia #42"
						class="bg-surface-100 text-surface-content h-9 w-full rounded-md border border-secondary/20 px-3 text-xs shadow-xs focus:border-primary focus:outline-hidden"
						bind:value={form_state.name}
					/>
				</div>

				<div class="relative flex flex-col space-y-1">
					<label for="location_id" class="text-surface-content/80 text-xs font-semibold"
						>Select Location *</label
					>
					<LocationSelect
						bind:value={form_state.location_id}
						options={location_options}
						placeholder={has_rounds ? 'Location locked' : 'Choose venue...'}
						disabled={has_rounds}
						on_create_location={go_to_create_location}
					/>

					<input type="hidden" name="location_id" value={form_state.location_id} />

					{#if has_rounds}
						<span class="text-[11px] font-semibold text-amber-600">
							🔒 Location locked while rounds exist
						</span>
					{/if}
				</div>

				<div class="flex flex-col space-y-1">
					<label for="scheduled_at" class="text-surface-content/80 text-xs font-semibold"
						>Scheduled Date *</label
					>
					<input
						required
						id="scheduled_at"
						name="scheduled_at"
						type="datetime-local"
						class="bg-surface-100 text-surface-content h-9 w-full rounded-md border border-secondary/20 px-3 text-xs shadow-xs focus:border-primary focus:outline-hidden"
						value={form_state.scheduled_at instanceof Date &&
						!isNaN(form_state.scheduled_at.getTime())
							? new Date(
									form_state.scheduled_at.getTime() -
										form_state.scheduled_at.getTimezoneOffset() * 60000
								)
									.toISOString()
									.slice(0, 16)
							: ''}
						oninput={(e) => {
							const val = (e.target as HTMLInputElement).value;
							if (!val) {
								form_state.scheduled_at = new Date();
								return;
							}
							form_state.scheduled_at = new Date(val);
						}}
					/>
				</div>
			</div>

			{#if selected_location}
				<div>
					<h4 class="text-surface-content/50 mb-2 text-[11px] font-bold tracking-wider uppercase">
						Global Standard Round Wager Point Options ({selected_location.default_question_count ??
							3} Questions)
					</h4>
					<div class="flex flex-wrap items-center gap-2">
						{#each Array(selected_location.default_question_count ?? 3) as _, w_idx}
							<input
								type="number"
								min="1"
								max="100"
								class="bg-surface-100 text-surface-content/70 h-9 w-18 rounded-md border border-secondary/20 px-3 text-center text-xs font-bold shadow-xs focus:border-primary focus:outline-hidden {has_rounds
									? 'opacity-50'
									: 'opacity-100'}"
								bind:value={global_wagers[w_idx]}
								disabled={has_rounds}
							/>
						{/each}
						<span class="text-surface-content/50 ml-2 text-[11px]">
							(These point values automatically apply to newly added Standard rounds)
						</span>
					</div>
					{#if has_rounds}
						<span class="text-[11px] font-semibold text-amber-600">
							🔒 Wagers locked while rounds exist
						</span>
					{/if}
				</div>
			{/if}
		</div>

		<div class="flex flex-col space-y-5">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 class="text-surface-content/60 text-xl font-bold">2. Rounds & Questions</h2>
					<p class="text-surface-content/60 text-xs">
						{#if !selected_location}
							<span class="font-medium text-amber-600"
								>Choose a location above to enable round builder.</span
							>
						{:else}
							Default questions per standard round: <strong
								>{selected_location.default_question_count ?? 3}</strong
							>
						{/if}
					</p>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						disabled={!selected_location}
						onclick={add_standard_round}
						class="cursor-pointer rounded-md bg-blue-400 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-40"
					>
						+ Standard Round
					</button>
					<button
						type="button"
						disabled={!selected_location}
						onclick={add_halftime_round}
						class="cursor-pointer rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40"
					>
						+ Halftime
					</button>
					<button
						type="button"
						disabled={!selected_location}
						onclick={add_final_round}
						class="cursor-pointer rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40"
					>
						+ Final
					</button>
					<button
						type="button"
						disabled={!selected_location}
						onclick={add_tiebreaker_round}
						class="cursor-pointer rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 disabled:opacity-40"
					>
						+ Tiebreaker
					</button>
				</div>
			</div>

			{#if form_state.rounds.length === 0}
				<div
					class="bg-surface-100/40 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-secondary/20 p-8 text-center"
				>
					<span class="mb-2 text-2xl">📋</span>
					<p class="text-sm font-semibold text-gray-500">No rounds created yet.</p>
					<p class="pt-2 text-xs font-semibold text-gray-400">
						Choose a location above to enable round builder
					</p>
				</div>
			{:else}
				<div class="flex flex-col space-y-1">
					{#each form_state.rounds as rd, r_idx (rd.round_number)}
						<div
							animate:flip={{ duration: 180 }}
							in:fly={{ y: 12, duration: 180, opacity: 0 }}
							class="bg-surface-100 overflow-hidden rounded-md border border-secondary/15 shadow-xs"
						>
							<div
								class="bg-surface-200/40 flex w-full items-center justify-between border-b border-secondary/10 p-3"
							>
								<div class="flex items-center space-x-3">
									<span class="flex items-center space-x-2 text-base font-bold text-primary-dark">
										<span class="font-mono text-sm text-gray-400">{rd.round_number}</span>
										<span>{rd.name}</span>
									</span>
									<span
										class="rounded-md bg-secondary/10 px-2.5 py-1 text-[11px] font-bold tracking-wider text-secondary uppercase"
									>
										{rd.round_type}
									</span>
									{#if round_errors[r_idx]?.length}
										<span
											class="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700"
											>{round_errors[r_idx].length} missing</span
										>
									{/if}
								</div>

								<div class="flex items-center space-x-2">
									<button
										type="button"
										onclick={() => {
											open_rounds[r_idx] = open_rounds[r_idx] === false;
										}}
										class="text-surface-content cursor-pointer rounded-md bg-secondary/10 px-3 py-1.5 text-xs font-semibold hover:bg-secondary/15"
									>
										<ChevronDown
											size={16}
											class="transition-transform duration-200 {open_rounds[r_idx] !== false
												? 'rotate-180'
												: ''}"
										/>
									</button>
									<button
										type="button"
										onclick={() => request_round_removal(r_idx)}
										aria-label="Remove round"
										class="cursor-pointer rounded-md bg-secondary/10 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-secondary/15"
									>
										<Trash2 size={16} />
									</button>
								</div>
							</div>

							{#if open_rounds[r_idx] !== false}
								<div class="space-y-6 p-6">
									<div class="flex flex-col space-y-4">
										{#each rd.questions as q, q_idx (q.question_number)}
											{#if rd.round_type === 'STANDARD'}
												<StandardRoundForm
													bind:question={rd.questions[q_idx]}
													{r_idx}
													{q_idx}
													{category_options}
													on_add_category={() => open_add_category_dialog(r_idx, q_idx)}
												/>
											{:else if rd.round_type === 'HALFTIME'}
												<HalftimeQuestionForm bind:question={rd.questions[q_idx]} {r_idx} />
											{:else if rd.round_type === 'FINAL'}
												<FinalQuestionForm bind:question={rd.questions[q_idx]} {r_idx} />
											{:else if rd.round_type === 'TIEBREAKER'}
												<TiebreakerQuestionForm bind:question={rd.questions[q_idx]} {r_idx} />
											{/if}
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex flex-wrap justify-end gap-3">
			<button
				disabled={is_submitting || form_state.rounds.length === 0}
				class="cursor-pointer rounded-md border border-primary-dark/20 bg-white px-6 py-2.5 font-semibold text-primary-dark shadow-sm hover:bg-primary-dark/5 disabled:opacity-40"
				type="submit"
				name="status"
				value="DRAFT"
			>
				{is_submitting ? 'Saving Game...' : 'Save as Draft'}
			</button>
			<button
				disabled={is_submitting || form_state.rounds.length === 0}
				class="cursor-pointer rounded-md bg-primary-dark px-6 py-2.5 font-semibold text-white shadow-md hover:bg-primary-dark/90 disabled:opacity-40"
				type="submit"
				name="status"
				value="SCHEDULED"
			>
				{is_submitting ? 'Saving Game...' : 'Schedule Game'}
			</button>
		</div>
	</form>
</section>

<RoundDeleteDialog
	bind:open={is_delete_round_dialog_open}
	round_name={pending_round_index === null
		? undefined
		: form_state.rounds[pending_round_index]?.name}
	onconfirm={confirm_round_removal}
/>
<CategoryCreateDialog
	bind:open={is_category_dialog_open}
	bind:name={new_category_name}
	oncreate={handle_create_category}
/>
