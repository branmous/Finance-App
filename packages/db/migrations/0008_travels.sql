CREATE TABLE IF NOT EXISTS "trip_expense_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expense_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trip_id" uuid NOT NULL,
	"description" varchar(80) NOT NULL,
	"category" varchar(20) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"spent_on" date,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"paid_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trip_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trip_id" uuid NOT NULL,
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"paid_on" date
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(80) NOT NULL,
	"kind" varchar(10) NOT NULL,
	"start_date" date,
	"end_date" date
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_expense_shares" ADD CONSTRAINT "trip_expense_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_expense_shares" ADD CONSTRAINT "trip_expense_shares_expense_id_trip_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."trip_expenses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_expense_shares" ADD CONSTRAINT "trip_expense_shares_participant_id_trip_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."trip_participants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_paid_by_id_trip_participants_id_fk" FOREIGN KEY ("paid_by_id") REFERENCES "public"."trip_participants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_settlements" ADD CONSTRAINT "trip_settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_settlements" ADD CONSTRAINT "trip_settlements_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_settlements" ADD CONSTRAINT "trip_settlements_from_id_trip_participants_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."trip_participants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_settlements" ADD CONSTRAINT "trip_settlements_to_id_trip_participants_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."trip_participants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trip_expense_shares_expense_participant_idx" ON "trip_expense_shares" USING btree ("expense_id","participant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trip_expenses_trip_id_idx" ON "trip_expenses" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trip_participants_trip_id_idx" ON "trip_participants" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trip_settlements_trip_id_idx" ON "trip_settlements" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trips_user_id_idx" ON "trips" USING btree ("user_id");