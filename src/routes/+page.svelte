<script lang="ts">
	import {
		ArrowRight,
		BarChart3,
		Check,
		ExternalLink,
		MapPin,
		MonitorUp,
		Play,
		Sparkles,
		Trophy
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Clover Trivia — Better nights, brilliantly hosted</title>
	<meta name="description" content="Run unforgettable trivia nights with Clover Trivia." />
</svelte:head>

<div class="overflow-hidden bg-white pt-5 text-[#163b32]">
	<section
		class="mx-auto grid min-h-[calc(100vh-7.1rem)] max-w-7xl grid-cols-1 items-center gap-4 px-5 py-10 md:grid-cols-[.94fr_1.06fr] md:gap-16 md:py-16"
	>
		<div class="max-w-[590px]">
			<div
				class="inline-flex items-center gap-2 text-[.72rem] font-extrabold tracking-[.11em] text-[#17735c] uppercase"
			>
				<Sparkles size={15} /> Built for the people running the room
			</div>
			<h1
				class="mt-4 font-[Kanit] text-[clamp(3.25rem,5.6vw,5.9rem)] leading-[.96] font-semibold tracking-[-.035em]"
			>
				Trivia nights that <span class="text-[#278667]">run themselves.</span>
			</h1>
			<p class="mt-6 max-w-[515px] text-[1.05rem] leading-7 text-[#52675f]">
				Clover gives every host one calm, capable home for building games, controlling the room, and
				growing a loyal trivia crowd.
			</p>
			<div class="mt-8 flex flex-wrap gap-3">
				<a
					class="inline-flex items-center justify-center gap-2 rounded-md bg-[#176249] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_22px_#17624927] transition hover:bg-[#10523d]"
					href={data.user ? '/dashboard' : '/auth/login'}>Start hosting <ArrowRight size={18} /></a
				>
				<a
					class="inline-flex items-center justify-center gap-2 rounded-md border border-[#cfd8d1] bg-[#fbfcf8] px-5 py-3.5 text-sm font-bold text-[#264a3e] transition hover:bg-[#eef5ef]"
					href="#how-it-works"><Play size={16} fill="currentColor" /> See how it works</a
				>
			</div>
			<div class="mt-8 flex items-center gap-3 text-xs text-[#708178]">
				<div class="flex pl-1">
					<span
						class="-ml-1 grid size-7 place-items-center rounded-full border-2 border-white bg-[#dc9f75] text-[.58rem] font-extrabold text-white"
						>J</span
					><span
						class="-ml-1 grid size-7 place-items-center rounded-full border-2 border-white bg-[#57746d] text-[.58rem] font-extrabold text-white"
						>M</span
					><span
						class="-ml-1 grid size-7 place-items-center rounded-full border-2 border-white bg-[#b86d59] text-[.58rem] font-extrabold text-white"
						>A</span
					>
				</div>
				<p><strong class="text-[#38584c]">Made for hosts</strong> who want a better game night</p>
			</div>
		</div>

		<div class="relative mx-auto w-full max-w-[650px] pt-8 pr-0 pb-11 pl-0 md:pl-5">
			<div
				class="absolute top-[4%] right-[1%] bottom-[2%] left-[8%] -rotate-6 rounded-[45%_55%_50%_32%] bg-[#d9ead6]"
			></div>
			<div
				class="relative overflow-hidden rounded-xl border-[5px] border-white shadow-[0_28px_55px_#14362a26]"
			>
				<div class="flex h-11 items-center gap-3 bg-[#f7f8f5] px-3 text-[#7f9288]">
					<div class="flex gap-1">
						<i class="size-1.5 rounded-full bg-[#e38d75]"></i><i
							class="size-1.5 rounded-full bg-[#d2d8d2]"
						></i><i class="size-1.5 rounded-full bg-[#d2d8d2]"></i>
					</div>
					<div class="max-w-[300px] flex-1 rounded bg-[#e9ede8] px-2 py-1 text-[.61rem]">
						present.clovertrivia.com / harbor-house
					</div>
					<ExternalLink size={15} />
				</div>
				<div
					class="relative flex min-h-[300px] flex-col items-center justify-center bg-[radial-gradient(circle_at_82%_18%,#2b7d68_0,transparent_26%),linear-gradient(135deg,#0a3e32,#165f4e)] p-7 text-center text-white md:min-h-[370px]"
				>
					<div
						class="absolute top-5 right-5 left-5 flex justify-between text-[.56rem] font-extrabold tracking-[.12em] text-[#a5d0be]"
					>
						<span>ROUND 03</span><span>QUESTION 07 / 10</span>
					</div>
					<div
						class="mb-5 grid size-12 place-items-center rounded-full border border-[#a4dbbf] text-xl text-[#b9e9cf]"
					>
						✦
					</div>
					<p class="text-[.62rem] font-extrabold tracking-[.16em] text-[#93c9af]">
						CATEGORY · WORLD WONDERS
					</p>
					<h2
						class="mt-3 max-w-[460px] font-[Kanit] text-[clamp(1.55rem,3vw,2.65rem)] leading-[1.1] font-medium"
					>
						Which city is home to the ancient Colosseum?
					</h2>
					<div class="mt-5 h-0.5 w-[70px] bg-[#88c7aa]"></div>
					<div
						class="absolute right-5 bottom-4 left-5 flex justify-between text-[.51rem] font-extrabold tracking-[.12em] text-[#96bbae]"
					>
						<span>HARBOR HOUSE TRIVIA</span><span>clover trivia</span>
					</div>
				</div>
			</div>
			<div
				class="absolute right-0 bottom-0 flex min-w-[220px] items-center gap-3 rounded-lg border border-[#e6ebe5] bg-white px-3 py-3 shadow-[0_14px_30px_#173b2d1a] md:right-[-.5rem] md:min-w-[255px]"
			>
				<div class="grid size-8 place-items-center rounded-md bg-[#e2f1e8] text-[#1b7659]">
					<MonitorUp size={19} />
				</div>
				<div class="flex flex-col text-xs text-[#24483b]">
					<strong>Presentation is live</strong><span class="text-[.62rem] text-[#788b81]"
						>Updates the moment you advance</span
					>
				</div>
				<div class="ml-auto size-2 rounded-full bg-[#50b66c] shadow-[0_0_0_4px_#e1f5e5]"></div>
			</div>
		</div>
	</section>

	<section class="-mx-1 overflow-hidden border-y border-[#dfe6de] bg-[#edf2e9] whitespace-nowrap">
		<div
			class="flex min-w-max items-center justify-around gap-10 px-4 py-4 text-[.72rem] font-extrabold tracking-[.13em] text-[#315e50]"
		>
			<span>LIVE PRESENTATIONS</span><b class="text-base text-[#71a587]">✦</b><span
				>SMART GAME MANAGEMENT</span
			><b class="text-base text-[#71a587]">✦</b><span>LOCATION INSIGHTS</span><b
				class="text-base text-[#71a587]">✦</b
			><span>HAPPIER PLAYERS</span><b class="text-base text-[#71a587]">✦</b>
		</div>
	</section>

	<section class="mx-auto max-w-7xl px-5 py-20 md:py-28" id="how-it-works">
		<div class="mx-auto mb-12 max-w-[620px] text-center">
			<div
				class="inline-flex items-center gap-2 text-[.72rem] font-extrabold tracking-[.11em] text-[#17735c] uppercase"
			>
				<Sparkles size={15} /> Everything in one place
			</div>
			<h2
				class="mt-3 font-[Kanit] text-[clamp(2.3rem,4vw,3.7rem)] leading-[1.05] font-medium tracking-[-.035em]"
			>
				Spend less time managing.<br /><span class="text-[#278667]">Make more room for magic.</span>
			</h2>
			<p class="mx-auto mt-4 max-w-[510px] leading-7 text-[#64776d]">
				From first question to final score, Clover handles the details that pull you away from your
				crowd.
			</p>
		</div>
		<div class="grid gap-4 md:grid-cols-[1.16fr_.92fr_.92fr]">
			<article
				class="relative flex min-h-[300px] flex-col overflow-hidden rounded-xl border border-[#dde5dc] bg-[#dcefe2] p-6 md:min-h-[355px]"
			>
				<div class="mb-5 grid size-10 place-items-center rounded-lg bg-[#17624a] text-white">
					<MonitorUp size={22} />
				</div>
				<div>
					<p class="text-[.61rem] font-extrabold tracking-[.13em] text-[#49816b]">
						LIVE &amp; IN SYNC
					</p>
					<h3 class="my-2 font-[Kanit] text-[1.65rem] leading-[1.05] font-medium">
						Your game, on every screen.
					</h3>
					<p class="max-w-[390px] text-sm leading-6 text-[#63766d]">
						Pop out a polished presentation for your venue. Advance a question on your dashboard and
						the room sees it instantly.
					</p>
				</div>
				<div
					class="mx-auto mt-6 mb-[-3.1rem] w-[83%] rounded-t-md bg-white p-2 shadow-[0_-4px_22px_#42725a2a]"
				>
					<div class="flex flex-col gap-1 bg-[#155e4a] p-4 text-white">
						<span class="text-[.45rem] tracking-[.14em] text-[#a3d7bc]">QUESTION 7</span><strong
							class="font-[Kanit] text-xl leading-[1.05] font-medium"
							>Where the game<br />comes alive.</strong
						><i class="mt-1 h-px w-8 bg-[#9bd4b9]"></i>
					</div>
				</div>
			</article>
			<article
				class="flex min-h-[300px] flex-col overflow-hidden rounded-xl border border-[#dde5dc] bg-[#fbfcf8] p-6 md:min-h-[355px]"
			>
				<div class="mb-5 grid size-10 place-items-center rounded-lg bg-[#df8059] text-white">
					<MapPin size={22} />
				</div>
				<p class="text-[.61rem] font-extrabold tracking-[.13em] text-[#49816b]">YOUR VENUES</p>
				<h3 class="my-2 font-[Kanit] text-[1.65rem] leading-[1.05] font-medium">
					Every location,<br />beautifully organized.
				</h3>
				<p class="text-sm leading-6 text-[#63766d]">
					Keep schedules, hosts, and games tied to the places that make your nights special.
				</p>
				<a
					class="mt-auto flex items-center gap-1 pt-5 text-xs font-extrabold text-[#176249]"
					href="/locations/create">Create a location <ArrowRight size={16} /></a
				>
			</article>
			<article
				class="flex min-h-[300px] flex-col overflow-hidden rounded-xl border border-[#dde5dc] bg-[#fbfcf8] p-6 md:min-h-[355px]"
			>
				<div class="mb-5 grid size-10 place-items-center rounded-lg bg-[#7166ae] text-white">
					<BarChart3 size={22} />
				</div>
				<p class="text-[.61rem] font-extrabold tracking-[.13em] text-[#49816b]">
					LOOK BACK, GET BETTER
				</p>
				<h3 class="my-2 font-[Kanit] text-[1.65rem] leading-[1.05] font-medium">
					Know what keeps them coming back.
				</h3>
				<p class="text-sm leading-6 text-[#63766d]">
					Explore game history and venue stats to turn a good recurring night into a great one.
				</p>
				<div class="mt-auto flex items-end gap-4 pt-5">
					<div class="flex flex-col">
						<strong class="font-[Kanit] text-3xl leading-none text-[#4a4384]">92%</strong><span
							class="text-[.62rem] text-[#7e8490]">returning teams</span
						>
					</div>
					<div class="flex h-8 items-end gap-1">
						<i class="h-[28%] w-1 rounded bg-[#b6ade0]"></i><i
							class="h-[45%] w-1 rounded bg-[#b6ade0]"
						></i><i class="h-[37%] w-1 rounded bg-[#b6ade0]"></i><i
							class="h-[70%] w-1 rounded bg-[#b6ade0]"
						></i><i class="h-[58%] w-1 rounded bg-[#b6ade0]"></i><i
							class="h-full w-1 rounded bg-[#7265ad]"
						></i>
					</div>
				</div>
			</article>
		</div>
	</section>

	<section
		class="-mx-1 grid gap-12 bg-[#eaf1e8] px-5 py-16 md:grid-cols-2 md:items-center md:gap-[7vw] md:px-[max(1.25rem,5vw)]"
	>
		<div class="relative mx-auto min-h-[290px] w-full max-w-[550px] md:min-h-[330px]">
			<div
				class="absolute top-0 right-0 left-[2%] rounded-xl border border-[#e4ebe4] bg-white p-5 text-[#23463a] shadow-[0_20px_35px_#315b4919] md:left-[7%] md:p-6"
			>
				<div
					class="flex items-center justify-between text-[.55rem] font-extrabold tracking-[.1em] text-[#81948a]"
				>
					<span>TONIGHT’S GAME</span><i class="size-2 rounded-full bg-[#59b976]"></i>
				</div>
				<strong class="mt-5 block font-[Kanit] text-2xl font-medium">Wednesday Trivia</strong><small
					class="text-xs text-[#75877f]">Harbor House · 7:00 PM</small
				>
				<div class="my-5 h-1 rounded-full bg-[#edf2ee]">
					<span class="block h-full w-[70%] rounded-full bg-[#2b8767]"></span>
				</div>
				<div class="flex items-center gap-3 rounded-md bg-[#f1f6f0] p-3">
					<span class="text-[.55rem] font-extrabold text-[#63957e]">UP NEXT</span><b
						class="text-[.7rem]">Round 3 · Question 7</b
					><button
						class="ml-auto grid size-7 place-items-center rounded bg-[#196349] text-white"
						aria-label="Advance to next question"><ArrowRight size={17} /></button
					>
				</div>
			</div>
			<div
				class="absolute bottom-0 left-0 flex items-center gap-3 rounded-lg border border-[#e8dfb4] bg-[#fffdf2] px-4 py-3 text-[#936f18] shadow-[0_14px_25px_#8c76451a]"
			>
				<Trophy size={18} />
				<div class="flex flex-col">
					<small class="text-[.5rem] font-extrabold tracking-[.08em]">LAST GAME’S WINNERS</small
					><strong class="font-[Kanit] text-sm text-[#59481c]">The Fact Finders</strong>
				</div>
				<b class="ml-2 font-[Kanit] text-xl">1st</b>
			</div>
		</div>
		<div>
			<div
				class="inline-flex items-center gap-2 text-[.72rem] font-extrabold tracking-[.11em] text-[#17735c] uppercase"
			>
				<Check size={15} /> A host’s best friend
			</div>
			<h2
				class="mt-3 font-[Kanit] text-[clamp(2.3rem,4vw,3.7rem)] leading-[1.05] font-medium tracking-[-.035em]"
			>
				Walk in prepared.<br />Walk out proud.
			</h2>
			<p class="mt-5 max-w-[490px] leading-7 text-[#63766d]">
				Build your game ahead of time, then host with everything exactly where you need it. No
				frantic tab switching. No lost scores. Just a room full of people having a great night.
			</p>
			<ul class="my-6 grid gap-3 text-sm font-semibold text-[#31574a]">
				<li class="flex items-center gap-2">
					<Check size={16} class="text-[#258565]" /> Build games round by round
				</li>
				<li class="flex items-center gap-2">
					<Check size={16} class="text-[#258565]" /> Run the live host dashboard
				</li>
				<li class="flex items-center gap-2">
					<Check size={16} class="text-[#258565]" /> Keep a complete history of every game
				</li>
			</ul>
			<a
				class="inline-flex items-center gap-2 text-sm font-extrabold text-[#176249]"
				href="/games/create">Create your first game <ArrowRight size={17} /></a
			>
		</div>
	</section>

	<section
		class="relative mx-1 mt-16 mb-5 overflow-hidden rounded-2xl bg-[#12543f] text-center text-white md:mx-5 md:mt-24"
	>
		<div class="absolute -top-45 -left-18 size-[350px] rounded-full border border-[#4e8d75]"></div>
		<div
			class="absolute -right-35 -bottom-75 size-[450px] rounded-full border border-[#4e8d75]"
		></div>
		<div class="relative z-10 px-4 py-16 md:py-22">
			<div class="text-2xl text-[#a7d8bd]">✦</div>
			<h2
				class="mt-3 font-[Kanit] text-[clamp(2.2rem,4.2vw,4rem)] leading-[1.05] font-medium tracking-[-.035em]"
			>
				Make your next trivia night<br /><span class="text-[#aeddbd]">your best one yet.</span>
			</h2>
			<p class="mt-4 text-[.98rem] text-[#bfdece]">
				Everything you need to host a room they’ll be talking about all week.
			</p>
			<a
				class="mt-7 inline-flex items-center gap-2 rounded-md bg-[#f6f8f2] px-5 py-3.5 text-sm font-bold text-[#15523f] transition hover:bg-white"
				href={data.user ? '/dashboard' : '/auth/login'}
				>Get started with Clover <ArrowRight size={18} /></a
			>
		</div>
	</section>

	<footer
		class="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 pt-3 pb-8 text-xs text-[#71837a]"
	>
		<span>© {new Date().getFullYear()} Clover Trivia</span><span class="w-full md:ml-auto md:w-auto"
			>Made for memorable game nights.</span
		>
		<div class="flex gap-4">
			<a href="/auth/login">Sign in</a><a href="/dashboard">Dashboard</a>
		</div>
	</footer>
</div>
