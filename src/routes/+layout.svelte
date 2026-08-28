<script lang="ts">
	import '../app.css';
	import '@friendofsvelte/tipex/styles/index.css';
	import { page } from '$app/state';
	import { NetworkActivityIndicator, ToastViewport } from '$lib/components';

	let { children, data } = $props();
	let is_presentation_popout = $derived(page.url.searchParams.get('presentation') === '1');
</script>

<main class="min-h-screen bg-white font-sans text-slate-900">
	<NetworkActivityIndicator />
	<ToastViewport />
	{#if !is_presentation_popout}<nav
			class="sticky top-0 z-50 border-b border-[#e6ece7] bg-white/90 backdrop-blur-md"
		>
			<div class="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-5">
				<a href="/" class="group flex items-center gap-1.5 text-[#143f33]">
					<span class="grid size-9 place-items-center transition group-hover:-rotate-6"
						><img src="/clover.png" alt="" class="size-[25px] object-contain" /></span
					>
					<span class="font-[Kanit] text-xl font-semibold tracking-[-.03em]">Clover Trivia</span>
				</a>
				<div class="flex items-center gap-1 text-sm font-semibold text-[#5d7168]">
					<a
						href="/"
						class="rounded-md px-3 py-2 transition hover:bg-[#edf5ef] hover:text-[#176249]">Home</a
					>
					{#if data.user}
						<a
							href="/dashboard"
							class="rounded-md px-3 py-2 transition hover:bg-[#edf5ef] hover:text-[#176249]"
							>Dashboard</a
						>
					{/if}
					<div class="ml-1 border-l border-[#e1e8e2] pl-2">
						{#if data.user}
							<a href="/profile" aria-label="Open your profile" class="block rounded-full">
								{#if data.user.image}
									<img
										src={data.user.image}
										alt="Your profile"
										class="size-9 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-[#d9e5dc]"
										referrerpolicy="no-referrer"
									/>
								{:else}
									<span class="grid size-9 place-items-center rounded-full bg-[#e6f3e9] text-sm font-bold text-[#176249]"
										>{data.user.name?.trim().charAt(0).toUpperCase() || 'H'}</span
									>
								{/if}
							</a>
						{:else}
							<a
								href="/auth/login"
								class="inline-flex rounded-md bg-[#176249] px-4 py-2 text-white shadow-[0_5px_12px_#17624920] transition hover:-translate-y-px hover:bg-[#0f513d]"
								>Sign in</a
							>
						{/if}
					</div>
				</div>
			</div>
		</nav>{/if}
	<section
		class={is_presentation_popout
			? 'h-screen w-screen overflow-hidden'
			: 'mx-auto min-h-[calc(100vh-72px)] w-full max-w-7xl px-4'}
	>
		{@render children()}
	</section>
</main>
