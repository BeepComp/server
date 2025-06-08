ALTER TABLE "users_to_okays" DROP CONSTRAINT "users_to_okays_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users_to_okays" DROP CONSTRAINT "users_to_okays_okays_id_okays_id_fk";
--> statement-breakpoint
ALTER TABLE "users_to_submissions" DROP CONSTRAINT "users_to_submissions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users_to_submissions" DROP CONSTRAINT "users_to_submissions_submission_id_submissions_id_fk";
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "submitter" text;--> statement-breakpoint
ALTER TABLE "modifiers" ADD CONSTRAINT "modifiers_submitter_users_id_fk" FOREIGN KEY ("submitter") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitter_users_id_fk" FOREIGN KEY ("submitter") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_okays" ADD CONSTRAINT "users_to_okays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_okays" ADD CONSTRAINT "users_to_okays_okays_id_okays_id_fk" FOREIGN KEY ("okays_id") REFERENCES "public"."okays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_submissions" ADD CONSTRAINT "users_to_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_submissions" ADD CONSTRAINT "users_to_submissions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;