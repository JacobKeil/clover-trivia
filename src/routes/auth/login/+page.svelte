<script lang="ts">
	import { ArrowRight, Check, Sparkles } from '@lucide/svelte';
	import { auth_client } from '$lib/auth_client';
	import { CloverMark } from '$lib/components';

	async function handleGoogleSignIn() {
		await auth_client.signIn.social({
			provider: 'google',
			callbackURL: '/dashboard'
		});
	}
</script>

<svelte:head>
	<title>Sign in · Clover Trivia</title>
	<meta name="description" content="Sign in to build and host better trivia nights with Clover." />
</svelte:head>

<section class="flex min-h-[calc(100vh-72px)] items-center py-10 md:py-16">
	<div
		class="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[#dce7df] bg-white shadow-[0_24px_60px_#163b3212] md:grid-cols-[.9fr_1.1fr]"
	>
		<div class="relative overflow-hidden bg-[#12543f] p-8 text-white md:p-12">
			<div class="absolute -top-24 -left-16 size-60 rounded-full border border-[#5b987d]"></div>
			<div class="absolute -right-28 -bottom-36 size-80 rounded-full border border-[#5b987d]"></div>
			<div class="relative z-10 flex h-full flex-col">
				<a href="/" class="flex items-center gap-2.5"
					><span class="grid size-9 place-items-center rounded-lg bg-white/12 text-[#d6f1df]"
						><CloverMark class="size-5" /></span
					><span class="font-[Kanit] text-xl font-semibold tracking-[-.03em]">Clover Trivia</span
					></a
				>
				<div class="my-14 md:my-auto md:pt-24">
					<div
						class="inline-flex items-center gap-2 text-[.68rem] font-extrabold tracking-[.12em] text-[#b8dfc5] uppercase"
					>
						<Sparkles size={14} /> The host’s home base
					</div>
					<h1
						class="mt-4 font-[Kanit] text-4xl leading-[1.02] font-medium tracking-[-.035em] md:text-5xl"
					>
						Bring your best<br />game night to life.
					</h1>
					<p class="mt-5 max-w-sm leading-7 text-[#c5e3d1]">
						Build your questions, run the room, and make every venue feel like the place to be.
					</p>
				</div>
				<div class="grid gap-3 text-sm text-[#d4eadb]">
					<p class="flex items-center gap-2">
						<Check size={16} class="text-[#a1d9b5]" /> Control the live presentation
					</p>
					<p class="flex items-center gap-2">
						<Check size={16} class="text-[#a1d9b5]" /> Organize every game and venue
					</p>
					<p class="flex items-center gap-2">
						<Check size={16} class="text-[#a1d9b5]" /> Learn from every game night
					</p>
				</div>
			</div>
		</div>

		<div class="flex flex-col justify-center p-8 md:p-12">
			<div class="max-w-sm">
				<p class="text-[.7rem] font-extrabold tracking-[.12em] text-[#258061] uppercase">
					Welcome to Clover
				</p>
				<h2
					class="mt-3 font-[Kanit] text-4xl leading-none font-medium tracking-[-.035em] text-[#173e32]"
				>
					Sign in and host on.
				</h2>
				<p class="mt-4 leading-7 text-[#6a7f74]">
					Use your Google account to access your games, locations, and host dashboard.
				</p>
				<button
					type="button"
					onclick={handleGoogleSignIn}
					class="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-lg border border-[#d6dfd8] bg-white px-5 py-3.5 text-sm font-bold text-[#29493e] shadow-sm transition hover:-translate-y-px hover:border-[#a7cdb3] hover:bg-[#f8fbf8] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#2d8969] focus-visible:ring-offset-2"
					><svg class="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true"
						><path
							fill="#4285F4"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/><path
							fill="#34A853"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
						/><path
							fill="#FBBC05"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/><path
							fill="#EA4335"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
						/></svg
					>Continue with Google <ArrowRight size={17} /></button
				>
				<p class="mt-5 text-center text-xs leading-5 text-[#82938a]">
					By continuing, you agree to use Clover Trivia to create excellent game nights.
				</p>
			</div>
		</div>
	</div>
</section>
