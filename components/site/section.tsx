import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  tone = "default",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "muted" | "navy";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 py-20 md:py-28",
        tone === "muted" && "bg-muted",
        tone === "navy" && "bg-primary text-primary-foreground",
        className,
      )}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  inverse,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  inverse?: boolean;
}) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-4", align === "center" && "mx-auto items-center text-center", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="text-3xl leading-[1.1] font-semibold tracking-[-0.025em] md:text-[2.75rem]">{title}</h2>
      {description && (
        <p className={cn("text-base leading-relaxed md:text-lg", inverse ? "text-white/70" : "text-muted-foreground")}>
          {description}
        </p>
      )}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b bg-muted">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-brand/10 blur-3xl"
      />
      <div className="container-page relative flex flex-col gap-5 py-16 md:py-24">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold tracking-[-0.03em] md:text-6xl">{title}</h1>
        {description && <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{description}</p>}
        {children}
      </div>
    </section>
  );
}
