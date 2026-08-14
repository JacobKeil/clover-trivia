import { fail, redirect, type Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { location, location_rule } from '$lib/server/db/schema';
import { upload_to_s3, delete_from_s3 } from '$lib/server/storage/s3';

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		const data = await request.formData();

		const name = data.get('name') as string;
		const address = data.get('address') as string;
		const location_rules = data.get('location_rules') as string | null;
		const default_question_count = Number(data.get('default_question_count') ?? 3);
		const is_active = data.get('is_active') !== 'false';

		if (
			!name?.trim() ||
			!address?.trim() ||
			!Number.isInteger(default_question_count) ||
			default_question_count < 1 ||
			default_question_count > 20
		) {
			return fail(400, {
				message:
					'Provide a location name, address, and between 1 and 20 questions per standard round.'
			});
		}

		const logo_file = data.get('logo_file') as File | null;
		const picture_file = data.get('picture_file') as File | null;

		const uploaded_keys: string[] = [];
		let logo_url: string | null = null;
		let picture_url: string | null = null;

		try {
			if (logo_file && logo_file.size > 0) {
				const { url, key } = await upload_to_s3(logo_file, 'logos');
				logo_url = url;
				uploaded_keys.push(key);
			}

			if (picture_file && picture_file.size > 0) {
				const { url, key } = await upload_to_s3(picture_file, 'pictures');
				picture_url = url;
				uploaded_keys.push(key);
			}

			const user_id = locals.user.id;

			await db.transaction(async (tx) => {
				const [new_location] = await tx
					.insert(location)
					.values({
						user_id,
						name,
						address,
						logo_url,
						picture_url,
						is_active,
						default_question_count
					})
					.returning();

				if (!new_location) {
					tx.rollback();
				}

				if (location_rules) {
					await tx.insert(location_rule).values({
						location_id: new_location.id,
						rules_markdown: location_rules
					});
				}
			});
		} catch (err) {
			console.error('Failed to create location, rolling back S3 files:', err);

			// 3. CLEANUP: If DB insert fails, remove any files uploaded during this request
			if (uploaded_keys.length > 0) {
				await Promise.allSettled(uploaded_keys.map((key) => delete_from_s3(key)));
			}

			return fail(500, {
				message: 'Failed to create location. Any uploaded files were cleaned up.'
			});
		}

		throw redirect(303, '/dashboard');
	}
};
