ALTER TABLE "projects" DROP CONSTRAINT "projects_name_unique";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "owner" text;--> statement-breakpoint
UPDATE "projects" AS p
SET "owner" = r."owner"
FROM "repos" AS r
WHERE p."repoId" = r."id";
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_hall_of_fame_username_fk" FOREIGN KEY ("owner") REFERENCES "public"."hall_of_fame"("username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_owner_name_unique" ON "projects" USING btree ("owner","name");