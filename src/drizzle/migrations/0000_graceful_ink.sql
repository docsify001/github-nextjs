CREATE TABLE "bundles" (
	"name" text PRIMARY KEY NOT NULL,
	"version" text,
	"size" integer,
	"gzip" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"name" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"version" text,
	"downloads" integer,
	"dependencies" jsonb,
	"devDependencies" jsonb,
	"deprecated" boolean,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"override_description" boolean,
	"url" text,
	"override_url" boolean,
	"status" text NOT NULL,
	"logo" text,
	"twitter" text,
	"priority" smallint DEFAULT 0 NOT NULL,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"repoId" text NOT NULL,
	CONSTRAINT "projects_name_unique" UNIQUE("name"),
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "projects_to_tags" (
	"project_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "projects_to_tags_project_id_tag_id_pk" PRIMARY KEY("project_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"aliases" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "tags_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"repo_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"year" integer NOT NULL,
	"months" jsonb,
	CONSTRAINT "snapshots_repo_id_year_pk" PRIMARY KEY("repo_id","year")
);
--> statement-breakpoint
CREATE TABLE "repos" (
	"id" text PRIMARY KEY NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"archived" boolean,
	"default_branch" text,
	"description" text,
	"homepage" text,
	"name" text NOT NULL,
	"owner" text NOT NULL,
	"owner_id" integer NOT NULL,
	"stargazers_count" integer,
	"topics" jsonb,
	"pushed_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"last_commit" timestamp,
	"commit_count" integer,
	"contributor_count" integer
);
--> statement-breakpoint
CREATE TABLE "hall_of_fame" (
	"username" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"followers" integer,
	"bio" text,
	"homepage" text,
	"twitter" text,
	"avatar" text,
	"npm_username" text,
	"npm_package_count" integer,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hall_of_fame_to_projects" (
	"username" text NOT NULL,
	"project_id" text NOT NULL,
	CONSTRAINT "hall_of_fame_to_projects_username_project_id_pk" PRIMARY KEY("username","project_id")
);
--> statement-breakpoint
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_name_packages_name_fk" FOREIGN KEY ("name") REFERENCES "public"."packages"("name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_repoId_repos_id_fk" FOREIGN KEY ("repoId") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects_to_tags" ADD CONSTRAINT "projects_to_tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects_to_tags" ADD CONSTRAINT "projects_to_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_of_fame_to_projects" ADD CONSTRAINT "hall_of_fame_to_projects_username_hall_of_fame_username_fk" FOREIGN KEY ("username") REFERENCES "public"."hall_of_fame"("username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_of_fame_to_projects" ADD CONSTRAINT "hall_of_fame_to_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "name_owner_index" ON "repos" USING btree ("owner","name");