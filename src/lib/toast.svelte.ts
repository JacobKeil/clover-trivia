export type ToastKind = 'success' | 'error' | 'info';

type Toast = {
	id: number;
	kind: ToastKind;
	message: string;
};

let next_id = 0;
let items = $state<Toast[]>([]);

function show(kind: ToastKind, message: string, duration = 4000) {
	const id = ++next_id;
	items = [...items, { id, kind, message }];
	window.setTimeout(() => dismiss(id), duration);
}

function dismiss(id: number) {
	items = items.filter((item) => item.id !== id);
}

export const toast = {
	get items() {
		return items;
	},
	success: (message: string) => show('success', message),
	error: (message: string) => show('error', message, 6000),
	info: (message: string) => show('info', message),
	dismiss
};
