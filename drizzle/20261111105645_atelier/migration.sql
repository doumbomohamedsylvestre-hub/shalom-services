CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"type" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"device" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"converted_repair_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "inquiries_type" CHECK ("type" in ('repair', 'quote', 'contact')),
	CONSTRAINT "inquiries_status" CHECK ("status" in ('new', 'contacted', 'converted', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "public_rate_limits" (
	"key" text PRIMARY KEY,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"repair_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"product_id" uuid,
	"service_id" uuid,
	"label" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"unit_cost" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"discount_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"removed_at" timestamp with time zone,
	"removed_by" text,
	CONSTRAINT "repair_lines_kind" CHECK ("kind" in ('service', 'product')),
	CONSTRAINT "repair_lines_amounts" CHECK ("qty" > 0 and "unit_price" >= 0 and "discount" >= 0 and "discount" <= "qty" * "unit_price")
);
--> statement-breakpoint
CREATE TABLE "repair_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"repair_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"note" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"by" text
);
--> statement-breakpoint
CREATE TABLE "repairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"branch_id" uuid NOT NULL,
	"code" text NOT NULL UNIQUE,
	"customer_id" uuid NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"color" text,
	"imei" text,
	"fault" text NOT NULL,
	"condition_notes" text,
	"accessories" text,
	"diagnosis" text,
	"mode" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"technician_id" text,
	"estimated_ready_at" timestamp with time zone,
	"invoice_number" text UNIQUE,
	"picked_up_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repairs_mode" CHECK ("mode" in ('fixed', 'quote')),
	CONSTRAINT "repairs_status" CHECK ("status" in ('received', 'diagnosing', 'quote_sent', 'approved', 'refused', 'in_repair', 'waiting_parts', 'ready', 'picked_up', 'unrepairable', 'returned_unrepaired', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "repair_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "repair_id" uuid;--> statement-breakpoint
CREATE INDEX "payments_repair_idx" ON "payments" ("repair_id");--> statement-breakpoint
CREATE INDEX "inquiries_created_at_idx" ON "inquiries" ("created_at");--> statement-breakpoint
CREATE INDEX "repair_lines_repair_idx" ON "repair_lines" ("repair_id");--> statement-breakpoint
CREATE INDEX "repair_status_events_repair_idx" ON "repair_status_events" ("repair_id","at");--> statement-breakpoint
CREATE INDEX "repairs_status_idx" ON "repairs" ("status");--> statement-breakpoint
CREATE INDEX "repairs_customer_idx" ON "repairs" ("customer_id");--> statement-breakpoint
CREATE INDEX "repairs_technician_idx" ON "repairs" ("technician_id");--> statement-breakpoint
CREATE INDEX "repairs_updated_at_idx" ON "repairs" ("updated_at");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_repair_id_repairs_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "repairs"("id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_repair_id_repairs_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "repairs"("id");--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_converted_repair_id_repairs_id_fkey" FOREIGN KEY ("converted_repair_id") REFERENCES "repairs"("id");--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "repair_lines" ADD CONSTRAINT "repair_lines_repair_id_repairs_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "repairs"("id");--> statement-breakpoint
ALTER TABLE "repair_lines" ADD CONSTRAINT "repair_lines_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");--> statement-breakpoint
ALTER TABLE "repair_lines" ADD CONSTRAINT "repair_lines_service_id_services_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id");--> statement-breakpoint
ALTER TABLE "repair_lines" ADD CONSTRAINT "repair_lines_discount_by_user_id_fkey" FOREIGN KEY ("discount_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "repair_lines" ADD CONSTRAINT "repair_lines_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "repair_lines" ADD CONSTRAINT "repair_lines_removed_by_user_id_fkey" FOREIGN KEY ("removed_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "repair_status_events" ADD CONSTRAINT "repair_status_events_repair_id_repairs_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "repairs"("id");--> statement-breakpoint
ALTER TABLE "repair_status_events" ADD CONSTRAINT "repair_status_events_by_user_id_fkey" FOREIGN KEY ("by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_branch_id_branches_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id");--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_technician_id_user_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_one_owner" CHECK (("sale_id" is null) <> ("repair_id" is null));