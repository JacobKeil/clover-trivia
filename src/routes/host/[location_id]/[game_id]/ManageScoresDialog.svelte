<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Dialog } from 'bits-ui';
	import { DialogCloseButton } from '$lib/components/ui';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';

	type ScoreHistoryCard = {
		team: { id: string; name: string };
		points: number;
		score_history: Array<{
			label: string;
			round_type: string;
			questions: Array<{
				id: string;
				order: number;
				question_type: string;
				bonus_points_value: number;
				max_items: number;
				submission: {
					wager: number | null;
					items_correct: number;
					is_correct_primary: boolean;
					is_correct_bonus: boolean;
				} | null;
				tiebreaker_submission: { submitted_answer: number } | null;
			}>;
		}>;
	};

	let { data }: { data: PageData } = $props();
	let open = $state(false);
	let scorecards = $state<ScoreHistoryCard[]>([]);
	let is_loading = $state(false);
	let load_error = $state<string | null>(null);
	let managed_team_id = $state('');
	let bonus_error = $state<string | null>(null);
	let managed_scorecard = $derived(
		scorecards.find((entry) => entry.team.id === managed_team_id) ?? scorecards[0] ?? null
	);
	let managed_scorecard_has_submissions = $derived(
		managed_scorecard?.score_history.some((history_round) =>
			history_round.questions.some(
				(question) => question.submission || question.tiebreaker_submission
			)
		) ?? false
	);
	function notify_presentation() {
		const channel = new BroadcastChannel(`clover-host-${data.game.id}`);
		channel.postMessage('scores-updated');
		channel.close();
	}
	async function load_score_history() {
		is_loading = true;
		load_error = null;
		try {
			const response = await fetch(`${window.location.pathname}/score-history`);
			if (!response.ok) throw new Error('Could not load score history.');
			const payload = (await response.json()) as { scorecards: ScoreHistoryCard[] };
			scorecards = payload.scorecards;
			if (!scorecards.some((entry) => entry.team.id === managed_team_id)) {
				managed_team_id = scorecards[0]?.team.id ?? '';
			}
		} catch {
			load_error = 'Score history could not be loaded. Please try again.';
		} finally {
			is_loading = false;
		}
	}
	function handle_open_change(next_open: boolean) {
		open = next_open;
		if (next_open) void load_score_history();
	}
	const manage_score_enhance: SubmitFunction = () => {
		return async ({ update }) => {
			await update({ reset: false });
			await load_score_history();
			notify_presentation();
		};
	};
	async function update_bonus_score(
		team_id: string,
		question_id: string,
		is_correct_bonus: boolean
	) {
		const form_data = new FormData();
		form_data.set('team_id', team_id);
		form_data.set('question_id', question_id);
		if (is_correct_bonus) form_data.set('bonus_correct', 'true');
		bonus_error = null;
		try {
			const response = await fetch('?/toggle_bonus', { method: 'POST', body: form_data });
			if (!response.ok) throw new Error('Could not update bonus score.');
			await invalidateAll();
			await load_score_history();
			notify_presentation();
		} catch {
			bonus_error = 'The bonus score could not be saved. Please try again.';
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handle_open_change}>
	<Dialog.Trigger
		class="rounded-md border border-[#c8ddce] px-3 py-2 text-xs font-extrabold tracking-[.08em] text-[#246d52] uppercase hover:bg-[#f2f8f3]"
		>Manage scores</Dialog.Trigger
	>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-[#123328]/35 backdrop-blur-sm" />
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 max-h-[88vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#dce7df] bg-white p-6 shadow-2xl outline-hidden"
		>
			<DialogCloseButton />
			<Dialog.Title class="font-[Kanit] text-2xl font-medium text-[#183d32]"
				>Manage scores{managed_scorecard
					? ` · ${managed_scorecard.points} points`
					: ''}</Dialog.Title
			>
			<Dialog.Description class="mt-1 text-sm text-[#71837a]"
				>Choose a team, then correct any saved score. Selecting an occupied standard wager swaps the
				two question wagers automatically.</Dialog.Description
			>
			{#if bonus_error}
				<p
					class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
				>
					{bonus_error}
				</p>
			{/if}
			{#if is_loading}<p class="mt-5 text-sm text-[#71837a]">Loading saved scores…</p>
			{:else if load_error}<p
				class="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
			>
				{load_error}
			</p>{:else}<div class="mt-5 flex flex-wrap gap-2 border-b border-[#e8eee9] pb-4">
				{#each scorecards as entry}<button
						type="button"
						onclick={() => (managed_team_id = entry.team.id)}
						class="rounded-md px-3 py-2 text-xs font-bold {managed_scorecard?.team.id ===
						entry.team.id
							? 'bg-[#176249] text-white'
							: 'bg-[#f1f6f1] text-[#315c4d]'}">{entry.team.name} · {entry.points}</button
					>{/each}
			</div>
			{#if managed_scorecard}{#if managed_scorecard_has_submissions}<div class="mt-5 grid gap-4">
						{#each managed_scorecard.score_history as history_round}
							{#if history_round.questions.some((question) => question.submission || question.tiebreaker_submission)}<section
									class="rounded-xl border border-[#e1e9e3] p-4"
								>
									<h3 class="font-[Kanit] text-xl font-medium text-[#1d684e]">
										{history_round.label}
									</h3>
									<div class="mt-3 grid gap-2">
										{#each history_round.questions as history_question}
											{#if history_question.submission || history_question.tiebreaker_submission}<div
													class="flex flex-wrap items-center gap-2 rounded-lg bg-[#f7faf7] p-2.5 text-xs"
												>
													<span class="font-extrabold text-[#527466]"
														>Question {history_question.order}</span
													>
													{#if history_round.round_type === 'STANDARD' || history_round.round_type === 'FINAL'}<form
															use:enhance={manage_score_enhance}
															method="POST"
															action="?/score"
															class="ml-auto flex flex-wrap items-center gap-1"
														>
															<input
																type="hidden"
																name="team_id"
																value={managed_scorecard.team.id}
															/><input
																type="hidden"
																name="question_id"
																value={history_question.id}
															/>{#if history_round.round_type === 'STANDARD'}<input
																	type="hidden"
																	name="wager"
																	value={history_question.submission!.wager ?? 0}
																/>
																<div
																	class="inline-flex overflow-hidden rounded-md border border-[#c8ddce]"
																>
																	{#each data.game.standard_wager_options as wager}<button
																			type="submit"
																			name="target_wager"
																			value={wager}
																			formaction="?/swap_wager"
																			class="border-r border-[#c8ddce] px-2.5 py-2 font-bold last:border-r-0 {history_question
																				.submission!.wager === wager
																				? 'bg-[#176249] text-white'
																				: 'bg-white text-[#246d52] hover:bg-[#f2f8f3]'}"
																			aria-label={`Set wager to ${wager} points`}>{wager}</button
																		>{/each}
																</div>{:else}<input
																	name="wager"
																	type="number"
																	value={history_question.submission!.wager ?? 0}
																	class="h-8 w-16 rounded-md border border-[#d6e1d8] px-2"
																/>{/if}
															{#if history_question.question_type === 'TWO_PART_BONUS'}
																<label
																	class="order-first inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2 py-1.5 font-bold text-sky-800"
																>
																	<input
																		type="checkbox"
																		name="bonus_correct"
																		value="true"
																		checked={history_question.submission!.is_correct_bonus}
																		onchange={(event) =>
																			void update_bonus_score(
																				managed_scorecard.team.id,
																				history_question.id,
																				event.currentTarget.checked
																			)}
																	/>
																	+{history_question.bonus_points_value} bonus
																</label>
															{/if}
															<button
																name="correct"
																value="true"
																class="rounded-md px-2.5 py-2 font-bold {history_question
																	.submission!.is_correct_primary
																	? 'bg-emerald-600 text-white'
																	: 'bg-emerald-50 text-emerald-700'}">Correct</button
															>
															<button
																name="correct"
																value="false"
																class="rounded-md px-2.5 py-2 font-bold {!history_question
																	.submission!.is_correct_primary
																	? 'bg-rose-600 text-white'
																	: 'bg-rose-50 text-rose-700'}">Incorrect</button
															>
														</form>
													{:else if history_round.round_type === 'HALFTIME'}<form
															use:enhance={manage_score_enhance}
															method="POST"
															action="?/score"
															class="ml-auto flex items-center gap-1"
														>
															<input
																type="hidden"
																name="team_id"
																value={managed_scorecard.team.id}
															/><input
																type="hidden"
																name="question_id"
																value={history_question.id}
															/><input type="hidden" name="correct" value="true" /><input
																name="items_correct"
																type="number"
																min="0"
																max={history_question.max_items}
																value={history_question.submission!.items_correct}
																class="h-8 w-14 rounded-md border border-[#d6e1d8] px-2"
															/><button
																class="rounded-md bg-[#176249] px-2.5 py-2 font-bold text-white"
																>Update</button
															>
														</form>
													{:else}<form
															use:enhance={manage_score_enhance}
															method="POST"
															action="?/tiebreaker"
															class="ml-auto flex items-center gap-1"
														>
															<input
																type="hidden"
																name="team_id"
																value={managed_scorecard.team.id}
															/><input
																type="hidden"
																name="question_id"
																value={history_question.id}
															/><input
																name="submitted_answer"
																type="number"
																value={history_question.tiebreaker_submission?.submitted_answer ??
																	''}
																class="h-8 w-20 rounded-md border border-[#d6e1d8] px-2"
															/><button
																class="rounded-md bg-[#176249] px-2.5 py-2 font-bold text-white"
																>Update</button
															>
														</form>{/if}
												</div>{/if}
										{/each}
									</div>
								</section>{/if}
						{/each}
					</div>{:else}<p
						class="mt-5 rounded-xl border border-dashed border-[#cfded2] bg-[#f7faf7] px-4 py-8 text-center text-sm font-medium text-[#71837a]"
					>
						No scores submitted yet.
					</p>{/if}{:else}<p
					class="mt-5 rounded-xl border border-dashed border-[#cfded2] bg-[#f7faf7] px-4 py-8 text-center text-sm font-medium text-[#71837a]"
				>
					No teams have been added yet.
				</p>{/if}
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
