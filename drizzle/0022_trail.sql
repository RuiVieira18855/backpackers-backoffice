CREATE TYPE "public"."trail_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."trail_value" AS ENUM('T', 'R', 'I', 'L', 'H', 'A');--> statement-breakpoint
CREATE TABLE "trail_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"likert" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trail_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "trail_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"score_t" integer,
	"score_r" integer,
	"score_i" integer,
	"score_l" integer,
	"score_h" integer,
	"score_a" integer,
	"dominant" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trail_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"value" "trail_value" NOT NULL,
	"statement" text NOT NULL,
	"reverse_scored" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trail_answers" ADD CONSTRAINT "trail_answers_assessment_id_trail_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."trail_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trail_answers" ADD CONSTRAINT "trail_answers_question_id_trail_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."trail_questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trail_assessments" ADD CONSTRAINT "trail_assessments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trail_answers_assessment_idx" ON "trail_answers" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "trail_answers_question_idx" ON "trail_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "trail_assessments_user_idx" ON "trail_assessments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trail_assessments_status_idx" ON "trail_assessments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trail_assessments_completed_at_idx" ON "trail_assessments" USING btree ("completed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "trail_questions_code_idx" ON "trail_questions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "trail_questions_value_idx" ON "trail_questions" USING btree ("value","sort_order");