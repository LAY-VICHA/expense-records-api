ALTER TABLE "category" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sub_category" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_records" ALTER COLUMN "user_id" SET NOT NULL;