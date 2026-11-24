import type { DealInput } from "./types.js";

export class DealInputError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super("Invalid deal input: " + problems.join("; "));
    this.name = "DealInputError";
    this.problems = problems;
  }
}

type Rule = [path: string, value: number, min: number, max: number];

/** Returns a list of human readable problems. An empty list means the input is usable. */
export function validateDeal(input: DealInput): string[] {
  const big = 1e9;
  const rules: Rule[] = [
    ["purchase.price", input.purchase.price, 1, big],
    ["purchase.closingCosts", input.purchase.closingCosts, 0, big],
    ["bridge.loanPctOfPurchase", input.bridge.loanPctOfPurchase, 0, 100],
    ["bridge.loanPctOfRehab", input.bridge.loanPctOfRehab, 0, 100],
    ["bridge.ratePct", input.bridge.ratePct, 0, 40],
    ["bridge.pointsPct", input.bridge.pointsPct, 0, 10],
    ["rehab.budget", input.rehab.budget, 0, big],
    ["rehab.contingencyPct", input.rehab.contingencyPct, 0, 100],
    ["holding.months", input.holding.months, 0, 60],
    ["holding.monthlyCosts", input.holding.monthlyCosts, 0, big],
    ["rent.monthlyRent", input.rent.monthlyRent, 0, big],
    ["rent.otherMonthlyIncome", input.rent.otherMonthlyIncome, 0, big],
    ["rent.vacancyPct", input.rent.vacancyPct, 0, 100],
    ["expenses.taxesAnnual", input.expenses.taxesAnnual, 0, big],
    ["expenses.insuranceAnnual", input.expenses.insuranceAnnual, 0, big],
    ["expenses.maintenancePct", input.expenses.maintenancePct, 0, 100],
    ["expenses.capexPct", input.expenses.capexPct, 0, 100],
    ["expenses.managementPct", input.expenses.managementPct, 0, 100],
    ["expenses.hoaMonthly", input.expenses.hoaMonthly, 0, big],
    ["expenses.otherMonthly", input.expenses.otherMonthly, 0, big],
    ["refinance.arv", input.refinance.arv, 1, big],
    ["refinance.ltvPct", input.refinance.ltvPct, 0, 100],
    ["refinance.ratePct", input.refinance.ratePct, 0, 40],
    ["refinance.termYears", input.refinance.termYears, 1, 50],
    ["refinance.closingCosts", input.refinance.closingCosts, 0, big],
  ];

  const problems: string[] = [];
  for (const [path, value, min, max] of rules) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      problems.push(`${path} must be a number`);
    } else if (value < min || value > max) {
      problems.push(`${path} must be between ${min} and ${max}, got ${value}`);
    }
  }
  return problems;
}
