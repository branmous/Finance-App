ALTER TABLE "debts" ADD COLUMN "kind" varchar(10) DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "total_minor" bigint;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_kind_check" CHECK ("debts"."kind" in ('monthly', 'deferred'));--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_total_matches_kind_check" CHECK (("debts"."kind" = 'deferred') = ("debts"."total_minor" is not null));--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_total_covers_months_check" CHECK ("debts"."total_minor" is null or "debts"."total_minor" >= "debts"."total_installments");
