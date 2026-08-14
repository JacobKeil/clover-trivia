type QuestionLike = {
	question_text?: string;
	answer?: string;
	category_id?: string;
	answer_items?: string[];
	question_type?: string;
	bonus_points?: number | null;
	max_items?: number | null;
	points_per_item?: number | null;
	min_wager?: number | null;
	max_wager?: number | null;
	numeric_answer?: number | null;
};

type RoundLike = {
	round_type: 'STANDARD' | 'HALFTIME' | 'FINAL' | 'TIEBREAKER';
	questions: QuestionLike[];
};

export type RoundValidationErrors = Record<number, string[]>;

export function validate_game_rounds(rounds: RoundLike[]): RoundValidationErrors {
	const errors: RoundValidationErrors = {};
	const add_error = (round_index: number, message: string) => {
		(errors[round_index] ??= []).push(message);
	};

	rounds.forEach((round, round_index) => {
		if (round.round_type === 'STANDARD') {
			round.questions.forEach((question, question_index) => {
				if (!question.question_text?.trim())
					add_error(round_index, `Question ${question_index + 1} needs a prompt.`);
				if (!question.answer?.trim())
					add_error(round_index, `Question ${question_index + 1} needs an answer.`);
				if (!question.category_id)
					add_error(round_index, `Question ${question_index + 1} needs a category.`);
				if (
					question.question_type === 'TWO_PART_BONUS' &&
					(!question.bonus_points || question.bonus_points < 1)
				)
					add_error(round_index, `Question ${question_index + 1} needs a bonus-point value.`);
			});
			return;
		}

		const question = round.questions[0];
		if (!question) {
			add_error(round_index, 'This round needs a question.');
			return;
		}
		if (!question.question_text?.trim()) add_error(round_index, 'This round needs a prompt.');

		if (round.round_type === 'HALFTIME') {
			const expected_items = Number(question.max_items ?? 0);
			const items = question.answer_items ?? [];
			if (!Number.isInteger(expected_items) || expected_items < 1)
				add_error(round_index, 'Set the number of accepted answers.');
			if (!question.points_per_item || question.points_per_item < 1)
				add_error(round_index, 'Set points per correct item.');
			if (items.length !== expected_items || items.some((item) => !item.trim()))
				add_error(round_index, 'Fill in every accepted answer.');
			return;
		}

		if (round.round_type === 'FINAL') {
			if (!question.answer?.trim()) add_error(round_index, 'The final question needs an answer.');
			const minimum = Number(question.min_wager ?? 0);
			const maximum = Number(question.max_wager ?? 0);
			if (
				!Number.isFinite(minimum) ||
				!Number.isFinite(maximum) ||
				minimum < 0 ||
				maximum < minimum
			)
				add_error(round_index, 'Set valid minimum and maximum wagers.');
			return;
		}

		if (!Number.isFinite(question.numeric_answer))
			add_error(round_index, 'The tiebreaker needs an exact numeric answer.');
	});

	return errors;
}
