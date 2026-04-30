export const fmtEUR = (n: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export const round2 = (n: number) => Math.round(n * 100) / 100;
