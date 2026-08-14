import { fail, redirect, error, type Actions, type ServerLoad } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { location, location_rule } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { upload_to_s3, delete_from_s3, extract_key_from_url } from '$lib/server/storage/s3';

export const load: ServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const location_id = params.location_id;

	if (!location_id) {
		throw error(400, 'Location ID is required');
	}

	const existing_location = await db.query.location.findFirst({
		where: and(eq(location.id, location_id), eq(location.user_id, locals.user.id)),
		with: {
			location_rule: true
		}
	});

	if (!existing_location) throw redirect(303, '/dashboard');

	return {
		location: existing_location
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const user_id = locals.user.id;
		const location_id = params.location_id;

		if (!location_id) {
			return fail(400, { message: 'Location ID is required' });
		}

		const current_location = await db.query.location.findFirst({
			where: and(eq(location.id, location_id), eq(location.user_id, user_id))
		});

		if (!current_location) {
			return fail(404, { message: 'Location not found' });
		}

		const data = await request.formData();

		const name = data.get('name') as string;
		const address = data.get('address') as string;
		const location_rules = data.get('location_rules') as string | null;
		const default_question_count = Number(data.get('default_question_count') ?? 3);
		const is_active = data.get('is_active') === 'true';

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

		let new_logo_url = current_location.logo_url;
		let new_picture_url = current_location.picture_url;

		const newly_uploaded_keys: string[] = [];
		const old_keys_to_delete: string[] = [];

		try {
			if (logo_file && logo_file.size > 0) {
				const { url, key } = await upload_to_s3(logo_file, 'logos');
				new_logo_url = url;
				newly_uploaded_keys.push(key);

				const old_key = extract_key_from_url(current_location.logo_url);
				if (old_key) old_keys_to_delete.push(old_key);
			}

			if (picture_file && picture_file.size > 0) {
				const { url, key } = await upload_to_s3(picture_file, 'pictures');
				new_picture_url = url;
				newly_uploaded_keys.push(key);

				const old_key = extract_key_from_url(current_location.picture_url);
				if (old_key) old_keys_to_delete.push(old_key);
			}

			await db.transaction(async (tx) => {
				await tx
					.update(location)
					.set({
						name,
						address,
						logo_url: new_logo_url,
						picture_url: new_picture_url,
						is_active,
						default_question_count
					})
					.where(and(eq(location.id, location_id), eq(location.user_id, user_id)));

				if (location_rules) {
					await tx
						.insert(location_rule)
						.values({
							location_id,
							rules_markdown: location_rules
						})
						.onConflictDoUpdate({
							target: location_rule.location_id,
							set: { rules_markdown: location_rules }
						});
				}
			});

			if (old_keys_to_delete.length > 0) {
				await Promise.allSettled(old_keys_to_delete.map((key) => delete_from_s3(key)));
			}
		} catch (err) {
			console.error('Failed to update location:', err);

			if (newly_uploaded_keys.length > 0) {
				await Promise.allSettled(newly_uploaded_keys.map((key) => delete_from_s3(key)));
			}

			return fail(500, { message: 'Failed to update location.' });
		}

		throw redirect(303, '/dashboard');
	}
};
