/** Formatting for the UI only: French (Mali), XOF, Africa/Bamako. */
const TZ = "Africa/Bamako";

const xof = new Intl.NumberFormat("fr-ML", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("fr-ML", { maximumFractionDigits: 0 });

export const formatXOF = (amount: number) => xof.format(amount);
export const formatNumber = (n: number) => num.format(n);
export const formatCompactXOF = (amount: number) =>
  amount >= 1_000_000
    ? `${num.format(Math.round(amount / 100_000) / 10)} M FCFA`
    : amount >= 10_000
      ? `${num.format(Math.round(amount / 1000))} k FCFA`
      : xof.format(amount);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(
    new Date(iso),
  );

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
export function formatRelative(iso: string, now = Date.now()) {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(iso);
}

/** "+22370123456" -> "+223 70 12 34 56" */
export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  const local = d.startsWith("223") ? d.slice(3) : d;
  if (local.length !== 8) return phone;
  return `+223 ${local.replace(/(\d{2})(?=\d)/g, "$1 ").trim()}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
