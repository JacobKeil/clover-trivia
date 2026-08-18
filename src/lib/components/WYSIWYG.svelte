<script lang="ts">
	import { defaultExtensions, Tipex, type TipexEditor } from '@friendofsvelte/tipex';
	import type { AnyExtension } from '@tiptap/core';
	import TextAlign from '@tiptap/extension-text-align';
	import Color from '@tiptap/extension-color';
	import { TextStyle } from '@tiptap/extension-text-style';

	let {
		tiptap_editor = $bindable(),
		label,
		body = undefined,
		handle_rules_update
	}: {
		tiptap_editor: TipexEditor;
		label: string;
		body: string | undefined;
		handle_rules_update: () => void;
	} = $props();

	const filtered_defaults = defaultExtensions.filter(
		(ext) => ext.name !== 'textAlign' && ext.name !== 'color' && ext.name !== 'textStyle'
	);

	const custom_extensions: AnyExtension[] = [
		...filtered_defaults,
		TextStyle,
		Color,
		TextAlign.configure({
			types: ['heading', 'paragraph'],
			alignments: ['left', 'center', 'right', 'justify']
		})
	] as any;

	function toggle_red_text() {
		if (!tiptap_editor) return;
		if (tiptap_editor.isActive('textStyle', { color: '#ef4444' })) {
			tiptap_editor.chain().focus().unsetColor().run();
		} else {
			tiptap_editor.chain().focus().setColor('#ef4444').run();
		}
	}

	function clear_text_color() {
		if (!tiptap_editor) return;
		const { empty } = tiptap_editor.state.selection;
		if (!empty && tiptap_editor.isActive('textStyle')) {
			tiptap_editor.chain().focus().unsetColor().run();
		}
	}
</script>

<div class="flex flex-col space-y-2">
	<div class="flex items-center justify-between">
		<h1 class="text-surface-content/50 text-lg font-medium">{label}</h1>
		<div class="flex items-center space-x-2">
			<button
				type="button"
				onclick={toggle_red_text}
				class="flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 active:scale-95"
			>
				<span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
				Red Text
			</button>
			<button
				type="button"
				onclick={clear_text_color}
				class="rounded-md bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary transition-colors hover:bg-secondary/20 active:scale-95"
			>
				Reset Text Color
			</button>
		</div>
	</div>
	<Tipex
		floating
		{body}
		extensions={custom_extensions}
		bind:tipex={tiptap_editor}
		onupdate={handle_rules_update}
		class="opacity-80"
	/>
</div>

<style>
	/* Tipex's toolbar commands create standard HTML lists. Keep their markers
	   visible even if a global CSS reset is loaded after the editor styles. */
	:global(.tipex-editor-section .ProseMirror ul:not([data-type='taskList'])) {
		margin-left: 2.5rem;
		list-style-type: disc;
	}

	:global(.tipex-editor-section .ProseMirror ol) {
		margin-left: 2.5rem;
		list-style-type: decimal;
	}

	/* The editable element is not an input, so the app-wide input focus reset
	   does not apply to it. */
	:global(.tipex-editor-section .ProseMirror:focus) {
		outline: none;
	}
</style>
