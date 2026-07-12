CREATE TYPE "public"."catalog_family" AS ENUM('wild', 'hive', 'multi');--> statement-breakpoint
CREATE TABLE "catalog_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"family" "catalog_family" NOT NULL,
	"pillar_id" uuid,
	"duration_label" text,
	"pax_min" integer,
	"pax_max" integer,
	"price_target_min" integer,
	"price_target_max" integer,
	"price_per_pax_min" integer,
	"price_per_pax_max" integer,
	"target_audience" text,
	"body" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_activities" ADD CONSTRAINT "catalog_activities_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_activities" ADD CONSTRAINT "catalog_activities_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_activities" ADD CONSTRAINT "catalog_activities_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_activities_code_idx" ON "catalog_activities" USING btree ("code");--> statement-breakpoint
CREATE INDEX "catalog_activities_family_idx" ON "catalog_activities" USING btree ("family","sort_order");--> statement-breakpoint
CREATE INDEX "catalog_activities_active_idx" ON "catalog_activities" USING btree ("is_active");