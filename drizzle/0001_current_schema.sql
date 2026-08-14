-- The initial migration predates the current application schema. Preserve its
-- legacy tables and add the tables used by the current application.
ALTER TABLE "user" ALTER COLUMN "email_verified" TYPE boolean USING ("email_verified" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email_verified" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email_verified" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
CREATE TYPE "public"."game_status" AS ENUM('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."points_type" AS ENUM('WAGER', 'STATIC', 'RANGE');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('SINGLE', 'TWO_PART_BONUS');--> statement-breakpoint
CREATE TYPE "public"."round_type" AS ENUM('STANDARD', 'HALFTIME', 'FINAL', 'TIEBREAKER');--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"logo_url" text,
	"picture_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"default_question_count" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"status" "game_status" DEFAULT 'SCHEDULED' NOT NULL,
	"standard_question_count" integer DEFAULT 3 NOT NULL,
	"standard_wager_options" integer[] DEFAULT '{5,10,15}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"phase" varchar(32) DEFAULT 'RULES' NOT NULL,
	"current_round_order" integer DEFAULT 0 NOT NULL,
	"current_question_order" integer DEFAULT 0 NOT NULL,
	"is_started" boolean DEFAULT false NOT NULL,
	"is_leaderboard_visible" boolean DEFAULT false NOT NULL,
	"is_stump_the_host_visible" boolean DEFAULT false NOT NULL,
	"is_stump_answer_revealed" boolean DEFAULT false NOT NULL,
	"stump_the_host_submission_id" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_session_game_id_unique" UNIQUE("game_id")
);
--> statement-breakpoint
CREATE TABLE "game_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"rules_markdown" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "location_rule_location_id_unique" UNIQUE("location_id")
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"category_id" uuid,
	"question_text" text NOT NULL,
	"correct_answer_text" text NOT NULL,
	"numeric_answer" integer,
	"image_url" text,
	"question_type" "question_type" DEFAULT 'SINGLE' NOT NULL,
	"order" integer NOT NULL,
	"points_value" integer DEFAULT 0 NOT NULL,
	"bonus_points_value" integer DEFAULT 0 NOT NULL,
	"max_items" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"is_tiebreaker" boolean DEFAULT false NOT NULL,
	"song_title" varchar(255),
	"song_artist" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "question_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"answer_text" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"round_type" "round_type" NOT NULL,
	"points_type" "points_type" DEFAULT 'WAGER' NOT NULL,
	"order" integer NOT NULL,
	"wager_options" integer[],
	"halftime_bonus_points" integer,
	"min_wager" integer DEFAULT 0,
	"max_wager" integer DEFAULT 50
);
--> statement-breakpoint
CREATE TABLE "stump_the_host_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"submitted_by_team_name" varchar(255),
	"question_text" text NOT NULL,
	"answer_text" text NOT NULL,
	"is_completed" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"user_id" text,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"wager" integer,
	"items_correct" integer DEFAULT 0,
	"is_correct_primary" boolean DEFAULT false NOT NULL,
	"is_correct_bonus" boolean DEFAULT false NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tiebreaker_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"tied_for_rank" integer NOT NULL,
	"submitted_answer" integer NOT NULL,
	"difference_from_correct" integer,
	"is_winner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_team" ADD CONSTRAINT "game_team_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_team" ADD CONSTRAINT "game_team_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_rule" ADD CONSTRAINT "location_rule_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_round_id_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_item" ADD CONSTRAINT "question_item_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round" ADD CONSTRAINT "round_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stump_the_host_submission" ADD CONSTRAINT "stump_the_host_submission_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_submission" ADD CONSTRAINT "team_submission_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_submission" ADD CONSTRAINT "team_submission_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_submission" ADD CONSTRAINT "team_submission_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiebreaker_submission" ADD CONSTRAINT "tiebreaker_submission_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiebreaker_submission" ADD CONSTRAINT "tiebreaker_submission_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiebreaker_submission" ADD CONSTRAINT "tiebreaker_submission_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_team_game_team_unique" ON "game_team" USING btree ("game_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_submission_game_question_team_unique" ON "team_submission" USING btree ("game_id","question_id","team_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
