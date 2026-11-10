import { ArrowUpRightIcon, ClockIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatXOF } from "@/shared/format";
import type { Service } from "@/shared/domain/types";
import { ROUTES } from "@/shared/site";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`${ROUTES.services}#${service.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/8 transition-[transform,box-shadow] duration-300 ease-out-quint outline-none hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px] hover:shadow-primary/25 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.985]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={service.image}
          alt=""
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-[-0.01em]">{service.name}</h3>
          <ArrowUpRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
        </div>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{service.summary}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-sm">
          <span className="font-semibold text-primary">
            {service.priceFrom ? <>Dès {formatXOF(service.priceFrom)}</> : "Sur devis"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <ClockIcon className="size-3.5" />
            {service.durationLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
