<script lang="ts">
	import { CheckCircle2, CircleAlert, Info, X } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import { toast } from '$lib/toast.svelte';

	const styles = {
		success: 'border-[#b9dfc4] bg-[#f4fbf5] text-[#174735]',
		error: 'border-rose-200 bg-rose-50 text-rose-900',
		info: 'border-sky-200 bg-sky-50 text-sky-950'
	};
</script>

<div
	class="pointer-events-none fixed top-4 left-4 z-[110] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
	aria-live="polite"
	aria-atomic="true"
>
	{#each toast.items as item (item.id)}
		<div
			in:fly={{ y: 12, duration: 180 }}
			out:fly={{ x: 32, opacity: 0, duration: 200 }}
			class={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl ${styles[item.kind]}`}
			role={item.kind === 'error' ? 'alert' : 'status'}
		>
			{#if item.kind === 'success'}
				<CheckCircle2 class="mt-0.5 shrink-0" size={18} />
			{:else if item.kind === 'error'}
				<CircleAlert class="mt-0.5 shrink-0" size={18} />
			{:else}
				<Info class="mt-0.5 shrink-0" size={18} />
			{/if}
			<p class="min-w-0 flex-1 leading-5">{item.message}</p>
			<button
				type="button"
				class="-mr-1 rounded p-1 opacity-65 transition hover:bg-black/5 hover:opacity-100"
				aria-label="Dismiss notification"
				onclick={() => toast.dismiss(item.id)}
			>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>
