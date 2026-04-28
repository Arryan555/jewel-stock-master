export function computeRowAmount(item: {
  weightGrams: number;
  ratePerGram: number;
  makingChargePercent: number;
  stoneCharges: number;
  gstRate: number;
}) {
  const metal = item.weightGrams * item.ratePerGram;
  const making = (metal * item.makingChargePercent) / 100;
  const base = metal + making + item.stoneCharges;
  const gst = (base * item.gstRate) / 100;
  return { base, gst, amount: base + gst };
}

export function monthsBetween(start: Date, end: Date): number {
  const ms = Math.max(0, end.getTime() - start.getTime());
  return ms / (1000 * 60 * 60 * 24 * 30);
}

export function projectedOutstanding(
  principal: number,
  monthlyPct: number,
  loanDate: Date,
  asOf: Date,
): number {
  const accrued = (principal * monthlyPct * monthsBetween(loanDate, asOf)) / 100;
  return principal + accrued;
}
