// Input and output shapes for the deal engine.
// All money values are in whole currency units. All percentages are plain
// numbers where 7.5 means 7.5 percent.

export interface DealInput {
  name: string;
  purchase: {
    price: number;
    closingCosts: number;
  };
  /** Short term loan used to buy and rehab. Interest only. Set both loan percentages to 0 for an all cash deal. */
  bridge: {
    loanPctOfPurchase: number;
    loanPctOfRehab: number;
    ratePct: number;
    pointsPct: number;
  };
  rehab: {
    budget: number;
    contingencyPct: number;
  };
  /** The period between purchase and refinance. */
  holding: {
    months: number;
    /** Taxes, insurance and utilities paid each month while the unit is empty. */
    monthlyCosts: number;
  };
  rent: {
    monthlyRent: number;
    otherMonthlyIncome: number;
    vacancyPct: number;
  };
  expenses: {
    taxesAnnual: number;
    insuranceAnnual: number;
    /** Percent of gross scheduled income. */
    maintenancePct: number;
    /** Percent of gross scheduled income set aside for big replacements. */
    capexPct: number;
    /** Percent of collected income. */
    managementPct: number;
    hoaMonthly: number;
    otherMonthly: number;
  };
  refinance: {
    /** After repair value used by the lender. */
    arv: number;
    ltvPct: number;
    ratePct: number;
    termYears: number;
    closingCosts: number;
  };
}

export interface AcquisitionBreakdown {
  rehabTotal: number;
  bridgeLoan: number;
  bridgePoints: number;
  bridgeInterest: number;
  holdingCosts: number;
  totalProjectCost: number;
  cashInvested: number;
}

export interface RefinanceBreakdown {
  loanAmount: number;
  bridgePayoff: number;
  closingCosts: number;
  /** Loan amount minus bridge payoff minus closing costs. Negative means cash is owed at closing. */
  netProceeds: number;
  /** Cash invested minus net proceeds. Zero or less means all cash came back out. */
  cashLeftInDeal: number;
  /** Net proceeds as a percent of cash invested. */
  cashRecoveredPct: number;
  equity: number;
  equityPct: number;
}

export interface MonthlyBreakdown {
  grossIncome: number;
  vacancyLoss: number;
  effectiveIncome: number;
  taxes: number;
  insurance: number;
  maintenance: number;
  capex: number;
  management: number;
  hoa: number;
  other: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
}

export interface Returns {
  annualCashFlow: number;
  annualNoi: number;
  /** Percent. Null when no cash is left in the deal, see infiniteReturn. */
  cashOnCashPct: number | null;
  /** True when no cash is left in the deal and cash flow is positive. */
  infiniteReturn: boolean;
  /** Null when there is no refinance debt. */
  dscr: number | null;
  capRatePct: number;
  /** Monthly rent as a percent of purchase price plus rehab. */
  rentToCostPct: number;
  /** Total project cost as a percent of after repair value. */
  allInToArvPct: number;
}

export interface ScoreComponent {
  key: string;
  label: string;
  /** The measured value that was scored. Null when not applicable. */
  value: number | null;
  unit: string;
  /** At or below the floor the component earns zero points. */
  floor: number;
  /** At or above the target the component earns full points. */
  target: number;
  maxPoints: number;
  points: number;
  note: string;
}

export type Verdict = "strong" | "workable" | "marginal" | "pass";

export interface Score {
  total: number;
  maxTotal: number;
  verdict: Verdict;
  components: ScoreComponent[];
}

export interface DealResult {
  name: string;
  acquisition: AcquisitionBreakdown;
  refinance: RefinanceBreakdown;
  monthly: MonthlyBreakdown;
  returns: Returns;
  score: Score;
  warnings: string[];
}
