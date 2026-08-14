<script lang="ts">
	import { CategorySelect } from '$lib/components';
	import QuestionImageUpload from './QuestionImageUpload.svelte';
	import type { QuestionSetup } from '$lib/../routes/games/create/store';

	let {
		question = $bindable(),
		r_idx,
		q_idx,
		category_options,
		on_add_category
	}: {
		question: QuestionSetup;
		r_idx: number;
		q_idx: number;
		category_options: { label: string; value: string }[];
		on_add_category: () => void;
	} = $props();
</script>

<div
	class="bg-surface-100/50 flex flex-col space-y-4 rounded-xl border border-secondary/15 p-4 shadow-2xs"
>
	<div class="flex items-center justify-between border-b border-secondary/10 pb-2">
		<span class="text-xs font-bold text-primary-dark">
			Question #{question.question_number}
		</span>

		<div class="flex items-center space-x-4">
			<label class="flex cursor-pointer items-center space-x-1.5 text-xs">
				<input
					type="radio"
					class="rounded-full accent-primary"
					name={`q_type_${r_idx}_${q_idx}`}
					value="SINGLE"
					bind:group={question.question_type}
				/>
				<span class="font-medium">Single Answer</span>
			</label>
			<label class="flex cursor-pointer items-center space-x-1.5 text-xs">
				<input
					type="radio"
					class="rounded-full accent-primary"
					name={`q_type_${r_idx}_${q_idx}`}
					value="TWO_PART_BONUS"
					bind:group={question.question_type}
				/>
				<span class="font-medium">2-Part Bonus</span>
			</label>
		</div>
	</div>

	<div class="flex flex-col space-y-3">
		<div class="flex flex-col space-y-1">
			<label
				for="prompt_{r_idx}_{q_idx}"
				class="text-surface-content/80 text-xs font-semibold"
				class:text-rose-600={!question.question_text?.trim()}>Question Prompt *</label
			>
			<input
				required
				id="prompt_{r_idx}_{q_idx}"
				type="text"
				placeholder="Type question prompt..."
				class={`bg-surface-100 text-surface-content h-9 w-full rounded-md border px-3 text-xs shadow-xs focus:outline-hidden ${
					question.question_text?.trim()
						? 'border-secondary/20 focus:border-primary'
						: 'border-rose-400 focus:border-rose-600'
				}`}
				bind:value={question.question_text}
			/>
		</div>

		<div
			class="grid grid-cols-2 gap-3"
			class:grid-cols-3={question.question_type === 'TWO_PART_BONUS'}
		>
			<div class="flex flex-col space-y-1">
				<label
					for="ans_{r_idx}_{q_idx}"
					class="text-surface-content/80 text-xs font-semibold"
					class:text-rose-600={!question.answer?.trim()}>Correct Answer *</label
				>
				<input
					required
					id="ans_{r_idx}_{q_idx}"
					type="text"
					placeholder="Type answer..."
					class={`bg-surface-100 text-surface-content h-9 w-full rounded-md border px-3 text-xs shadow-xs focus:outline-hidden ${
						question.answer?.trim()
							? 'border-secondary/20 focus:border-primary'
							: 'border-rose-400 focus:border-rose-600'
					}`}
					bind:value={question.answer}
				/>
			</div>

			{#key question.category_id}<CategorySelect
					label="Category *"
					options={category_options}
					bind:value={question.category_id}
					required
					on_create_category={on_add_category}
				/>{/key}

			{#if question.question_type === 'TWO_PART_BONUS'}
				<div class="flex flex-col space-y-1">
					<label for="bonus_{r_idx}_{q_idx}" class="text-surface-content/80 text-xs font-semibold"
						>Bonus Points Value</label
					>
					<input
						id="bonus_{r_idx}_{q_idx}"
						required
						type="number"
						min="1"
						placeholder="e.g. 2"
						class="bg-surface-100 text-surface-content h-9 w-full rounded-md border border-secondary/20 px-3 text-xs shadow-xs focus:border-primary focus:outline-hidden"
						bind:value={question.bonus_points}
					/>
				</div>
			{/if}
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col space-y-1">
				<label for="song_{r_idx}_{q_idx}" class="text-surface-content/80 text-xs font-semibold"
					>Song Title (Optional)</label
				>
				<input
					id="song_{r_idx}_{q_idx}"
					type="text"
					placeholder="Song title..."
					class="bg-surface-100 text-surface-content h-9 w-full rounded-md border border-secondary/20 px-3 text-xs shadow-xs focus:border-primary focus:outline-hidden"
					bind:value={question.song_name}
				/>
			</div>

			<div class="flex flex-col space-y-1">
				<label for="artist_{r_idx}_{q_idx}" class="text-surface-content/80 text-xs font-semibold"
					>Artist (Optional)</label
				>
				<input
					id="artist_{r_idx}_{q_idx}"
					type="text"
					placeholder="Artist name..."
					class="bg-surface-100 text-surface-content h-9 w-full rounded-md border border-secondary/20 px-3 text-xs shadow-xs focus:border-primary focus:outline-hidden"
					bind:value={question.song_artist}
				/>
			</div>
		</div>

		<div class="flex flex-col space-y-1">
			<label for="notes_{r_idx}_{q_idx}" class="text-surface-content/80 text-xs font-semibold"
				>Host Notes / Clues</label
			>
			<input
				id="notes_{r_idx}_{q_idx}"
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
