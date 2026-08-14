<script lang="ts">
	import type { QuestionSetup } from '$lib/../routes/games/create/store';
	import QuestionImageUpload from './QuestionImageUpload.svelte';

	let { question = $bindable(), r_idx }: { question: QuestionSetup; r_idx: number } = $props();
	question.max_items = question.max_items ?? 5;
	question.points_per_item = question.points_per_item ?? 5;
	question.bonus_points = question.bonus_points ?? 5;
	question.answer_items =
		question.answer_items ?? Array.from({ length: question.max_items }, () => '');

	function sync_answer_items() {
		const count = Math.max(1, Number(question.max_items) || 1);
		question.answer_items = Array.from(
			{ length: count },
			(_, index) => question.answer_items?.[index] ?? ''
		);
	}

	const invalid_number = (value: unknown, minimum = 1) =>
		value === null || value === undefined || value === '' || Number(value) < minimum;
	const field_class = (invalid: boolean) =>
		`bg-surface-100 text-surface-content h-9 w-full rounded-md border px-3 text-xs ${
			invalid ? 'border-rose-400 focus:border-rose-600' : 'border-secondary/20 focus:border-primary'
		}`;
</script>

<div class="bg-surface-100/50 space-y-4 rounded-xl border border-secondary/15 p-4 shadow-2xs">
	<div class="grid gap-3 md:grid-cols-3">
		<div class="space-y-1">
			<label
				for="ht_count_{r_idx}"
				class="text-surface-content/80 text-xs font-semibold"
				class:text-rose-600={invalid_number(question.max_items)}>Number of answers *</label
			><input
				required
				id="ht_count_{r_idx}"
				type="number"
				min="1"
				max="20"
				class={field_class(invalid_number(question.max_items))}
				bind:value={question.max_items}
				onchange={sync_answer_items}
			/>
		</div>
		<div class="space-y-1">
			<label
				for="ht_points_{r_idx}"
				class="text-surface-content/80 text-xs font-semibold"
				class:text-rose-600={invalid_number(question.points_per_item)}>Points per item *</label
			><input
				required
				id="ht_points_{r_idx}"
				type="number"
				min="1"
				class={field_class(invalid_number(question.points_per_item))}
				bind:value={question.points_per_item}
			/>
		</div>
		<div class="space-y-1">
			<label for="ht_bonus_{r_idx}" class="text-surface-content/80 text-xs font-semibold"
				>All-correct bonus</label
			><input
				id="ht_bonus_{r_idx}"
				type="number"
				min="0"
				class="bg-surface-100 text-surface-content h-9 w-full rounded-md border border-secondary/20 px-3 text-xs"
				bind:value={question.bonus_points}
			/>
		</div>
	</div>
	<div class="space-y-1">
		<label
			for="ht_prompt_{r_idx}"
			class="text-surface-content/80 text-xs font-semibold"
			class:text-rose-600={!question.question_text?.trim()}>Halftime question *</label
		><textarea
			required
			id="ht_prompt_{r_idx}"
			rows="3"
			placeholder="e.g. Name the five original Great Lakes..."
			class={`bg-surface-100 text-surface-content w-full rounded-md border px-3 py-2 text-sm ${
				question.question_text?.trim()
					? 'border-secondary/20 focus:border-primary'
					: 'border-rose-400 focus:border-rose-600'
			}`}
			bind:value={question.question_text}></textarea>
	</div>
	<div class="space-y-2">
		<p
			class="text-surface-content/80 text-xs font-semibold"
			class:text-rose-600={question.answer_items?.some((item) => !item.trim())}
		>
			Accepted answers *
		</p>
		<p class="text-[11px] text-secondary/60">
			One item per answer. A team earns points for every correct item.
		</p>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each question.answer_items ?? [] as _, item_idx}<input
					required
					type="text"
					placeholder="Answer {item_idx + 1}"
					class={`bg-surface-100 text-surface-content h-9 rounded-md border px-3 text-xs ${
						question.answer_items?.[item_idx]?.trim()
							? 'border-secondary/20 focus:border-primary'
							: 'border-rose-400 focus:border-rose-600'
					}`}
					bind:value={question.answer_items![item_idx]}
				/>{/each}
		</div>
	</div>
	<QuestionImageUpload
		bind:file={question.image_file}
		image_url={question.image_url}
		on_remove={() => (question.image_url = null)}
	/>
	<div class="space-y-1">
		<label for="ht_notes_{r_idx}" class="text-surface-content/80 text-xs font-semibold"
			>Host notes</label
		><input
			id="ht_notes_{r_idx}"
			type="text"
			placeholder="Private clues or notes for host..."
			class="bg-surface-100 text-surface-content h-9 w-full rounded-md border border-secondary/20 px-3 text-xs"
			bind:value={question.notes}
		/>
	</div>
</div>
