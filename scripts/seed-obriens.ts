import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { argv, env } from 'node:process';
import postgres from 'postgres';
import {
	category,
	game,
	location,
	location_rule,
	question,
	question_item,
	round
} from '../src/lib/server/db/schema';
import { user } from '../src/lib/server/db/auth.schema';

const database_url = env.DATABASE_URL;
if (!database_url)
	throw new Error('DATABASE_URL is not set. Add it to .env before running this seed.');

const client = postgres(database_url);
const db = drizzle(client, {
	schema: { category, game, location, location_rule, question, question_item, round, user }
});

const location_name = "O'Brien's Irish Pub";
const location_address = '15435 N Dale Mabry Hwy, Tampa, FL 33618';
const game_title = argv.slice(2).join(' ').trim() || "O'Brien's Irish Pub Test Trivia";
const standard_wagers = [5, 10, 15];

const standard_rounds = [
	['Round 1', 'General Knowledge', 'What is the capital city of Australia?', 'Canberra'],
	['Round 2', 'Movies', 'Which film features the quote “May the Force be with you”?', 'Star Wars'],
	['Round 3', 'Science', 'What is the chemical symbol for gold?', 'Au'],
	['Round 4', 'Sports', 'How many players are on a baseball team’s fielding side?', '9'],
	['Round 5', 'Music', 'Which band released the album Rumours?', 'Fleetwood Mac'],
	['Round 6', 'Geography', 'Which river runs through London?', 'The Thames']
] as const;

async function get_or_create_category(user_id: string, name: string) {
	const existing = await db.query.category.findFirst({
		where: and(eq(category.user_id, user_id), eq(category.name, name))
	});
	if (existing) return existing.id;
	const [created] = await db
		.insert(category)
		.values({ user_id, name })
		.returning({ id: category.id });
	return created.id;
}

async function main() {
	const owner = env.SEED_USER_ID
		? await db.query.user.findFirst({ where: eq(user.id, env.SEED_USER_ID) })
		: await db.query.user.findFirst({ orderBy: (users, { desc }) => [desc(users.createdAt)] });
	if (!owner)
		throw new Error('No app user exists yet. Sign in once, then rerun `bun run seed:obriens`.');

	let seeded_location = await db.query.location.findFirst({
		where: and(eq(location.user_id, owner.id), eq(location.name, location_name))
	});
	if (!seeded_location) {
		const [created_location] = await db
			.insert(location)
			.values({
				user_id: owner.id,
				name: location_name,
				address: location_address,
				default_question_count: 3,
				is_active: true
			})
			.returning();
		seeded_location = created_location;
	}

	await db
		.insert(location_rule)
		.values({
			location_id: seeded_location.id,
			rules_markdown:
				'<h2>Welcome to trivia night!</h2><p>Choose one wager per question. Have fun and please keep phones away.</p>'
		})
		.onConflictDoNothing();

	const existing_game = await db.query.game.findFirst({
		where: and(eq(game.location_id, seeded_location.id), eq(game.title, game_title))
	});
	if (existing_game) {
		console.log(`Seed already exists: ${existing_game.id}`);
		return;
	}

	const category_ids = new Map<string, string>();
	for (const [, category_name] of standard_rounds)
		category_ids.set(category_name, await get_or_create_category(owner.id, category_name));

	const scheduled_at = new Date();
	scheduled_at.setDate(scheduled_at.getDate() + 7);
	scheduled_at.setHours(19, 0, 0, 0);

	await db.transaction(async (tx) => {
		const [created_game] = await tx
			.insert(game)
			.values({
				location_id: seeded_location.id,
				title: game_title,
				scheduled_at,
				status: 'SCHEDULED',
				standard_question_count: 3,
				standard_wager_options: standard_wagers
			})
			.returning({ id: game.id });

		let standard_index = 0;
		for (let order = 1; order <= 9; order++) {
			if ([1, 2, 3, 5, 6, 7].includes(order)) {
				const [name, category_name, question_text, answer] = standard_rounds[standard_index++];
				const [created_round] = await tx
					.insert(round)
					.values({
						game_id: created_game.id,
						name,
						round_type: 'STANDARD',
						points_type: 'WAGER',
						order,
						wager_options: standard_wagers
					})
					.returning({ id: round.id });
				for (let question_order = 1; question_order <= 3; question_order++)
					await tx.insert(question).values({
						round_id: created_round.id,
						category_id: category_ids.get(category_name),
						question_text:
							question_order === 1
								? question_text
								: `${category_name} test question ${question_order}`,
						correct_answer_text: question_order === 1 ? answer : `Test answer ${question_order}`,
						question_type: 'SINGLE',
						order: question_order,
						points_value: 0,
						bonus_points_value: 0,
						max_items: 1
					});
			} else if (order === 4) {
				const [created_round] = await tx
					.insert(round)
					.values({
						game_id: created_game.id,
						name: 'Halftime',
						round_type: 'HALFTIME',
						points_type: 'STATIC',
						order,
						halftime_bonus_points: 5
					})
					.returning({ id: round.id });
				const [created_question] = await tx
					.insert(question)
					.values({
						round_id: created_round.id,
						question_text: 'Name the five Great Lakes.',
						correct_answer_text: 'Superior, Michigan, Huron, Erie, Ontario',
						question_type: 'SINGLE',
						order: 1,
						points_value: 5,
						bonus_points_value: 5,
						max_items: 5
					})
					.returning({ id: question.id });
				await tx.insert(question_item).values(
					['Superior', 'Michigan', 'Huron', 'Erie', 'Ontario'].map((answer_text, index) => ({
						question_id: created_question.id,
						answer_text,
						order: index + 1
					}))
				);
			} else if (order === 8) {
				const [created_round] = await tx
					.insert(round)
					.values({
						game_id: created_game.id,
						name: 'Final',
						round_type: 'FINAL',
						points_type: 'RANGE',
						order,
						min_wager: 0,
						max_wager: 50
					})
					.returning({ id: round.id });
				await tx.insert(question).values({
					round_id: created_round.id,
					question_text: 'Which planet is known as the Red Planet?',
					correct_answer_text: 'Mars',
					question_type: 'SINGLE',
					order: 1,
					points_value: 0,
					bonus_points_value: 0,
					max_items: 1
				});
			} else {
				const [created_round] = await tx
					.insert(round)
					.values({
						game_id: created_game.id,
						name: 'Tiebreaker',
						round_type: 'TIEBREAKER',
						points_type: 'STATIC',
						order
					})
					.returning({ id: round.id });
				await tx.insert(question).values({
					round_id: created_round.id,
					question_text:
						'How many miles long is the Mississippi River, rounded to the nearest mile?',
					correct_answer_text: '2340',
					numeric_answer: 2340,
					question_type: 'SINGLE',
					order: 1,
					points_value: 0,
					bonus_points_value: 0,
					max_items: 1,
					is_tiebreaker: true
				});
			}
		}
	});

	console.log(`Created ${game_title} at ${location_name} for ${owner.email}.`);
}

try {
	await main();
} finally {
	await client.end();
}
