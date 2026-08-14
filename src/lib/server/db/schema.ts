import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	integer,
	boolean,
	pgEnum,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth.schema';

export const round_type_enum = pgEnum('round_type', [
	'STANDARD',
	'HALFTIME',
	'FINAL',
	'TIEBREAKER'
]);
export const points_type_enum = pgEnum('points_type', ['WAGER', 'STATIC', 'RANGE']);
export const question_type_enum = pgEnum('question_type', ['SINGLE', 'TWO_PART_BONUS']);
export const game_status_enum = pgEnum('game_status', [
	'DRAFT',
	'SCHEDULED',
	'IN_PROGRESS',
	'COMPLETED'
]);

export type RoundType = (typeof round_type_enum.enumValues)[number];
export type PointsType = (typeof points_type_enum.enumValues)[number];
export type QuestionType = (typeof question_type_enum.enumValues)[number];
export type GameStatus = (typeof game_status_enum.enumValues)[number];

export const location = pgTable('location', {
	id: uuid('id').primaryKey().defaultRandom(),
	user_id: text('user_id')
		.references(() => user.id, { onDelete: 'cascade' })
		.notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	address: text('address').notNull(),
	logo_url: text('logo_url'),
	picture_url: text('picture_url'),
	is_active: boolean('is_active').default(true).notNull(),

	default_question_count: integer('default_question_count').default(3).notNull(),

	created_at: timestamp('created_at').defaultNow().notNull()
});

export const location_rule = pgTable('location_rule', {
	id: uuid('id').primaryKey().defaultRandom(),
	location_id: uuid('location_id')
		.references(() => location.id, { onDelete: 'cascade' })
		.notNull()
		.unique(),
	rules_markdown: text('rules_markdown').notNull(),
	created_at: timestamp('created_at').defaultNow().notNull()
});

export const category = pgTable('category', {
	id: uuid('id').primaryKey().defaultRandom(),
	user_id: text('user_id')
		.references(() => user.id, { onDelete: 'cascade' })
		.notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	created_at: timestamp('created_at').defaultNow().notNull()
});

export const team = pgTable('team', {
	id: uuid('id').primaryKey().defaultRandom(),
	location_id: uuid('location_id')
		.references(() => location.id, { onDelete: 'cascade' })
		.notNull(),
	user_id: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 255 }).notNull(),
	created_at: timestamp('created_at').defaultNow().notNull()
});

export const game = pgTable('game', {
	id: uuid('id').primaryKey().defaultRandom(),
	location_id: uuid('location_id')
		.references(() => location.id, { onDelete: 'cascade' })
		.notNull(),
	title: varchar('title', { length: 255 }).notNull(),
	scheduled_at: timestamp('scheduled_at').notNull(),
	status: game_status_enum('status').default('SCHEDULED').notNull(),
	standard_question_count: integer('standard_question_count').default(3).notNull(),
	standard_wager_options: integer('standard_wager_options').array().default([5, 10, 15]).notNull(),
	created_at: timestamp('created_at').defaultNow().notNull()
});

export const game_session = pgTable('game_session', {
	id: uuid('id').primaryKey().defaultRandom(),
	game_id: uuid('game_id')
		.references(() => game.id, { onDelete: 'cascade' })
		.notNull()
		.unique(),
	phase: varchar('phase', { length: 32 }).default('RULES').notNull(),
	current_round_order: integer('current_round_order').default(0).notNull(),
	current_question_order: integer('current_question_order').default(0).notNull(),
	is_started: boolean('is_started').default(false).notNull(),
	is_leaderboard_visible: boolean('is_leaderboard_visible').default(false).notNull(),
	is_stump_the_host_visible: boolean('is_stump_the_host_visible').default(false).notNull(),
	is_stump_answer_revealed: boolean('is_stump_answer_revealed').default(false).notNull(),
	stump_the_host_submission_id: uuid('stump_the_host_submission_id'),
	updated_at: timestamp('updated_at').defaultNow().notNull()
});

export const game_team = pgTable(
	'game_team',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		game_id: uuid('game_id')
			.references(() => game.id, { onDelete: 'cascade' })
			.notNull(),
		team_id: uuid('team_id')
			.references(() => team.id, { onDelete: 'cascade' })
			.notNull(),
		created_at: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [uniqueIndex('game_team_game_team_unique').on(table.game_id, table.team_id)]
);

export const round = pgTable('round', {
	id: uuid('id').primaryKey().defaultRandom(),
	game_id: uuid('game_id')
		.references(() => game.id, { onDelete: 'cascade' })
		.notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	round_type: round_type_enum('round_type').notNull(),
	points_type: points_type_enum('points_type').default('WAGER').notNull(),
	order: integer('order').notNull(),

	wager_options: integer('wager_options').array(),
	halftime_bonus_points: integer('halftime_bonus_points'),
	min_wager: integer('min_wager').default(0),
	max_wager: integer('max_wager').default(50)
});

export const question = pgTable('question', {
	id: uuid('id').primaryKey().defaultRandom(),
	round_id: uuid('round_id')
		.references(() => round.id, { onDelete: 'cascade' })
		.notNull(),
	category_id: uuid('category_id').references(() => category.id, { onDelete: 'set null' }),
	question_text: text('question_text').notNull(),
	correct_answer_text: text('correct_answer_text').notNull(),
	numeric_answer: integer('numeric_answer'),
	image_url: text('image_url'),
	question_type: question_type_enum('question_type').default('SINGLE').notNull(),
	order: integer('order').notNull(),
	points_value: integer('points_value').default(0).notNull(),
	bonus_points_value: integer('bonus_points_value').default(0).notNull(),
	max_items: integer('max_items').default(1).notNull(),
	notes: text('notes'),
	is_tiebreaker: boolean('is_tiebreaker').default(false).notNull(),
	song_title: varchar('song_title', { length: 255 }),
	song_artist: varchar('song_artist', { length: 255 })
});

export const question_item = pgTable('question_item', {
	id: uuid('id').primaryKey().defaultRandom(),
	question_id: uuid('question_id')
		.references(() => question.id, { onDelete: 'cascade' })
		.notNull(),
	answer_text: text('answer_text').notNull(),
	order: integer('order').notNull()
});

export const team_submission = pgTable(
	'team_submission',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		game_id: uuid('game_id')
			.references(() => game.id, { onDelete: 'cascade' })
			.notNull(),
		question_id: uuid('question_id')
			.references(() => question.id, { onDelete: 'cascade' })
			.notNull(),
		team_id: uuid('team_id')
			.references(() => team.id, { onDelete: 'cascade' })
			.notNull(),
		wager: integer('wager'),
		items_correct: integer('items_correct').default(0),
		is_correct_primary: boolean('is_correct_primary').default(false).notNull(),
		is_correct_bonus: boolean('is_correct_bonus').default(false).notNull(),
		points_awarded: integer('points_awarded').default(0).notNull()
	},
	(table) => [
		uniqueIndex('team_submission_game_question_team_unique').on(
			table.game_id,
			table.question_id,
			table.team_id
		)
	]
);

export const tiebreaker_submission = pgTable('tiebreaker_submission', {
	id: uuid('id').primaryKey().defaultRandom(),
	game_id: uuid('game_id')
		.references(() => game.id, { onDelete: 'cascade' })
		.notNull(),
	question_id: uuid('question_id')
		.references(() => question.id, { onDelete: 'cascade' })
		.notNull(),
	team_id: uuid('team_id')
		.references(() => team.id, { onDelete: 'cascade' })
		.notNull(),
	tied_for_rank: integer('tied_for_rank').notNull(),
	submitted_answer: integer('submitted_answer').notNull(),
	difference_from_correct: integer('difference_from_correct'),
	is_winner: boolean('is_winner').default(false).notNull(),
	created_at: timestamp('created_at').defaultNow().notNull()
});

export const stump_the_host_submission = pgTable('stump_the_host_submission', {
	id: uuid('id').primaryKey().defaultRandom(),
	game_id: uuid('game_id')
		.references(() => game.id, { onDelete: 'cascade' })
		.notNull(),
	submitted_by_team_name: varchar('submitted_by_team_name', { length: 255 }),
	question_text: text('question_text').notNull(),
	answer_text: text('answer_text').notNull(),
	is_completed: timestamp('is_completed'),
	created_at: timestamp('created_at').defaultNow().notNull()
});

export const user_relations_extension = relations(user, ({ many }) => ({
	locations: many(location),
	categories: many(category),
	teams: many(team)
}));

export const location_relations = relations(location, ({ one, many }) => ({
	user: one(user, { fields: [location.user_id], references: [user.id] }),
	location_rule: one(location_rule),
	teams: many(team),
	games: many(game)
}));

export const location_rule_relations = relations(location_rule, ({ one }) => ({
	location: one(location, { fields: [location_rule.location_id], references: [location.id] })
}));

export const category_relations = relations(category, ({ one, many }) => ({
	user: one(user, { fields: [category.user_id], references: [user.id] }),
	questions: many(question)
}));

export const team_relations = relations(team, ({ one, many }) => ({
	location: one(location, { fields: [team.location_id], references: [location.id] }),
	user: one(user, { fields: [team.user_id], references: [user.id] }),
	game_teams: many(game_team),
	submissions: many(team_submission),
	tiebreaker_submissions: many(tiebreaker_submission)
}));

export const team_submission_relations = relations(team_submission, ({ one }) => ({
	game: one(game, { fields: [team_submission.game_id], references: [game.id] }),
	question: one(question, { fields: [team_submission.question_id], references: [question.id] }),
	team: one(team, { fields: [team_submission.team_id], references: [team.id] })
}));

export const tiebreaker_submission_relations = relations(tiebreaker_submission, ({ one }) => ({
	game: one(game, { fields: [tiebreaker_submission.game_id], references: [game.id] }),
	question: one(question, {
		fields: [tiebreaker_submission.question_id],
		references: [question.id]
	}),
	team: one(team, { fields: [tiebreaker_submission.team_id], references: [team.id] })
}));

export const game_relations = relations(game, ({ one, many }) => ({
	location: one(location, { fields: [game.location_id], references: [location.id] }),
	rounds: many(round),
	session: one(game_session),
	game_teams: many(game_team),
	submissions: many(team_submission),
	tiebreaker_submissions: many(tiebreaker_submission),
	stump_the_host_submissions: many(stump_the_host_submission)
}));

export const game_session_relations = relations(game_session, ({ one }) => ({
	game: one(game, { fields: [game_session.game_id], references: [game.id] })
}));

export const game_team_relations = relations(game_team, ({ one }) => ({
	game: one(game, { fields: [game_team.game_id], references: [game.id] }),
	team: one(team, { fields: [game_team.team_id], references: [team.id] })
}));

export const round_relations = relations(round, ({ one, many }) => ({
	game: one(game, { fields: [round.game_id], references: [game.id] }),
	questions: many(question)
}));

export const question_relations = relations(question, ({ one, many }) => ({
	round: one(round, { fields: [question.round_id], references: [round.id] }),
	category: one(category, { fields: [question.category_id], references: [category.id] }),
	submissions: many(team_submission),
	items: many(question_item),
	tiebreaker_submissions: many(tiebreaker_submission)
}));

export const question_item_relations = relations(question_item, ({ one }) => ({
	question: one(question, { fields: [question_item.question_id], references: [question.id] })
}));

export const stump_the_host_submission_relations = relations(
	stump_the_host_submission,
	({ one }) => ({
		game: one(game, { fields: [stump_the_host_submission.game_id], references: [game.id] })
	})
);

export * from './auth.schema';
