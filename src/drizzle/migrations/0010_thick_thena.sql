ALTER TABLE "projects" DROP CONSTRAINT "projects_name_unique";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "owner" text;--> statement-breakpoint
UPDATE "projects" AS p
SET "owner" = r."owner"
FROM "repos" AS r
WHERE p."repoId" = r."id";
ALTER TABLE "projects" ALTER COLUMN "owner" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_owner_name_unique" ON "projects" USING btree ("owner","name");