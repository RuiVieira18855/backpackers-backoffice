CREATE TYPE "public"."user_kind" AS ENUM('internal', 'customer');--> statement-breakpoint
CREATE TABLE "apps" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"url" text,
	"color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "kind" "user_kind" DEFAULT 'internal' NOT NULL;