import type { CreateGameForm, GameRoundSetup, QuestionSetup } from '$lib/game-builder-types';

type SavedGameBuilderDraft = {
	saved_at: string;
	form_state: Omit<CreateGameForm, 'scheduled_at' | 'rounds'> & {
		scheduled_at: string;
		rounds: Array<
			Omit<GameRoundSetup, 'questions'> & { questions: Array<Omit<QuestionSetup, 'image_file'>> }
		>;
	};
	global_wagers?: number[];
	open_rounds?: Record<number, boolean>;
};

function without_files(question: QuestionSetup) {
	const { image_file: _image_file, ...saved_question } = question;
	return saved_question;
}

export function save_game_builder_draft(
	key: string,
	form_state: CreateGameForm,
	global_wagers?: number[],
	open_rounds?: Record<number, boolean>
) {
	if (typeof localStorage === 'undefined') return;

	const draft: SavedGameBuilderDraft = {
		saved_at: new Date().toISOString(),
		form_state: {
			...form_state,
			scheduled_at: form_state.scheduled_at.toISOString(),
			rounds: form_state.rounds.map((round) => ({
				...round,
				questions: round.questions.map(without_files)
			}))
		},
		global_wagers,
		open_rounds
	};

	localStorage.setItem(key, JSON.stringify(draft));
}

export function load_game_builder_draft(key: string) {
	if (typeof localStorage === 'undefined') return null;
	const saved = localStorage.getItem(key);
	if (!saved) return null;

	try {
		const draft = JSON.parse(saved) as SavedGameBuilderDraft;
		const scheduled_at = new Date(draft.form_state.scheduled_at);
		if (Number.isNaN(scheduled_at.getTime())) return null;

		return {
			form_state: {
				...draft.form_state,
				scheduled_at,
				rounds: draft.form_state.rounds.map((round) => ({
					...round,
					questions: round.questions.map((question) => ({ ...question, image_file: null }))
				}))
			} satisfies CreateGameForm,
			global_wagers: draft.global_wagers,
			open_rounds: draft.open_rounds,
			saved_at: new Date(draft.saved_at)
		};
	} catch {
		localStorage.removeItem(key);
		return null;
	}
}

export function clear_game_builder_draft(key: string) {
	if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
}
