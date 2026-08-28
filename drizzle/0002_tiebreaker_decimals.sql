ALTER TABLE "question" ALTER COLUMN "numeric_answer" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "tiebreaker_submission" ALTER COLUMN "submitted_answer" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "tiebreaker_submission" ALTER COLUMN "difference_from_correct" SET DATA TYPE numeric;