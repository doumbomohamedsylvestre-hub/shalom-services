/** Mali phone numbers: 8 local digits, stored as +223XXXXXXXX (SPEC assumption 8). */
export function normalizeMaliPhone(input: string): string | null {
  let d = input.replace(/[\s.\-()]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("223")) d = d.slice(3);
  return /^\d{8}$/.test(d) ? `+223${d}` : null;
}

export function waLink(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
