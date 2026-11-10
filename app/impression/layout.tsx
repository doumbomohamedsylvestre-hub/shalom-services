import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Impression", robots: { index: false } };

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted py-8 print:bg-white print:py-0">
      <Suspense>{children}</Suspense>
    </div>
  );
}
