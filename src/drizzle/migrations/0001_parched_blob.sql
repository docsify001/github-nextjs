CREATE TABLE "task_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cron_expression" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_daily" boolean DEFAULT false NOT NULL,
	"is_monthly" boolean DEFAULT false NOT NULL,
	"task_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "task_definitions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "task_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"task_definition_id" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration" integer,
	"result" jsonb,
	"error" text,
	"logs" text,
	"triggered_by" varchar(50) DEFAULT 'system' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_status" (
	"id" text PRIMARY KEY NOT NULL,
	"task_definition_id" text NOT NULL,
	"is_running" boolean DEFAULT false NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"last_execution_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_status_task_definition_id_unique" UNIQUE("task_definition_id")
);
--> statement-breakpoint
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_task_definition_id_task_definitions_id_fk" FOREIGN KEY ("task_definition_id") REFERENCES "public"."task_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_status" ADD CONSTRAINT "task_status_task_definition_id_task_definitions_id_fk" FOREIGN KEY ("task_definition_id") REFERENCES "public"."task_definitions"("id") ON DELETE cascade ON UPDATE no action;