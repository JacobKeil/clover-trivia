<script lang="ts">
	import { BarChart3, CalendarCheck, ClipboardCheck, Trophy, UsersRound } from '@lucide/svelte';

	let { data } = $props();
	let top_attendance = $derived(
		Math.max(...data.stats.team_stats.map((team) => team.attendance_rate), 1)
	);

	const metrics = $derived([
		{
			label: 'Games played',
			value: data.stats.games_played,
			icon: CalendarCheck,
			tone: 'bg-emerald-50 text-emerald-700'
		},
		{
			label: 'Teams seen',
			value: data.stats.teams_played,
			icon: UsersRound,
			tone: 'bg-sky-50 text-sky-700'
		},
		{
			label: 'Avg. teams / game',
			value: data.stats.average_teams,
			icon: Trophy,
			tone: 'bg-sky-50 text-sky-700'
		},
		{
			label: 'Questions scored',
			value: data.stats.questions_scored,
			icon: ClipboardCheck,
			tone: 'bg-rose-50 text-rose-700'
		}
	]);
</script>

<svelte:head><title>{data.location.name} Stats · Clover Trivia</title></svelte:head>

<section class="mx-auto max-w-6xl py-8 text-[#183d32] md:py-12">
	<a
		href="/dashboard"
		class="inline-flex items-center gap-1 text-sm font-bold text-[#246d52] hover:underline"
		>← Dashboard</a
	>

	<div
		class="mt-5 rounded-3xl border border-[#dce7df] bg-[linear-gradient(120deg,#f4fbf6_0%,#ffffff_55%,#f4f8ff_100%)] p-6 shadow-[0_12px_32px_#163b320d] md:p-8"
	>
		<div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p
					class="flex items-center gap-2 text-xs font-extrabold tracking-[.14em] text-[#238061] uppercase"
				>
					<BarChart3 size={15} /> Location statistics
				</p>
				<h1 class="mt-2 font-[Kanit] text-4xl font-medium tracking-[-.04em] md:text-5xl">
					{data.location.name}
				</h1>
				<p class="mt-2 max-w-xl text-sm text-[#6a7f74]">
					See which teams return, how accurately they answer, and the topics where each team shines.
				</p>
			</div>
			<div class="rounded-2xl border border-[#cde4d4] bg-white/80 px-4 py-3 text-right shadow-sm">
				<p class="text-[.65rem] font-extrabold tracking-[.12em] text-[#71837a] uppercase">
					Based on
				</p>
				<p class="mt-0.5 font-[Kanit] text-2xl font-medium text-[#1d684e]">
					{data.stats.games_played} completed {data.stats.games_played === 1 ? 'game' : 'games'}
				</p>
			</div>
		</div>
	</div>

	<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each metrics as metric}
			{@const MetricIcon = metric.icon}
			<div class="rounded-2xl border border-[#dce7df] bg-white p-5 shadow-[0_6px_18px_#163b320a]">
				<div class="flex items-start justify-between gap-3">
					<p class="text-xs font-extrabold tracking-[.1em] text-[#71837a] uppercase">
						{metric.label}
					</p>
					<span class="grid size-9 place-items-center rounded-xl {metric.tone}"
						><MetricIcon size={18} /></span
					>
				</div>
				<strong class="mt-4 block font-[Kanit] text-4xl font-medium text-[#1d684e]"
					>{metric.value}</strong
				>
			</div>
		{/each}
	</div>

	<section
		class="mt-6 rounded-2xl border border-[#dce7df] bg-white p-5 shadow-[0_6px_18px_#163b320a] md:p-6"
	>
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="font-[Kanit] text-2xl font-medium">Team performance</h2>
				<p class="mt-1 text-sm text-[#71837a]">
					Turnout, correct-answer rate, and strongest category.
				</p>
			</div>
			<UsersRound size={20} class="text-[#27735a]" />
		</div>

		{#if data.stats.team_stats.length}
			<div class="mt-7 grid gap-4 md:grid-cols-2">
				{#each data.stats.team_stats.slice(0, 8) as current_team}
					<div
						class="rounded-2xl border border-[#dce7df] bg-[linear-gradient(135deg,#ffffff_0%,#f7fbf8_100%)] p-4 shadow-[0_4px_14px_#163b3208]"
					>
						<div class="flex items-center justify-between gap-3 text-sm">
							<span class="min-w-0 truncate font-[Kanit] text-xl font-medium"
								>{current_team.name}</span
							>
							<span
								class="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[.65rem] font-extrabold tracking-[.06em] text-emerald-700 uppercase"
								>{current_team.attendance_rate}% turnout</span
							>
						</div>
						<div class="mt-3 h-2.5 overflow-hidden rounded-full bg-[#edf3ee]">
							<div
								class="h-full rounded-full bg-[linear-gradient(90deg,#25765a,#4eb184)] transition-[width] duration-500"
								style:width={`${(current_team.attendance_rate / top_attendance) * 100}%`}
							></div>
						</div>
						<div
							class="mt-4 grid grid-cols-3 divide-x divide-[#e5eee7] rounded-xl border border-[#e5eee7] bg-white/80 py-2.5 text-center"
						>
							<div>
								<p class="text-[.58rem] font-extrabold tracking-[.08em] text-[#71837a] uppercase">
									Correct
								</p>
								<p class="mt-0.5 font-[Kanit] text-lg font-medium text-sky-700">
									{current_team.correct_rate}%
								</p>
							</div>
							<div>
								<p class="text-[.58rem] font-extrabold tracking-[.08em] text-[#71837a] uppercase">
									Avg. points
								</p>
								<p class="mt-0.5 font-[Kanit] text-lg font-medium text-[#1d684e]">
									{current_team.average_points}
								</p>
							</div>
							<div>
								<p class="text-[.58rem] font-extrabold tracking-[.08em] text-[#71837a] uppercase">
									Avg. finish
								</p>
								<p class="mt-0.5 font-[Kanit] text-lg font-medium text-[#315c4d]">
									{current_team.average_placement === null
										? '—'
										: `#${current_team.average_placement}`}
								</p>
							</div>
						</div>
						{#if current_team.best_category}<div
								class="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800"
							>
								<span class="font-extrabold tracking-[.06em] uppercase">Best category</span><span
									class="ml-2 font-semibold"
									>{current_team.best_category.name} · {current_team.best_category.accuracy}%</span
								>
							</div>{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="mt-6 rounded-xl bg-[#f7faf7] p-4 text-sm text-[#71837a]">
				Complete a game to start seeing team performance trends.
			</p>
		{/if}
	</section>
</section>
