ALTER TABLE "expense_records" ADD COLUMN "category_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_records" ADD COLUMN "sub_category_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_sub_category_id_sub_category_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_records" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "expense_records" DROP COLUMN "sub_category";