CREATE TABLE "modifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text,
	"text" text,
	"submitter" text
);
--> statement-breakpoint
CREATE TABLE "okays" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text,
	"sending_id" text
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"draft" boolean,
	"title" text,
	"link" text,
	"player_link" text,
	"round" integer,
	"challengerId" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"participant" boolean
);
--> statement-breakpoint
CREATE TABLE "users_to_okays" (
	"user_id" text NOT NULL,
	"okays_id" text NOT NULL,
	CONSTRAINT "users_to_okays_user_id_okays_id_pk" PRIMARY KEY("user_id","okays_id")
);
--> statement-breakpoint
CREATE TABLE "users_to_submissions" (
	"user_id" text NOT NULL,
	"submission_id" text NOT NULL,
	CONSTRAINT "users_to_submissions_user_id_submission_id_pk" PRIMARY KEY("user_id","submission_id")
);
--> statement-breakpoint
ALTER TABLE "users_to_okays" ADD CONSTRAINT "users_to_okays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_okays" ADD CONSTRAINT "users_to_okays_okays_id_okays_id_fk" FOREIGN KEY ("okays_id") REFERENCES "public"."okays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_submissions" ADD CONSTRAINT "users_to_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_submissions" ADD CONSTRAINT "users_to_submissions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;