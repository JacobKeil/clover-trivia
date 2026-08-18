<script lang="ts">
	import { Home, RefreshCw, SearchX, TriangleAlert } from '@lucide/svelte';
	import { page } from '$app/state';
	import { CloverMark } from '$lib/components';

	let is_not_found = $derived(page.status === 404);
	let title = $derived(
		is_not_found ? 'That page wandered off.' : 'Something interrupted the game.'
	);
	let description = $derived(
		is_not_found
			? "The link may be out of date, or this page may not exist. Let's get you back to a familiar place."
			: 'The page could not be loaded right now. Try again, or return home and continue from there.'
	);

	function reload_page() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Page not found' : 'Something went wrong'} — Clover Trivia</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main
	class="relative grid min-h-screen place-items-center overflow-hidden bg-[#f6faf5] px-5 py-10 text-[#173f33]"
>
	<div class="absolute -top-28 -left-20 size-80 rounded-full bg-[#d7ecda]"></div>
	<div class="absolute right-[-7rem] bottom-[-10rem] size-110 rounded-full bg-[#cce6d4]"></div>

	<section
		class="relative w-full max-w-xl rounded-2xl border border-[#d5e5d8] bg-white p-7 text-center shadow-[0_24px_64px_#173f3321] sm:p-10"
	>
		<a
			href="/"
			class="inline-flex items-center gap-2 text-[#176249] transition hover:text-[#0f513d]"
		>
			<span class="grid size-9 place-items-center rounded-lg bg-[#176249] text-[#d6f1df]"
				><CloverMark class="size-5" /></span
			>
			<span class="font-[Kanit] text-xl font-semibold tracking-[-.03em]">Clover Trivia</span>
		</a>

		<div
			class="mx-auto mt-8 grid size-18 place-items-center rounded-2xl {is_not_found
				? 'bg-[#e4f2e7] text-[#247355]'
				: 'bg-[#fff1db] text-[#ae6d19]'}"
		>
			{#if is_not_found}
				<SearchX size={34} strokeWidth={1.8} />
			{:else}
				<TriangleAlert size={34} strokeWidth={1.8} />
			{/if}
		</div>

		<p class="mt-6 text-xs font-extrabold tracking-[.16em] text-[#4c866f] uppercase">
			Error {page.status}
		</p>
		<h1 class="mt-2 font-[Kanit] text-4xl font-semibold tracking-[-.035em] sm:text-5xl">{title}</h1>
		<p class="mx-auto mt-4 max-w-md leading-7 text-[#5b7167]">{description}</p>

		<div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
			<a
				href="/"
				class="inline-flex items-center justify-center gap-2 rounded-md bg-[#176249] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_16px_#17624923] transition hover:bg-[#0f513d]"
				><Home size={17} /> Go home</a
			>
			{#if !is_not_found}
				<button
					type="button"
					onclick={reload_page}
					class="inline-flex items-center justify-center gap-2 rounded-md border border-[#cbdcd0] bg-white px-5 py-3 text-sm font-bold text-[#315f50] transition hover:bg-[#edf5ef]"
					><RefreshCw size={17} /> Try again</button
				>
			{/if}
		</div>

		{#if !is_not_found && page.error?.message}
			<p class="mt-6 text-xs text-[#7b8d84]">{page.error.message}</p>
		{/if}
	</section>
</main>
