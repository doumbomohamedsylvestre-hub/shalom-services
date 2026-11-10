"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ROUTES } from "@/shared/site";

/** Compact code entry that hands off to the full tracking page. */
export function QuickTrack() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`${ROUTES.tracking}${code.trim() ? `?code=${encodeURIComponent(code.trim().toUpperCase())}` : ""}`);
      }}
    >
      <label htmlFor="quick-track" className="sr-only">
        Code de suivi
      </label>
      <InputGroup className="h-12 border-white/15 bg-white/10 text-white md:h-12 has-[[data-slot=input-group-control]:focus-visible]:border-white/40 has-[[data-slot=input-group-control]:focus-visible]:ring-white/20">
        <InputGroupAddon>
          <SearchIcon className="text-white/60" />
        </InputGroupAddon>
        <InputGroupInput
          id="quick-track"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="SS-7K3M9Q"
          autoCapitalize="characters"
          className="font-mono tracking-wider text-white uppercase placeholder:text-white/40"
        />
      </InputGroup>
      <Button type="submit" variant="brand" size="lg" className="shrink-0">
        Suivre
      </Button>
    </form>
  );
}
