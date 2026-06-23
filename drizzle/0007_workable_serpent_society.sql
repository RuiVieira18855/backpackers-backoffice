ALTER TABLE "transactions" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_event_idx" ON "transactions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "transactions_project_idx" ON "transactions" USING btree ("project_id");