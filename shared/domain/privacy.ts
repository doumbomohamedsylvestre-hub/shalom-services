/** Public tracking shows only a masked name (SPEC §2.8): "Mamadou Traoré" → "Mamadou T." */
export function maskName(name: string) {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return `${first} ${rest.map((p) => `${p[0]?.toUpperCase()}.`).join(" ")}`.trim();
}
