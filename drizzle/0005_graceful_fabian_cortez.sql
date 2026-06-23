CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pillar_id" uuid,
	"type" "transaction_type" NOT NULL,
	"category" text,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"description" text NOT NULL,
	"date" date NOT NULL,
	"invoice_number" text,
	"vendor" text,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"due_date" date,
	"paid_at" timestamp with time zone,
	"notes" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_pillar_idx" ON "transactions" USING btree ("pillar_id");--> statement-breakpoint
CREATE INDEX "transactions_type_idx" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_date_idx" ON "transactions" USING btree ("date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transactions_due_date_idx" ON "transactions" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "transactions_created_by_idx" ON "transactions" USING btree ("created_by");