// Small pure helpers for loan math and rounding.

/** Round to two decimals without the usual binary float surprises (1.005 rounds to 1.01). */
export function round2(value: number): number {
  const rounded = Math.round((value + Number.EPSILON * Math.sign(value)) * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

/** Level monthly payment on a fully amortizing loan. */
export function monthlyPayment(principal: number, annualRatePct: number, termYears: number): number {
  if (principal <= 0) return 0;
  const months = Math.round(termYears * 12);
  if (months <= 0) {
    throw new RangeError("termYears must be greater than zero");
  }
  const rate = annualRatePct / 1200;
  if (rate === 0) return principal / months;
  return (principal * rate) / (1 - Math.pow(1 + rate, -months));
}

/** Simple interest on an interest only loan that is fully drawn on day one. */
export function interestOnlyCost(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  return principal * (annualRatePct / 1200) * months;
}

/** Share of a total as a percent. Returns 0 when the total is 0. */
export function pctOf(part: number, total: number): number {
  return total === 0 ? 0 : (part / total) * 100;
}
