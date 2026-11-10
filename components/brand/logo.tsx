import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Brand mark: the transparent icon + a live wordmark, so it stays crisp and
 * legible on light and dark surfaces (the PNG wordmark only works on white).
 */
export function Logo({
  tone = "default",
  showTagline = false,
  href = "/",
  className,
  size = "md",
}: {
  tone?: "default" | "inverse";
  showTagline?: boolean;
  href?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const icon = { sm: 28, md: 36, lg: 48 }[size];
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/branding/shalom-service-logo-icon.png"
        alt=""
        width={icon}
        height={icon}
        priority
        className="shrink-0 drop-shadow-sm"
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-extrabold tracking-[-0.03em] whitespace-nowrap",
            size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg",
          )}
        >
          <span className={tone === "inverse" ? "text-white" : "text-primary"}>Shalom</span>{" "}
          <span className="text-brand">Service</span>
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 text-[0.62rem] font-medium tracking-[0.08em] whitespace-nowrap uppercase",
              tone === "inverse" ? "text-white/60" : "text-muted-foreground",
            )}
          >
            Réparation · Entretien · Accessoires
          </span>
        )}
      </span>
    </span>
  );
  if (href === null) return content;
  return (
    <Link href={href} aria-label="Shalom Service, accueil" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {content}
    </Link>
  );
}
