<script lang="ts">
	import { Combobox } from 'bits-ui';

	let {
		value = $bindable(),
		options = [],
		placeholder = 'Choose venue...',
		disabled = false,
		on_create_location
	}: {
		value: string | undefined;
		options: { label: string; value: string }[];
		placeholder?: string;
		disabled?: boolean;
		on_create_location: () => void;
	} = $props();

	let open = $state(false);
	let search = $state('');
	let selected_label = $derived(options.find((option) => option.value === value)?.label ?? '');
	let filtered_options = $derived(
		options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase()))
	);
</script>

<Combobox.Root
	type="single"
	items={options}
	bind:value
	bind:open
	{disabled}
	inputValue={selected_label}
>
	<Combobox.Input
		{placeholder}
		{disabled}
		oninput={(event) => (search = event.currentTarget.value)}
		onfocus={() => (open = true)}
		class="bg-surface-100 text-surface-content h-9 w-full rounded-md border border-secondary/20 px-3 text-xs shadow-xs focus:border-primary focus:outline-hidden disabled:opacity-50"
	/>
	<Combobox.Portal>
		<Combobox.Content
			class="z-50 w-[var(--bits-combobox-anchor-width)] overflow-hidden rounded-md border border-secondary/20 bg-white p-1 shadow-xl"
			sideOffset={4}
		>
			<Combobox.Viewport class="max-h-60 space-y-0.5 overflow-y-auto p-1">
				<div class="border-b border-secondary/10 pb-1">
					<button
						type="button"
						class="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-xs font-semibold text-primary hover:bg-primary/10"
						onclick={() => {
							open = false;
							on_create_location();
						}}
					>
						<span class="text-base font-bold">+</span><span>Create New Location</span>
					</button>
				</div>
				{#if !filtered_options.length}
					<div class="px-3 py-2 text-left text-xs text-gray-500">No locations match.</div>
				{:else}
					{#each filtered_options as option}
						<Combobox.Item
							value={option.value}
							label={option.label}
							class="text-surface-content block w-full cursor-pointer rounded-sm px-2.5 py-1.5 text-xs outline-hidden data-[highlighted]:bg-primary/10 data-[selected]:font-bold data-[selected]:text-primary"
							onclick={() => {
								open = false;
								search = '';
							}}>{option.label}</Combobox.Item
						>
					{/each}
				{/if}
			</Combobox.Viewport>
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>
