import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LocationCard from './LocationCard.svelte';

const completed_location = {
	id: 'location-123',
	user_id: 'host-123',
	name: 'Harbor House',
	address: '42 Ocean Avenue',
	picture_url: null,
	logo_url: null,
	is_active: true,
	default_question_count: 3,
	created_at: new Date('2026-01-01'),
	location_rule: null,
	games: [
		{
			id: 'game-123',
			location_id: 'location-123',
			title: 'Tuesday Trivia',
			status: 'COMPLETED' as const,
			scheduled_at: new Date('2026-08-04T19:00:00'),
			created_at: new Date('2026-08-01'),
			standard_question_count: 3,
			standard_wager_options: [5, 10, 15]
		}
	]
};

describe('LocationCard', () => {
	it('renders an active venue and its latest completed game', () => {
		render(LocationCard, { props: { location: completed_location } });

		expect(screen.getByText('ACTIVE')).toBeInTheDocument();
		expect(screen.getByText('42 Ocean Avenue')).toBeInTheDocument();
		expect(screen.getByText('Tuesday Trivia')).toBeInTheDocument();
		expect(screen.getByText('Aug 4, 2026 at 7:00 PM')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Edit Harbor House' })).toHaveAttribute(
			'href',
			'/locations/update/location-123'
		);
	});

	it('explains when a venue has no completed games yet', () => {
		render(LocationCard, {
			props: {
				location: { ...completed_location, is_active: false, games: [] }
			}
		});

		expect(screen.getByText('INACTIVE')).toBeInTheDocument();
		expect(screen.getByText('No games played yet.')).toBeInTheDocument();
	});
});
