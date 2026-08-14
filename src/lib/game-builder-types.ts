import type { round_type_enum, points_type_enum, question_type_enum } from '$lib/server/db/schema';

export type RoundType = (typeof round_type_enum.enumValues)[number];
export type PointsType = (typeof points_type_enum.enumValues)[number];
export type QuestionType = (typeof question_type_enum.enumValues)[number];

export type QuestionCategory = {
	id: string;
	name: string;
	is_new?: boolean;
};

export type QuestionSetup = {
	question_number: number;
	question_type: QuestionType;
	question_text: string;
	answer: string;
	answer_items?: string[];
	numeric_answer?: number | null;
	image_file: File | null;
	image_url?: string | null;
	max_items?: number | null; // Used for Halftime item count (e.g. 5)
	points_per_item?: number | null; // Points earned per correct halftime item
	min_wager?: number | null; // Used for Final Question min wager (e.g. 0)
	max_wager?: number | null; // Used for Final Question max wager (e.g. 50)
	category_id?: string; // Optional for Halftime, Final, and Tiebreaker
	bonus_points?: number | null; // Used for 2-Part Bonus or Halftime all-correct bonus
	song_name?: string | null;
	song_artist?: string | null;
	notes?: string | null;
};

export type GameRoundSetup = {
	round_number: number; // Position in game sequence (1, 2, 3...)
	name: string; // "Round 1", "Halftime Question", "Final Question", "Tiebreaker"
	round_type: RoundType;
	points_type: PointsType;
	wager_options: number[]; // e.g. [5, 10, 15] for standard rounds
	questions: QuestionSetup[];
};

export type CreateGameForm = {
	name: string;
	location_id: string;
	scheduled_at: Date;
	standard_question_count: number;
	standard_wager_options: number[];
	new_categories: QuestionCategory[];
	rounds: GameRoundSetup[];
};
