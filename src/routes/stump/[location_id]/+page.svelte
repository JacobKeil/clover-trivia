<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Stump the Host · {data.location.name}</title></svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center px-5 py-12 text-[#183d32]">
	<section
		class="w-full rounded-2xl border border-[#dce7df] bg-white p-6 shadow-[0_20px_45px_#163b3212] md:p-8"
	>
		<p class="text-xs font-extrabold tracking-[.14em] text-[#238061] uppercase">
			{data.location.name}
		</p>
		<h1 class="mt-2 font-[Kanit] text-4xl font-medium tracking-[-.04em]">Stump the Host</h1>
		<p class="mt-3 text-sm leading-6 text-[#71837a]">
			Submit one great question for your team. The host may draw it during tonight’s game.
		</p>
		{#if !data.game}<p class="mt-6 rounded-xl bg-[#f7faf7] p-4 text-sm text-[#527466]">
				There is no upcoming game ready for submissions yet.
			</p>{:else if !data.teams.length}<p
				class="mt-6 rounded-xl bg-[#f7faf7] p-4 text-sm text-[#527466]"
			>
				Ask the host to add your team first, then return here to submit your question.
			</p>{:else if form?.success}<div
				class="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
			>
				Your question is in. Good luck stumping the host!
			</div>{:else}<form method="POST" action="?/submit" class="mt-6 grid gap-5">
				{#if form?.message}<p
						class="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
					>
						{form.message}
					</p>{/if}
				<label class="grid gap-1.5 text-sm font-bold"
					>Your team
					<select
						required
						name="team_id"
						class="h-11 rounded-md border border-[#d6e1d8] bg-white px-3 font-medium"
					>
						<option value="" disabled selected>Choose your team</option>
						{#each data.teams as team}<option value={team.id}>{team.name}</option>{/each}
					</select>
				</label>
				<label class="grid gap-1.5 text-sm font-bold"
					>Question for the host
					<textarea
						required
						name="question_text"
						rows="4"
						maxlength="1000"
						placeholder="Write your question…"
						class="resize-y rounded-md border border-[#d6e1d8] p-3 font-normal"></textarea>
				</label>
				<label class="grid gap-1.5 text-sm font-bold"
					>Correct answer
					<textarea
						required
						name="answer_text"
						rows="3"
						maxlength="1000"
						placeholder="Tell the host the answer…"
						class="resize-y rounded-md border border-[#d6e1d8] p-3 font-normal"></textarea>
				</label>
				<button class="rounded-md bg-[#176249] px-4 py-3 text-sm font-bold text-white"
					>Submit question</button
				>
			</form>{/if}
	</section>
</main>
