/** Strips accidental `Bearer ` prefix and .env-style quotes from secrets. */
export function normalizeBearerToken(raw: string): string {
  let t = raw.trim();
  if (/^bearer\s+/i.test(t)) {
    t = t.replace(/^bearer\s+/i, "").trim();
  }
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  return t;
}
