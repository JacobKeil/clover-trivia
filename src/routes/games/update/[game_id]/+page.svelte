<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { ChevronDown, ChevronUp, LockKeyhole, Trash2 } from '@lucide/svelte';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { onMount, untrack } from 'svelte';
	import type { PageData } from './$types';
	import type { CreateGameForm, GameRoundSetup, QuestionCategory } from '$lib/game-builder-types';
	import { validate_game_rounds, type RoundValidationErrors } from '$lib/game-builder-validation';
	import {
		clear_game_builder_draft,
		load_game_builder_draft,
		save_game_builder_draft
	} from '$lib/game-builder-draft';
	import {
		InputField,
		StandardRoundForm,
		HalftimeQuestionForm,
		FinalQuestionForm,
		TiebreakerQuestionForm
	} from '$lib/components';
	import {
		CategoryCreateDialog,
		LocationSelect,
		QuestionSearchDialog,
		RoundDeleteDialog
	} from '$lib/components/ui';

	let { data }: { data: PageData } = $props();

	// Map loaded server data into form state
	const initial_game = untrack(() => data.game);
	const locations = untrack(() => data.locations ?? []);
	const saved_categories = untrack(() => data.categories ?? []);
	type LoadedRound = NonNullable<typeof initial_game>['rounds'][number];
	type LoadedQuestion = LoadedRound['questions'][number];
	let initial_standard_round_count = 0;
	let is_delete_round_dialog_open = $state(false);
	let pending_round_index = $state<number | null>(null);
	let is_question_search_open = $state(false);
	let is_adding_round = $state(false);
	let is_category_dialog_open = $state(false);
	let new_category_name = $state('');
	let target_question_ref = $state<{ round_idx: number; q_idx: number } | null>(null);
	const draft_key = `clover-trivia:game-builder:update:${initial_game?.id ?? 'unknown'}`;
	let is_draft_ready = $state(false);
	let draft_status = $state<string | null>(null);

	let form_state = $state<CreateGameForm>({
		name: initial_game?.title ?? '',
		location_id: initial_game?.location_id?.toString() ?? '',
		scheduled_at: initial_game?.scheduled_at ? new Date(initial_game.scheduled_at) : new Date(),
		standard_question_count: initial_game?.standard_question_count ?? 3,
		standard_wager_options: initial_game?.standard_wager_options ?? [5, 10, 15],
		new_categories: [],
		rounds: (initial_game?.rounds ?? []).map((r: LoadedRound) => ({
			round_number: r.order,
			name: r.round_type === 'STANDARD' ? `Round ${++initial_standard_round_count}` : r.name,
			round_type: r.round_type,
			points_type: r.points_type,
			wager_options: r.wager_options ?? [],
			questions: r.questions.map((q: LoadedQuestion) => ({
				question_number: q.order,
				question_type: q.question_type,
				question_text: q.question_text ?? '',
				answer: q.correct_answer_text ?? '',
				answer_items: q.items?.map((item) => item.answer_text) ?? [],
				numeric_answer: q.numeric_answer ?? null,
				image_file: null,
				image_url: q.image_url ?? null,
				max_items: q.max_items ?? 1,
				points_per_item: q.points_value ?? null,
				min_wager: r.min_wager ?? null,
				max_wager: r.max_wager ?? null,
				category_id: q.category_id?.toString() ?? undefined,
				bonus_points: q.bonus_points_value ?? null,
				song_name: q.song_title ?? '',
				song_artist: q.song_artist ?? '',
				notes: q.notes ?? ''
			}))
		}))
	});

	let combined_categories = $derived<QuestionCategory[]>([
		...saved_categories.map((category) => ({ id: category.value, name: category.label })),
		...form_state.new_categories
	]);
	let category_options = $derived(
		[...combined_categories]
			.sort((first, second) =>
				first.name.localeCompare(second.name, undefined, { sensitivity: 'base' })
			)
			.map((category) => ({ label: category.name, value: category.id }))
	);

	function open_add_category_dialog(round_idx: number, q_idx: number) {
		target_question_ref = { round_idx, q_idx };
		new_category_name = '';
		is_category_dialog_open = true;
	}

	function handle_create_category() {
		const name = new_category_name.trim();
		if (!name || !target_question_ref) return;

		const existing_category = combined_categories.find(
			(category) => category.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
		);
		const category_id = existing_category?.id ?? `temp_cat_${Date.now()}`;
		if (!existing_category) form_state.new_categories.push({ id: category_id, name, is_new: true });

		const { round_idx, q_idx } = target_question_ref;
		if (form_state.rounds[round_idx]?.questions[q_idx]) {
			form_state.rounds[round_idx].questions[q_idx].category_id = category_id;
			form_state.rounds = [...form_state.rounds];
		}

		is_category_dialog_open = false;
		target_question_ref = null;
	}

	function go_to_create_location() {
		goto('/locations/create');
	}

	// Game Lock Logic
	let game_status = $state(initial_game?.status ?? 'SCHEDULED');
	let is_locked = $derived(game_status === 'IN_PROGRESS' || game_status === 'COMPLETED');
	let has_rounds = $derived(form_state.rounds.length > 0);

	// Accordion Open States
	let open_rounds = $state<Record<number, boolean>>({});

	let is_submitting = $state(false);
	let error_message = $state<string | null>(null);
	let round_errors = $state<RoundValidationErrors>({});

	// Accordion Toggle Logic
	function focus_new_round(round_idx: number) {
		is_adding_round = true;
		const new_open_state: Record<number, boolean> = {};
		form_state.rounds.forEach((_, index) => {
			new_open_state[index] = false;
		});
		new_open_state[round_idx] = true;
		open_rounds = new_open_state;
		requestAnimationFrame(() => (is_adding_round = false));
	}

	// Add / Remove Rounds
	function add_round(type: 'STANDARD' | 'HALFTIME' | 'FINAL' | 'TIEBREAKER') {
		if (is_locked) return;

		let new_round: GameRoundSetup;

		if (type === 'STANDARD') {
			new_round = {
				round_number: 0,
				name: '',
				round_type: 'STANDARD',
				points_type: 'WAGER',
				wager_options: form_state.standard_wager_options,
				questions: Array.from({ length: form_state.standard_question_count }, (_, index) => ({
					question_number: index + 1,
					question_type: 'SINGLE',
					question_text: '',
					answer: '',
					image_file: null,
					max_items: 1,
					category_id: undefined
				}))
			};
		} else if (type === 'HALFTIME') {
			new_round = {
				round_number: 0,
				name: 'Halftime Question',
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
						bonus_points: 5,
						category_id: undefined
					}
				]
			};
		} else if (type === 'FINAL') {
			new_round = {
				round_number: 0,
				name: 'Final Question',
				round_type: 'FINAL',
				points_type: 'RANGE',
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
						min_wager: 0,
						max_wager: 50,
						category_id: undefined
					}
				]
			};
		} else {
			new_round = {
				round_number: 0,
				name: 'Tiebreaker Question',
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
						category_id: undefined
					}
				]
			};
		}

		form_state.rounds = [...form_state.rounds, new_round];
		update_round_numbering();
		focus_new_round(form_state.rounds.length - 1);
	}

	function update_round_numbering() {
		let standard_counter = 0;
		form_state.rounds.forEach((round, index) => {
			round.round_number = index + 1;
			if (round.round_type === 'STANDARD') {
				standard_counter++;
				round.name = `Round ${standard_counter}`;
			} else if (round.round_type === 'HALFTIME') {
				round.name = 'Halftime Question';
			} else if (round.round_type === 'FINAL') {
				round.name = 'Final Question';
			} else {
				round.name = 'Tiebreaker Question';
			}
		});
	}

	function remove_round(idx: number) {
		if (is_locked) return;
		form_state.rounds = form_state.rounds.filter((_, i) => i !== idx);
		update_round_numbering();
	}

	function move_round(index: number, direction: -1 | 1) {
		if (is_locked) return;
		const target_index = index + direction;
		if (target_index < 0 || target_index >= form_state.rounds.length) return;
		const rounds = [...form_state.rounds];
		[rounds[index], rounds[target_index]] = [rounds[target_index], rounds[index]];
		form_state.rounds = rounds;
		update_round_numbering();
		round_errors = {};
		open_rounds = {
			...open_rounds,
			[index]: open_rounds[target_index],
			[target_index]: open_rounds[index]
		};
	}

	function request_round_removal(index: number) {
		if (is_locked) return;
		pending_round_index = index;
		is_delete_round_dialog_open = true;
	}

	function confirm_round_removal() {
		if (pending_round_index !== null) remove_round(pending_round_index);
		pending_round_index = null;
		is_delete_round_dialog_open = false;
	}

	onMount(() => {
		if (!is_locked) {
			const draft = load_game_builder_draft(draft_key);
			if (draft) {
				form_state = draft.form_state;
				if (draft.open_rounds) open_rounds = draft.open_rounds;
				update_round_numbering();
				draft_status = 'Unsaved draft restored from this browser.';
			}
		}
		is_draft_ready = true;
	});

	$effect(() => {
		if (!is_draft_ready || is_locked) return;
		JSON.stringify({ form_state }, (key, value) => (key === 'image_file' ? undefined : value));
		const timeout = window.setTimeout(() => {
			save_game_builder_draft(draft_key, form_state, undefined, open_rounds);
			draft_status = 'Changes saved locally.';
		}, 400);
		return () => window.clearTimeout(timeout);
	});
</script>

<svelte:head>
	<title>Update Game - {form_state.name}</title>
</svelte:head>

<section class="mx-auto my-8 flex max-w-5xl flex-col space-y-8 text-secondary">
	<div class="flex items-start justify-between gap-4 border-b border-secondary/10 pb-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-primary-dark">Update Game</h1>
			<p class="mt-1 text-sm text-secondary/80">
				Update your game details, rounds, questions, and host notes.
			</p>
		</div>

		{#if is_locked}
			<span
				class="flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
			>
				<LockKeyhole size={14} /> Game {game_status.replace('_', ' ')} — structure locked
			</span>
		{:else}<QuestionSearchDialog bind:open={is_question_search_open} />
		{/if}
	</div>

	<form
		method="POST"
		action="?/update"
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

			formData.set('location_id', form_state.location_id);
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
			formData.set('standard_question_count', form_state.standard_question_count.toString());
			formData.set('standard_wager_options', JSON.stringify(form_state.standard_wager_options));
			formData.set('new_categories', JSON.stringify(form_state.new_categories));

			return async ({ result }) => {
				is_submitting = false;

				if (result.type === 'failure') {
					error_message = (result.data?.message as string) || 'Failed to update game.';
				} else {
					clear_game_builder_draft(draft_key);
					await goto('/dashboard');
				}
			};
		}}
		class="flex flex-col space-y-8"
	>
		<fieldset disabled={is_locked} class="m-0 flex min-w-0 flex-col space-y-8 border-0 p-0">
			<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
				<InputField
					required
					name="name"
					label="Game Name *"
					placeholder="e.g. Tuesday Pub Trivia #42"
					bind:value={form_state.name}
				/>

				<div class="flex flex-col space-y-1">
					<label for="location_id" class="text-surface-content/80 text-xs font-semibold">
						Location *
					</label>
					<LocationSelect
						bind:value={form_state.location_id}
						options={locations.map((location) => ({
							label: location.name,
							value: location.id.toString()
						}))}
						disabled={is_locked || has_rounds}
						on_create_location={go_to_create_location}
					/>
					{#if has_rounds}
						<span class="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
							<LockKeyhole size={12} /> Location is fixed after adding rounds.
						</span>
					{/if}
				</div>

				<div class="flex flex-col space-y-1">
					<label for="scheduled_at" class="text-surface-content/80 text-xs font-semibold">
						Scheduled Date *
					</label>
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
							form_state.scheduled_at = val ? new Date(val) : new Date();
						}}
					/>
				</div>
			</div>

			<div>
				<h4 class="text-surface-content/50 mb-2 text-[11px] font-bold tracking-wider uppercase">
					Global Standard Round Wager Point Options ({form_state.standard_question_count} Questions)
				</h4>
				<div class="flex flex-wrap items-center gap-2">
					{#each Array(form_state.standard_question_count) as _, wager_idx}
						<input
							type="number"
							min="1"
							max="100"
							disabled={has_rounds}
							class="bg-surface-100 text-surface-content/70 h-9 w-18 rounded-md border border-secondary/20 px-3 text-center text-xs font-bold shadow-xs focus:border-primary focus:outline-hidden disabled:opacity-50"
							bind:value={form_state.standard_wager_options[wager_idx]}
						/>
					{/each}
					<span class="text-surface-content/50 ml-2 text-[11px]">
						These point values apply to every standard round in this game.
					</span>
				</div>
				{#if has_rounds}
					<span class="mt-2 flex items-center gap-1 text-[11px] font-medium text-rose-600">
						<LockKeyhole size={12} /> Wagers are fixed after adding rounds.
					</span>
				{/if}
			</div>

			<div class="flex flex-col space-y-5">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-surface-content/60 text-xl font-bold">2. Rounds & Questions</h2>
						<p class="text-surface-content/60 text-xs">
							Default questions per standard round: <strong
								>{form_state.standard_question_count}</strong
							>
						</p>
					</div>

					{#if !is_locked}
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								onclick={() => add_round('STANDARD')}
								class="cursor-pointer rounded-md border border-primary-dark/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary-dark shadow-xs hover:bg-primary-dark/5 disabled:cursor-not-allowed disabled:opacity-40"
							>
								+ Standard Round
							</button>
							<button
								type="button"
								onclick={() => add_round('HALFTIME')}
								class="cursor-pointer rounded-md border border-primary-dark/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary-dark shadow-xs hover:bg-primary-dark/5 disabled:cursor-not-allowed disabled:opacity-40"
							>
								+ Halftime
							</button>
							<button
								type="button"
								onclick={() => add_round('FINAL')}
								class="cursor-pointer rounded-md border border-primary-dark/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary-dark shadow-xs hover:bg-primary-dark/5 disabled:cursor-not-allowed disabled:opacity-40"
							>
								+ Final
							</button>
							<button
								type="button"
								onclick={() => add_round('TIEBREAKER')}
								class="cursor-pointer rounded-md border border-primary-dark/20 bg-white px-3 py-1.5 text-xs font-semibold text-primary-dark shadow-xs hover:bg-primary-dark/5 disabled:cursor-not-allowed disabled:opacity-40"
							>
								+ Tiebreaker
							</button>
						</div>
					{/if}
				</div>

				<div class="flex flex-col space-y-3">
					{#each form_state.rounds as rd, r_idx (rd)}
						<div
							animate:flip={{ duration: is_adding_round ? 0 : 180 }}
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
									{#if !is_locked}
										<div class="flex overflow-hidden rounded-md border border-secondary/15">
											<button
												type="button"
												onclick={() => move_round(r_idx, -1)}
												disabled={r_idx === 0}
												aria-label="Move round earlier"
												class="text-surface-content/65 grid size-8 cursor-pointer place-items-center hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-35"
												><ChevronUp size={15} /></button
											>
											<button
												type="button"
												onclick={() => move_round(r_idx, 1)}
												disabled={r_idx === form_state.rounds.length - 1}
												aria-label="Move round later"
												class="text-surface-content/65 grid size-8 cursor-pointer place-items-center border-l border-secondary/15 hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-35"
												><ChevronDown size={15} /></button
											>
										</div>
									{/if}
									<button
										type="button"
										onclick={() => (open_rounds[r_idx] = open_rounds[r_idx] === false)}
										class="cursor-pointer rounded-md bg-secondary/10 px-3 py-1.5 text-xs font-semibold hover:bg-secondary/15"
									>
										<ChevronDown
											size={16}
											class="transition-transform duration-200 {open_rounds[r_idx] !== false
												? 'rotate-180'
												: ''}"
										/>
									</button>

									{#if !is_locked}
										<button
											type="button"
											onclick={() => request_round_removal(r_idx)}
											aria-label="Remove round"
											class="cursor-pointer rounded-md bg-secondary/10 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-secondary/15"
										>
											<Trash2 size={16} />
										</button>
									{/if}
								</div>
							</div>

							{#if open_rounds[r_idx] !== false}
								<div class="space-y-6 p-6">
									<div class="flex flex-col space-y-4">
										{#each rd.questions as _, q_idx (q_idx)}
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
			</div>

			{#if error_message}
				<p class="rounded-lg bg-rose-500/10 p-3 text-sm font-medium text-rose-600">
					{error_message}
				</p>
			{/if}

			<div class="flex justify-end pt-4">
				<button
					disabled={is_submitting}
					class="cursor-pointer rounded-md bg-primary-dark px-6 py-2.5 font-semibold text-white shadow-md hover:bg-primary-dark/90 disabled:opacity-40"
					type="submit"
				>
					{is_submitting ? 'Saving Changes...' : 'Save Game Changes'}
				</button>
			</div>
			{#if draft_status}
				<p class="text-surface-content/50 text-right text-xs">
					{draft_status} Image files need to be selected again.
				</p>
			{/if}
		</fieldset>
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
