import type { auth } from '$lib/server/auth';

declare global {
	namespace App {
		interface Locals {
			user: typeof auth.$Infer.Session.user | null;
			session: typeof auth.$Infer.Session.session | null;
		}

		// PageData, Error, Platform, etc. stay default or custom as needed
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
