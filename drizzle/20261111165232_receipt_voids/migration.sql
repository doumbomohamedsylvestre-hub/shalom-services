ALTER TABLE "stock_receipts" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stock_receipts" ADD COLUMN "voided_by" text;--> statement-breakpoint
ALTER TABLE "stock_receipts" ADD COLUMN "void_reason" text;--> statement-breakpoint
CREATE INDEX "stock_receipts_created_at_idx" ON "stock_receipts" ("created_at");--> statement-breakpoint
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_voided_by_user_id_fkey" FOREIGN KEY ("voided_by") REFERENCES "user"("id") ON DELETE SET NULL;