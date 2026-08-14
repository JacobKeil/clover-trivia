<script lang="ts">
	import { format } from 'date-fns';
	import { Trophy } from '@lucide/svelte';

	let { data } = $props();

	function round_label(round: (typeof data.game.rounds)[number]) {
		if (round.round_type === 'STANDARD') {
			const standard_round_number =
				data.game.rounds
					.filter((current_round) => current_round.round_type === 'STANDARD')
					.findIndex((current_round) => current_round.id === round.id) + 1;
			return `Round ${standard_round_number}`;
		}
		return round.name;
	}
</script>

<svelte:head><title>{data.game.title} Recap · Clover Trivia</title></svelte:head>

<main class="mx-auto max-w-4xl px-5 py-10 text-[#183d32] md:py-16">
	<header class="border-b border-[#dce7df] pb-7 text-center">
		{#if data.game.location.logo_url}<img
				src={data.game.location.logo_url}
				alt={data.game.location.name}
				class="mx-auto mb-5 max-h-20 max-w-48 object-contain"
			/>{/if}
		<p class="text-xs font-extrabold tracking-[.14em] text-[#238061] uppercase">Game recap</p>
		<h1 class="mt-2 font-[Kanit] text-4xl font-medium tracking-[-.04em] md:text-5xl">
			{data.game.title}
		</h1>
		<p class="mt-2 text-sm text-[#71837a]">
			{data.game.location.name} · {data.game.location.address}
		</p>
		<p class="mt-1 text-sm font-semibold text-[#527466]">
			{format(new Date(data.game.scheduled_at), 'EEEE, MMMM d, yyyy')}
		</p>
		<div class="mt-6 border-t border-[#e8eee9] pt-5">
			<p class="text-xs font-extrabold tracking-[.12em] text-[#71837a] uppercase">
				{data.participant_count}
				{data.participant_count === 1 ? 'team participated' : 'teams participated'}
			</p>
			{#if data.podium.length}<div class="mt-4 grid gap-2 text-left sm:grid-cols-3">
					{#each data.podium as entry, index}<div
							class="relative min-w-0 rounded-xl border border-[#e1e9e3] bg-[#f9fcf9] px-3 py-3"
						>
							<div class="flex items-center gap-1.5 text-xs font-extrabold">
								<Trophy
									size={16}
									class={index === 0
										? 'text-[#bd8a27]'
										: index === 1
											? 'text-[#9aa6af]'
											: 'text-[#b87333]'}
								/>
								<span>{index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : 'rd'}</span>
							</div>
							<p class="absolute top-3 right-3 text-xs font-extrabold text-[#1e624b]">
								{entry.points} pts
							</p>
							<p class="mt-2 truncate pr-11 text-sm font-bold text-[#183d32]">{entry.team.name}</p>
						</div>{/each}
				</div>{/if}
		</div>
	</header>

	<div class="mt-8 grid gap-6">
		{#each data.game.rounds as round}<section
				class="rounded-2xl border border-[#dce7df] bg-white p-5 shadow-sm md:p-7"
			>
				<h2 class="font-[Kanit] text-3xl font-medium text-[#1d684e]">{round_label(round)}</h2>
				<div class="mt-5 grid gap-5">
					{#each round.questions as current_question}<article
							class="border-t border-[#e8eee9] pt-5 first:border-t-0 first:pt-0"
						>
							<div
								class="flex flex-wrap items-center gap-2 text-xs font-extrabold tracking-[.12em] text-[#71837a] uppercase"
							>
								<span>Question {current_question.order}</span>
								{#if round.round_type === 'STANDARD' && current_question.category}<span
										class="rounded-full bg-[#eaf5ec] px-2.5 py-1 text-[#287056]"
										>{current_question.category.name}</span
									>{/if}
							</div>
							<h3 class="mt-1 text-lg leading-7 font-semibold md:text-xl">
								{current_question.question_text}
							</h3>
							{#if current_question.image_url}<img
									src={current_question.image_url}
									alt="Question visual"
									class="mt-4 max-h-80 max-w-full rounded-xl object-contain"
								/>{/if}
							{#if round.round_type === 'HALFTIME' && current_question.items.length}<div
									class="mt-4 rounded-xl bg-[#f3f8f3] px-4 py-3 text-sm text-[#315c4d]"
								>
									<p class="font-extrabold">Answers</p>
									<ol class="mt-2 grid gap-1.5">
										{#each current_question.items as item, index}<li class="flex items-start gap-2">
												<span
													class="grid size-5 shrink-0 place-items-center rounded-full bg-white text-[.65rem] font-extrabold text-[#287056]"
													>{index + 1}</span
												><span>{item.answer_text}</span>
											</li>{/each}
									</ol>
								</div>
							{:else}<div class="mt-4 rounded-xl bg-[#f3f8f3] px-4 py-3 text-sm text-[#315c4d]">
									<span class="font-extrabold">Answer:</span>
									{current_question.correct_answer_text}
								</div>{/if}
							{#if current_question.song_title || current_question.song_artist}<div
									class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#527466]"
								>
									<span class="font-bold">Song</span>
									<span>{current_question.song_title ?? '—'}</span>
									{#if current_question.song_artist}<span class="text-[#90a297]">•</span>
										<span class="font-bold">Artist</span>
										<span>{current_question.song_artist}</span>{/if}
								</div>{/if}
						</article>{/each}
				</div>
			</section>{/each}
	</div>
</main>
