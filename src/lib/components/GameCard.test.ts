import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import GameCard from './GameCard.svelte';

const game = {
	id: 'game-123',
	title: 'Wednesday Brain Bender',
	scheduled_at: new Date('2026-08-12T19:00:00'),
	status: 'SCHEDULED' as const,
	standard_question_count: 3,
	standard_wager_options: [5, 10, 15],
	created_at: new Date('2026-08-01T10:00:00'),
	location_id: 'location-123',
	location_name: 'Harbor House'
};

describe('GameCard', () => {
	it('shows an upcoming game with its location, time, and edit link', () => {
		render(GameCard, { props: { game, variant: 'upcoming' } });

		expect(screen.getByText('UPCOMING')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Wednesday Brain Bender' })).toBeInTheDocument();
		expect(screen.getByText('Harbor House')).toBeInTheDocument();
		expect(screen.getByText('Wed, Aug 12 · 7:00 PM')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Edit Wednesday Brain Bender' })).toHaveAttribute(
			'href',
			'/games/update/game-123'
		);
	});

	it('uses the draft label when a game needs more work', () => {
		render(GameCard, { props: { game, variant: 'draft' } });

		expect(screen.getByText('DRAFT')).toBeInTheDocument();
	});
});
