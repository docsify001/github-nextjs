ALTER TABLE "repos" ADD COLUMN "mentionable_users_count" integer;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "watchers_count" integer;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "license_spdx_id" text;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "pull_requests_count" integer;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "releases_count" integer;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "languages" jsonb;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "open_graph_image_url" text;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "uses_custom_open_graph_image" boolean;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "latest_release_name" text;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "latest_release_tag_name" text;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "latest_release_published_at" timestamp;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "latest_release_url" text;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN "latest_release_description" text;