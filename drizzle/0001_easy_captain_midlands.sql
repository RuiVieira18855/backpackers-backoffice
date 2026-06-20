CREATE TYPE "public"."contact_source" AS ENUM('website', 'referral', 'event', 'inbound', 'cold', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_stage" AS ENUM('new', 'qualified', 'active', 'on_hold', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('lead', 'customer', 'partner', 'vendor');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pillar_id" uuid NOT NULL,
	"type" "contact_type" DEFAULT 'lead' NOT NULL,
	"stage" "contact_stage" DEFAULT 'new' NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"job_title" text,
	"notes" text,
	"source" "contact_source",
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"owner_id" uuid,
	"next_action" text,
	"next_action_at" timestamp with time zone,
	"last_contact_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_pillar_idx" ON "contacts" USING btree ("pillar_id");--> statement-breakpoint
CREATE INDEX "contacts_stage_idx" ON "contacts" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "contacts_type_idx" ON "contacts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "contacts_owner_idx" ON "contacts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "contacts_full_name_idx" ON "contacts" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "contacts_created_at_idx" ON "contacts" USING btree ("created_at" DESC NULLS LAST);