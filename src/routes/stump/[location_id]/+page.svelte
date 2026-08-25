<script lang="ts">
	let { data, form } = $props();
	let team_search = $state('');
	let selected_team_id = $state('');
	let is_team_picker_open = $state(false);
	let team_picker_error = $state(false);
	let matching_teams = $derived(
		team_search.trim().length >= 2
			? data.teams.filter((team) =>
					team.name.toLowerCase().includes(team_search.trim().toLowerCase())
				)
			: []
	);

	function select_team(team: { id: string; name: string }) {
		selected_team_id = team.id;
		team_search = team.name;
		team_picker_error = false;
		is_team_picker_open = false;
	}
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
			</div>{:else}<form
				method="POST"
				action="?/submit"
				class="mt-6 grid gap-5"
				onsubmit={(event) => {
					if (selected_team_id) return;
					event.preventDefault();
					team_picker_error = true;
					is_team_picker_open = true;
				}}
			>
				{#if form?.message}<p
						class="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
					>
						{form.message}
					</p>{/if}
				<div class="grid gap-1.5 text-sm font-bold">
					<label for="stump-team-search">Your team</label>
					<input type="hidden" name="team_id" value={selected_team_id} />
					<div class="relative">
						<input
							id="stump-team-search"
							autocomplete="off"
							placeholder="Type at least 2 letters to find your team"
							bind:value={team_search}
							aria-expanded={is_team_picker_open}
							aria-controls="stump-team-results"
							aria-invalid={team_picker_error}
							oninput={() => {
								selected_team_id = '';
								team_picker_error = false;
								is_team_picker_open = true;
							}}
							onfocus={() => (is_team_picker_open = true)}
							class="h-11 w-full rounded-md border border-[#d6e1d8] bg-white px-3 font-medium outline-none focus:border-[#238061] focus:ring-2 focus:ring-[#238061]/15 aria-[invalid=true]:border-rose-500"
						/>
						{#if is_team_picker_open}<div
								id="stump-team-results"
								role="listbox"
								class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[#d6e1d8] bg-white p-1 shadow-lg"
							>
								{#if team_search.trim().length < 2}<p
										class="px-3 py-2 text-sm font-normal text-[#71837a]"
									>
										Type at least 2 letters to search for your team.
									</p>
								{:else if matching_teams.length}{#each matching_teams as team}<button
											type="button"
											role="option"
											aria-selected={selected_team_id === team.id}
											onmousedown={(event) => event.preventDefault()}
											onclick={() => select_team(team)}
											class="block w-full rounded-sm px-3 py-2 text-left text-sm font-semibold text-[#315c4d] hover:bg-[#eff8f1] focus:bg-[#eff8f1] focus:outline-none"
											>{team.name}</button
										>{/each}
								{:else}<p class="px-3 py-2 text-sm font-normal text-[#71837a]">
										No teams match that search.
									</p>{/if}
							</div>{/if}
					</div>
					{#if selected_team_id}<p class="text-xs font-semibold text-[#287056]">
							Selected: {team_search}
						</p>{:else}<p class="text-xs font-normal text-[#71837a]">
							Choose your team from the matching results.
						</p>{/if}
					{#if team_picker_error}<p class="text-xs font-semibold text-rose-700">
							Choose your team from the search results before submitting.
						</p>{/if}
				</div>
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
