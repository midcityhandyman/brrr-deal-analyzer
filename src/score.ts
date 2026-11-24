import { round2 } from "./finance.js";
import type { MonthlyBreakdown, RefinanceBreakdown, Returns, Score, ScoreComponent, Verdict } from "./types.js";

// The score is a plain weighted sum. Each component is linear between a floor
// (zero points) and a target (full points). Nothing is hidden: every component
// reports the value it measured, its floor, its target and the points earned.

export interface ScoreBand {
  floor: number;
  target: number;
  maxPoints: number;
}

export interface ScoreConfig {
  cashFlow: ScoreBand;
  cashOnCash: ScoreBand;
  dscr: ScoreBand;
  cashRecovered: ScoreBand;
  equity: ScoreBand;
  verdicts: { strong: number; workable: number; marginal: number };
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  cashFlow: { floor: 0, target: 300, maxPoints: 25 },
  cashOnCash: { floor: 0, target: 12, maxPoints: 25 },
  dscr: { floor: 1.0, target: 1.4, maxPoints: 25 },
  cashRecovered: { floor: 50, target: 100, maxPoints: 15 },
  equity: { floor: 15, target: 30, maxPoints: 10 },
  verdicts: { strong: 75, workable: 55, marginal: 35 },
};

/** Linear points between floor and target, clamped to the range 0 to maxPoints. */
export function linearPoints(value: number, band: ScoreBand): number {
  if (band.target <= band.floor) {
    throw new RangeError("score band target must be greater than its floor");
  }
  const share = (value - band.floor) / (band.target - band.floor);
  const clamped = Math.min(1, Math.max(0, share));
  return Math.round(clamped * band.maxPoints * 10) / 10;
}

function component(
  key: string,
  label: string,
  unit: string,
  band: ScoreBand,
  value: number | null,
  override?: { points: number; note: string },
): ScoreComponent {
  const points = override ? override.points : linearPoints(value ?? band.floor, band);
  let note = override?.note ?? "";
  if (!override) {
    if (points >= band.maxPoints) note = "at or above target";
    else if (points <= 0) note = "at or below floor";
    else note = "between floor and target";
  }
  return {
    key,
    label,
    value: value === null ? null : round2(value),
    unit,
    floor: band.floor,
    target: band.target,
    maxPoints: band.maxPoints,
    points,
    note,
  };
}

export function verdictFor(total: number, config: ScoreConfig = DEFAULT_SCORE_CONFIG): Verdict {
  if (total >= config.verdicts.strong) return "strong";
  if (total >= config.verdicts.workable) return "workable";
  if (total >= config.verdicts.marginal) return "marginal";
  return "pass";
}

export function scoreDeal(
  monthly: MonthlyBreakdown,
  refinance: RefinanceBreakdown,
  returns: Returns,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
): Score {
  const components: ScoreComponent[] = [];

  components.push(component("cashFlow", "Monthly cash flow", "per month", config.cashFlow, monthly.cashFlow));

  if (returns.cashOnCashPct !== null) {
    components.push(component("cashOnCash", "Cash on cash return", "percent", config.cashOnCash, returns.cashOnCashPct));
  } else if (returns.infiniteReturn) {
    components.push(
      component("cashOnCash", "Cash on cash return", "percent", config.cashOnCash, null, {
        points: config.cashOnCash.maxPoints,
        note: "no cash left in the deal and cash flow is positive, full points",
      }),
    );
  } else {
    components.push(
      component("cashOnCash", "Cash on cash return", "percent", config.cashOnCash, null, {
        points: 0,
        note: "no cash left in the deal but cash flow is not positive, zero points",
      }),
    );
  }

  if (returns.dscr !== null) {
    components.push(component("dscr", "Debt service coverage", "ratio", config.dscr, returns.dscr));
  } else {
    const positive = monthly.noi > 0;
    components.push(
      component("dscr", "Debt service coverage", "ratio", config.dscr, null, {
        points: positive ? config.dscr.maxPoints : 0,
        note: positive ? "no refinance debt and income covers expenses, full points" : "no refinance debt but income does not cover expenses, zero points",
      }),
    );
  }

  // Cash invested is what is left in the deal plus what came back out. With nothing
  // invested there is no percentage to measure, so the case is scored by rule.
  const cashInvested = refinance.cashLeftInDeal + refinance.netProceeds;
  if (cashInvested >= 1) {
    components.push(
      component("cashRecovered", "Cash recovered at refinance", "percent", config.cashRecovered, refinance.cashRecoveredPct),
    );
  } else {
    const covered = refinance.netProceeds >= 0;
    components.push(
      component("cashRecovered", "Cash recovered at refinance", "percent", config.cashRecovered, null, {
        points: covered ? config.cashRecovered.maxPoints : 0,
        note: covered
          ? "no cash was invested, so there is nothing to recover, full points"
          : "no cash was invested but the refinance needs cash at closing, zero points",
      }),
    );
  }
  components.push(component("equity", "Equity after refinance", "percent of value", config.equity, refinance.equityPct));

  const total = Math.round(components.reduce((sum, c) => sum + c.points, 0) * 10) / 10;
  const maxTotal = components.reduce((sum, c) => sum + c.maxPoints, 0);
  return { total, maxTotal, verdict: verdictFor(total, config), components };
}
