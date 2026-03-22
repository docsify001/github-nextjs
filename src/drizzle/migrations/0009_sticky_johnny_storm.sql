ALTER TABLE "hall_of_fame" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "hall_of_fame" ADD COLUMN "linkedin" text;--> statement-breakpoint
ALTER TABLE "hall_of_fame" ADD COLUMN "github" text;--> statement-breakpoint
ALTER TABLE "hall_of_fame" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hall_of_fame" ADD COLUMN "metadata" jsonb;