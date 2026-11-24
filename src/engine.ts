import { interestOnlyCost, monthlyPayment, pctOf, round2 } from "./finance.js";
import { DEFAULT_SCORE_CONFIG, scoreDeal, type ScoreConfig } from "./score.js";
import type {
  AcquisitionBreakdown,
  DealInput,
  DealResult,
  MonthlyBreakdown,
  RefinanceBreakdown,
  Returns,
} from "./types.js";
import { DealInputError, validateDeal } from "./validate.js";

export const MIN_LENDER_DSCR = 1.2;

function roundAll<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = typeof value === "number" ? round2(value) : value;
  }
  return out as T;
}

/** Phase 1 and 2: buy and rehab. What the project costs and how much of it is cash. */
export function analyzeAcquisition(input: DealInput): AcquisitionBreakdown {
  const rehabTotal = input.rehab.budget * (1 + input.rehab.contingencyPct / 100);
  const bridgeLoan =
    (input.purchase.price * input.bridge.loanPctOfPurchase) / 100 + (rehabTotal * input.bridge.loanPctOfRehab) / 100;
  const bridgePoints = (bridgeLoan * input.bridge.pointsPct) / 100;
  const bridgeInterest = interestOnlyCost(bridgeLoan, input.bridge.ratePct, input.holding.months);
  const holdingCosts = input.holding.monthlyCosts * input.holding.months;
  const totalProjectCost =
    input.purchase.price + input.purchase.closingCosts + rehabTotal + bridgePoints + bridgeInterest + holdingCosts;
  const cashInvested = totalProjectCost - bridgeLoan;
  return { rehabTotal, bridgeLoan, bridgePoints, bridgeInterest, holdingCosts, totalProjectCost, cashInvested };
}

/** Phase 3: rent. A stabilized month of income and operating expenses, before debt. */
export function analyzeOperations(input: DealInput): Omit<MonthlyBreakdown, "debtService" | "cashFlow"> {
  const grossIncome = input.rent.monthlyRent + input.rent.otherMonthlyIncome;
  const vacancyLoss = (grossIncome * input.rent.vacancyPct) / 100;
  const effectiveIncome = grossIncome - vacancyLoss;
  const taxes = input.expenses.taxesAnnual / 12;
  const insurance = input.expenses.insuranceAnnual / 12;
  const maintenance = (grossIncome * input.expenses.maintenancePct) / 100;
  const capex = (grossIncome * input.expenses.capexPct) / 100;
  const management = (effectiveIncome * input.expenses.managementPct) / 100;
  const hoa = input.expenses.hoaMonthly;
  const other = input.expenses.otherMonthly;
  const operatingExpenses = taxes + insurance + maintenance + capex + management + hoa + other;
  const noi = effectiveIncome - operatingExpenses;
  return {
    grossIncome,
    vacancyLoss,
    effectiveIncome,
    taxes,
    insurance,
    maintenance,
    capex,
    management,
    hoa,
    other,
    operatingExpenses,
    noi,
  };
}

/** Phase 4: refinance. New loan pays off the bridge loan and returns cash to the investor. */
export function analyzeRefinance(input: DealInput, acquisition: AcquisitionBreakdown): RefinanceBreakdown {
  const loanAmount = (input.refinance.arv * input.refinance.ltvPct) / 100;
  const bridgePayoff = acquisition.bridgeLoan;
  const closingCosts = input.refinance.closingCosts;
  const netProceeds = loanAmount - bridgePayoff - closingCosts;
  const cashLeftInDeal = acquisition.cashInvested - netProceeds;
  const cashRecoveredPct = pctOf(netProceeds, acquisition.cashInvested);
  const equity = input.refinance.arv - loanAmount;
  const equityPct = pctOf(equity, input.refinance.arv);
  return { loanAmount, bridgePayoff, closingCosts, netProceeds, cashLeftInDeal, cashRecoveredPct, equity, equityPct };
}

function buildWarnings(input: DealInput, a: AcquisitionBreakdown, r: RefinanceBreakdown, m: MonthlyBreakdown, ret: Returns): string[] {
  const warnings: string[] = [];
  if (m.cashFlow < 0) {
    warnings.push(`Negative cash flow: ${round2(-m.cashFlow)} short each month after the refinance.`);
  }
  if (ret.dscr !== null && ret.dscr < 1) {
    warnings.push(`Debt service coverage of ${round2(ret.dscr)} is below 1.0: income does not cover the loan payment.`);
  } else if (ret.dscr !== null && ret.dscr < MIN_LENDER_DSCR) {
    warnings.push(`Debt service coverage of ${round2(ret.dscr)} is below ${MIN_LENDER_DSCR}, a common lender minimum.`);
  }
  if (r.netProceeds < 0) {
    warnings.push(`Refinance does not cover the bridge payoff and closing costs: ${round2(-r.netProceeds)} more cash is needed at closing.`);
  }
  if (a.totalProjectCost > input.refinance.arv) {
    warnings.push("Total project cost is higher than the after repair value.");
  }
  if (input.rehab.budget > 0 && input.rehab.contingencyPct === 0) {
    warnings.push("Rehab budget has no contingency.");
  }
  if (input.rent.vacancyPct === 0) {
    warnings.push("Vacancy is set to zero, which is rarely true over a full year.");
  }
  return warnings;
}

/** Runs the whole analysis. Throws DealInputError when the input is not usable. */
export function analyzeDeal(input: DealInput, scoreConfig: ScoreConfig = DEFAULT_SCORE_CONFIG): DealResult {
  const problems = validateDeal(input);
  if (problems.length > 0) throw new DealInputError(problems);
  return compute(input, scoreConfig);
}

/** The analysis itself, with no range checks. stressTest uses it so a stressed value may leave the input ranges. */
function compute(input: DealInput, scoreConfig: ScoreConfig): DealResult {
  const acquisition = analyzeAcquisition(input);
  const refinance = analyzeRefinance(input, acquisition);
  const operations = analyzeOperations(input);
  const debtService = monthlyPayment(refinance.loanAmount, input.refinance.ratePct, input.refinance.termYears);
  const monthly: MonthlyBreakdown = { ...operations, debtService, cashFlow: operations.noi - debtService };

  const annualCashFlow = monthly.cashFlow * 12;
  const annualNoi = monthly.noi * 12;
  // Below one currency unit is treated as nothing left in the deal.
  const hasCashLeft = refinance.cashLeftInDeal >= 1;
  const returns: Returns = {
    annualCashFlow,
    annualNoi,
    cashOnCashPct: hasCashLeft ? (annualCashFlow / refinance.cashLeftInDeal) * 100 : null,
    infiniteReturn: !hasCashLeft && annualCashFlow > 0,
    dscr: debtService > 0 ? monthly.noi / debtService : null,
    capRatePct: pctOf(annualNoi, input.refinance.arv),
    rentToCostPct: pctOf(input.rent.monthlyRent, input.purchase.price + acquisition.rehabTotal),
    allInToArvPct: pctOf(acquisition.totalProjectCost, input.refinance.arv),
  };

  const score = scoreDeal(monthly, refinance, returns, scoreConfig);
  const warnings = buildWarnings(input, acquisition, refinance, monthly, returns);

  return {
    name: input.name,
    acquisition: roundAll(acquisition),
    refinance: roundAll(refinance),
    monthly: roundAll(monthly),
    returns: roundAll(returns),
    score,
    warnings,
  };
}

export interface Scenario {
  label: string;
  result: DealResult;
}

/**
 * Re-runs the deal with one assumption stressed at a time. The input is checked once;
 * a stressed copy is not rejected for leaving the input ranges (a 40 percent rate plus one point).
 */
export function stressTest(input: DealInput, scoreConfig: ScoreConfig = DEFAULT_SCORE_CONFIG): Scenario[] {
  const variants: Array<[string, (d: DealInput) => void]> = [
    ["Base case", () => {}],
    ["Rent 10 percent lower", (d) => { d.rent.monthlyRent *= 0.9; }],
    ["Refinance rate 1 point higher", (d) => { d.refinance.ratePct += 1; }],
    ["Appraisal 10 percent lower", (d) => { d.refinance.arv *= 0.9; }],
    ["Rehab 20 percent over budget", (d) => { d.rehab.budget *= 1.2; }],
  ];
  const problems = validateDeal(input);
  if (problems.length > 0) throw new DealInputError(problems);
  return variants.map(([label, mutate]) => {
    const copy: DealInput = structuredClone(input);
    mutate(copy);
    return { label, result: compute(copy, scoreConfig) };
  });
}
