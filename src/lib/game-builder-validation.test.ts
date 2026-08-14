import { describe, expect, it } from 'vitest';
import { validate_game_rounds } from './game-builder-validation';

describe('validate_game_rounds', () => {
	it('reports incomplete standard questions even when their form is not rendered', () => {
		const errors = validate_game_rounds([
			{
				round_type: 'STANDARD',
				questions: [
					{
						question_text: 'Which planet is closest to the sun?',
						answer: 'Mercury',
						category_id: 'science'
					},
					{ question_text: '', answer: '', category_id: 'science' }
				]
			}
		]);

		expect(errors[0]).toEqual(['Question 2 needs a prompt.', 'Question 2 needs an answer.']);
	});

	it('requires a category for every standard question', () => {
		const errors = validate_game_rounds([
			{
				round_type: 'STANDARD',
				questions: [{ question_text: 'Which planet is closest to the sun?', answer: 'Mercury' }]
			}
		]);

		expect(errors[0]).toEqual(['Question 1 needs a category.']);
	});

	it('requires every halftime answer item and scoring value', () => {
		const errors = validate_game_rounds([
			{
				round_type: 'HALFTIME',
				questions: [
					{
						question_text: 'Name three colors in the US flag.',
						max_items: 3,
						points_per_item: 5,
						answer_items: ['Red', '', 'Blue']
					}
				]
			}
		]);

		expect(errors[0]).toEqual(['Fill in every accepted answer.']);
	});
});
