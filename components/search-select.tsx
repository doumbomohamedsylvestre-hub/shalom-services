"use client";

/**
 * SearchSelect: a select you can type into, for lists that grow (products,
 * customers, suppliers). Short fixed lists (≤ ~8 options) should keep using
 * the plain Select.
 *
 * - Desktop: a popover anchored to the trigger, as wide as the field.
 * - Phone: a bottom sheet with the search field on top and large rows,
 *   so the keyboard never hides the results.
 * - Search matches the label, the description and any extra `keywords`
 *   (SKU, phone number…), accent-insensitive.
 * - Keyboard: ↑ ↓ to move, Enter to pick, Esc to close.
 *
 *   <SearchSelect value={id} onValueChange={setId} options={[
 *     { value: "p1", label: "Écran iPhone 11", description: "ECR-IP11", meta: "6 en stock" },
 *   ]} />
 */
import { ChevronsUpDownIcon, XIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type SearchSelectOption = {
  value: string;
  label: string;
  /** Secondary line under the label (SKU, phone…). Searchable. */
  description?: string;
  /** Right-aligned hint (stock, price…). Not searched. */
  meta?: React.ReactNode;
  /** Tone for `meta`, e.g. "danger" for out of stock. */
  metaTone?: "default" | "danger" | "warning";
  /** Extra search terms that are not displayed. */
  keywords?: string[];
  group?: string;
  disabled?: boolean;
};

type Props = {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Adds a first row that clears the value (value becomes ""). */
  noneOption?: { label: string; description?: string };
  /** Title of the phone bottom sheet; defaults to the placeholder. */
  title?: string;
  loading?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  onBlur?: () => void;
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Accent-insensitive "every word must appear" filter for cmdk. */
export function searchFilter(value: string, search: string, keywords?: string[]) {
  const haystack = normalize([value, ...(keywords ?? [])].join(" "));
  const words = normalize(search).split(/\s+/).filter(Boolean);
  return words.every((w) => haystack.includes(w)) ? 1 : 0;
}

export function SearchSelect({
  value,
  onValueChange,
  options,
  placeholder = "Choisir…",
  searchPlaceholder = "Rechercher…",
  emptyText = "Aucun résultat.",
  noneOption,
  title,
  loading,
  disabled,
  invalid,
  id,
  className,
  onBlur,
  ...rest
}: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;
  const selected = options.find((o) => o.value === value);

  const setOpenAndBlur = (o: boolean) => {
    setOpen(o);
    if (!o) onBlur?.();
  };
  const pick = (v: string) => {
    onValueChange(v);
    setOpenAndBlur(false);
  };

  const renderTrigger = (onClick?: () => void) => (
    <Button
      type="button"
      variant="outline"
      id={id}
      disabled={disabled}
      role="combobox"
      aria-expanded={open}
      aria-controls={listId}
      aria-invalid={invalid || undefined}
      aria-label={rest["aria-label"]}
      className={cn(
        "h-11 w-full justify-between gap-2 px-3 font-normal md:h-9",
        !selected && !(noneOption && value === "") && "text-muted-foreground",
        className,
      )}
      onClick={onClick}
    >
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate">{selected ? selected.label : value === "" && noneOption ? noneOption.label : placeholder}</span>
        {selected?.description && <span className="hidden truncate text-xs text-muted-foreground sm:inline">{selected.description}</span>}
      </span>
      <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
    </Button>
  );

  const list = (
    <Command filter={searchFilter} className="bg-transparent" loop>
      <CommandInput ref={inputRef} placeholder={searchPlaceholder} />
      <CommandList id={listId} className={cn(isMobile ? "max-h-[min(60dvh,28rem)]" : "max-h-72")}>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <CommandEmpty>{emptyText}</CommandEmpty>
        )}
        {noneOption && (
          <CommandGroup>
            <OptionRow
              option={{ value: "", label: noneOption.label, description: noneOption.description }}
              selected={value === ""}
              onPick={pick}
              large={isMobile}
              icon={<XIcon className="size-4 text-muted-foreground" />}
            />
          </CommandGroup>
        )}
        {groupOptions(options).map(([group, items]) => (
          <CommandGroup key={group || "_"} heading={group || undefined}>
            {items.map((o) => (
              <OptionRow key={o.value} option={o} selected={o.value === value} onPick={pick} large={isMobile} />
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );

  if (isMobile) {
    return (
      <>
        {renderTrigger(() => setOpen(true))}
        <Drawer open={open} onOpenChange={setOpenAndBlur}>
          <DrawerContent className="max-h-[85dvh] pb-[env(safe-area-inset-bottom)]">
            <DrawerHeader className="pb-0 text-left">
              <DrawerTitle>{title ?? placeholder}</DrawerTitle>
              <DrawerDescription className="sr-only">Recherchez puis touchez un élément pour le choisir.</DrawerDescription>
            </DrawerHeader>
            <div className="px-2 pb-3">{list}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpenAndBlur}>
      <PopoverTrigger render={renderTrigger()} />
      <PopoverContent align="start" initialFocus={inputRef} className="w-[max(var(--anchor-width),20rem)] max-w-[calc(100vw-2rem)] p-0">
        {list}
      </PopoverContent>
    </Popover>
  );
}

function groupOptions(options: SearchSelectOption[]) {
  const map = new Map<string, SearchSelectOption[]>();
  for (const o of options) {
    const k = o.group ?? "";
    map.set(k, [...(map.get(k) ?? []), o]);
  }
  return [...map];
}

function OptionRow({
  option: o,
  selected,
  onPick,
  large,
  icon,
}: {
  option: SearchSelectOption;
  selected: boolean;
  onPick: (v: string) => void;
  large: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <CommandItem
      value={`${o.label} ${o.description ?? ""} ${o.value}`}
      keywords={o.keywords}
      disabled={o.disabled}
      onSelect={() => onPick(o.value)}
      data-checked={selected ? "true" : undefined}
      className={cn("gap-3", large ? "min-h-12 py-2.5" : "py-2")}
    >
      {icon}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate", selected && "font-medium")}>{o.label}</span>
        {o.description && <span className="truncate text-xs text-muted-foreground">{o.description}</span>}
      </div>
      {o.meta && (
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            o.metaTone === "danger" ? "text-destructive" : o.metaTone === "warning" ? "text-[color-mix(in_oklch,var(--warning),black_35%)]" : "text-muted-foreground",
          )}
        >
          {o.meta}
        </span>
      )}
    </CommandItem>
  );
}
