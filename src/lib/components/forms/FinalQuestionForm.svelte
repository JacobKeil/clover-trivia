<script lang="ts">
	import type { QuestionSetup } from '$lib/../routes/games/create/store';
	import QuestionImageUpload from './QuestionImageUpload.svelte';

	let {
		question = $bindable(),
		r_idx
	}: {
		question: QuestionSetup;
		r_idx: number;
	} = $props();

	// Set fallbacks for final question wager bounds
	question.min_wager = question.min_wager ?? 0;
	question.max_wager = question.max_wager ?? 50;

	const missing_number = (value: unknown) => value === null || value === undefined || value === '';
	const field_class = (invalid: boolean) =>
		`bg-surface-100 text-surface-content h-9 w-full rounded-md border px-3 text-xs shadow-xs focus:outline-hidden ${
			invalid ? 'border-rose-400 focus:border-rose-600' : 'border-secondary/20 focus:border-primary'
		}`;
</script>

<div
	class="bg-surface-100/50 flex flex-col space-y-4 rounded-xl border border-secondary/15 p-4 shadow-2xs"
>
	<div class="flex flex-col space-y-3">
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<div class="flex flex-col space-y-1">
				<label
					for="final_min_{r_idx}"
					class="text-surface-content/80 text-xs font-semibold"
					class:text-rose-600={missing_number(question.min_wager)}
				>
					Minimum Wager Points *
				</label>
				<input
					required
					id="final_min_{r_idx}"
					type="number"
					min="0"
					placeholder="e.g. 0"
					class={field_class(missing_number(question.min_wager))}
					bind:value={question.min_wager}
				/>
			</div>

			<div class="flex flex-col space-y-1">
				<label
					for="final_max_{r_idx}"
					class="text-surface-content/80 text-xs font-semibold"
					class:text-rose-600={missing_number(question.max_wager)}
				>
					Maximum Wager Points *
				</label>
				<input
					required
					id="final_max_{r_idx}"
					type="number"
					min="1"
					placeholder="e.g. 50"
					class={field_class(missing_number(question.max_wager))}
					bind:value={question.max_wager}
				/>
			</div>
		</div>

		<div class="flex flex-col space-y-1">
			<label
				for="final_prompt_{r_idx}"
				class="text-surface-content/80 text-xs font-semibold"
				class:text-rose-600={!question.question_text?.trim()}
			>
				Final Question Prompt *
			</label>
			<input
				required
				id="final_prompt_{r_idx}"
				type="text"
				placeholder="e.g. What 1994 Tarantino film featured the 'Royale with Cheese' dialogue?"
				class={field_class(!question.question_text?.trim())}
				bind:value={question.question_text}
			/>
		</div>

		<div class="flex flex-col space-y-1">
			<label
				for="final_ans_{r_idx}"
				class="text-surface-content/80 text-xs font-semibold"
				class:text-rose-600={!question.answer?.trim()}
			>
				Correct Answer *
			</label>
			<input
				required
				id="final_ans_{r_idx}"
				type="text"
				placeholder="e.g. Pulp Fiction"
				class={field_class(!question.answer?.trim())}
				bind:value={question.answer}
			/>
		</div>

		<div class="flex flex-col space-y-1">
			<label for="final_notes_{r_idx}" class="text-surface-content/80 text-xs font-semibold">
				Host Notes / Clues
			</label>
			<input
				id="final_notes_{r_idx}"
				type="text"
				placeholder="Private clues or notes for host..."
				class="bg-surface-100 text-surface-content h-9 w-full rounded-md border border-secondary/20 px-3 text-xs shadow-xs focus:border-primary focus:outline-hidden"
				bind:value={question.notes}
			/>
		</div>
		<QuestionImageUpload
			bind:file={question.image_file}
			image_url={question.image_url}
			on_remove={() => (question.image_url = null)}
		/>
	</div>
</div>
