// Business calculations shared by routes.

export interface InvoiceItemInput {
  weightGrams: number;
  ratePerGram: number;
  makingChargePercent: number;
  stoneCharges: number;
  gstRate: number;
}

export interface ComputedItem {
  base: number;
  amount: number;
  gst: number;
}

export function computeItem(item: InvoiceItemInput): ComputedItem {
  const metalValue = item.weightGrams * item.ratePerGram;
  const making = (metalValue * item.makingChargePercent) / 100;
  const base = metalValue + making + item.stoneCharges;
  const gst = (base * item.gstRate) / 100;
  return { base, amount: base + gst, gst };
}

export interface InvoiceTotals {
  subtotal: number;
  gstAmount: number;
  total: number;
}

export function computeInvoiceTotals(
  items: InvoiceItemInput[],
  discount: number,
): InvoiceTotals {
  let subtotal = 0;
  let gstAmount = 0;
  for (const item of items) {
    const c = computeItem(item);
    subtotal += c.base;
    gstAmount += c.gst;
  }
  const total = Math.max(0, subtotal + gstAmount - (discount || 0));
  return { subtotal, gstAmount, total };
}

export function computeInvoiceStatus(
  total: number,
  paid: number,
): "paid" | "partial" | "unpaid" {
  if (paid <= 0) return "unpaid";
  if (paid + 0.001 >= total) return "paid";
  return "partial";
}

// Simple monthly interest, accrued from loan date to "now" or close date.
export function computeAccruedInterest(
  principal: number,
  monthlyPct: number,
  loanDate: Date,
  asOf: Date,
): number {
  if (principal <= 0 || monthlyPct <= 0) return 0;
  const ms = Math.max(0, asOf.getTime() - loanDate.getTime());
  const months = ms / (1000 * 60 * 60 * 24 * 30);
  return (principal * monthlyPct * months) / 100;
}

export function computeGirviStatus(
  rawStatus: string,
  outstanding: number,
  dueDate: Date,
  asOf: Date,
): "active" | "closed" | "overdue" {
  if (rawStatus === "closed") return "closed";
  if (outstanding <= 0.001) return "closed";
  if (asOf.getTime() > dueDate.getTime()) return "overdue";
  return "active";
}

export function n(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const v = parseFloat(value);
    return Number.isFinite(v) ? v : 0;
  }
  return 0;
}

export function nextSerial(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
}
