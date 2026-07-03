CREATE TYPE "public"."event_recurrence_frequency" AS ENUM('none', 'daily', 'weekly', 'monthly');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurrence_frequency" "event_recurrence_frequency" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurrence_interval" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurrence_until" date;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurrence_parent_id" uuid;--> statement-breakpoint
CREATE INDEX "events_recurrence_parent_idx" ON "events" USING btree ("recurrence_parent_id");