import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaffPage } from "@/server/auth/session";

export const metadata: Metadata = { title: "Impression", robots: { index: false } };

/** Print layouts show customer and money data: staff only. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted py-8 print:bg-white print:py-0">
      <Suspense>
        <StaffOnly>{children}</StaffOnly>
      </Suspense>
    </div>
  );
}

async function StaffOnly({ children }: { children: React.ReactNode }) {
  await requireStaffPage();
  return children;
}
