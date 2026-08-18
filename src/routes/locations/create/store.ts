export type CreateLocationForm = {
	name: string;
	address: string;
	logo_file: File | null;
	picture_file: File | null;
	location_rules: string | undefined;
	is_active: boolean;
	default_question_count: number;
};
