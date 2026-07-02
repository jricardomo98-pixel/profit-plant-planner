export const fmtEUR = (n: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Parse a decimal string that may use "," or "." as separator. */
export const parseDec = (v: string): number => {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Normalize onChange value so state keeps what the user typed but with "." internally
 *  is not needed — we keep the raw string in state and parse at read time. */
export const sanitizeDecInput = (v: string): string =>
  v.replace(/[^\d.,-]/g, "");

