import type { Scenario } from "./engine.js";
import type { DealResult } from "./types.js";

// Plain text rendering used by the demo. The UI renders the same result object as HTML.

export function money(value: number): string {
  const sign = value < 0 ? "-" : "";
  const whole = Math.round(Math.abs(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${whole}`;
}

export function pct(value: number | null, digits = 1): string {
  return value === null ? "n/a" : `${value.toFixed(digits)}%`;
}

export function cashOnCashText(result: DealResult): string {
  if (result.returns.cashOnCashPct !== null) return pct(result.returns.cashOnCashPct);
  return result.returns.infiniteReturn ? "infinite (no cash left in deal)" : "n/a (no cash left, no positive cash flow)";
}

function row(label: string, value: string): string {
  return `  ${label.padEnd(34, ".")} ${value}`;
}

export function formatReport(result: DealResult): string {
  const { acquisition: a, refinance: r, monthly: m, returns: ret, score } = result;
  const lines: string[] = [];
  lines.push(`=== ${result.name} ===`);
  lines.push("Buy and rehab");
  lines.push(row("Rehab with contingency", money(a.rehabTotal)));
  lines.push(row("Bridge loan", money(a.bridgeLoan)));
  lines.push(row("Bridge points and interest", money(a.bridgePoints + a.bridgeInterest)));
  lines.push(row("Holding costs", money(a.holdingCosts)));
  lines.push(row("Total project cost", money(a.totalProjectCost)));
  lines.push(row("Cash invested", money(a.cashInvested)));
  lines.push("Rent (stabilized month)");
  lines.push(row("Effective income", money(m.effectiveIncome)));
  lines.push(row("Operating expenses", money(m.operatingExpenses)));
  lines.push(row("Net operating income", money(m.noi)));
  lines.push("Refinance");
  lines.push(row("New loan", money(r.loanAmount)));
  lines.push(row("Net proceeds", money(r.netProceeds)));
  lines.push(row("Cash left in the deal", money(r.cashLeftInDeal)));
  lines.push(row("Cash recovered", pct(r.cashRecoveredPct)));
  lines.push(row("Equity after refinance", `${money(r.equity)} (${pct(r.equityPct)})`));
  lines.push("Results");
  lines.push(row("Debt service", `${money(m.debtService)} per month`));
  lines.push(row("Cash flow", `${money(m.cashFlow)} per month`));
  lines.push(row("Cash on cash return", cashOnCashText(result)));
  lines.push(row("Debt service coverage", ret.dscr === null ? "n/a (no debt)" : ret.dscr.toFixed(2)));
  lines.push(row("Cap rate on value", pct(ret.capRatePct)));
  lines.push(row("Rent to cost", pct(ret.rentToCostPct, 2)));
  lines.push(row("All in cost to value", pct(ret.allInToArvPct)));
  lines.push(`Score: ${score.total.toFixed(1)} of ${score.maxTotal} (${score.verdict})`);
  for (const c of score.components) {
    const value = c.value === null ? "n/a" : String(c.value);
    lines.push(
      `  ${c.label.padEnd(28)} ${c.points.toFixed(1).padStart(5)} / ${String(c.maxPoints).padEnd(3)} value ${value} ${c.unit}, floor ${c.floor}, target ${c.target} (${c.note})`,
    );
  }
  if (result.warnings.length === 0) {
    lines.push("Warnings: none");
  } else {
    lines.push("Warnings:");
    for (const w of result.warnings) lines.push(`  - ${w}`);
  }
  return lines.join("\n");
}

export function formatStressTable(scenarios: Scenario[]): string {
  const header = `  ${"Scenario".padEnd(32)} ${"Cash flow".padStart(10)} ${"DSCR".padStart(6)} ${"Cash left".padStart(10)} ${"Score".padStart(6)}  Verdict`;
  const rows = scenarios.map(({ label, result }) => {
    const dscr = result.returns.dscr === null ? "n/a" : result.returns.dscr.toFixed(2);
    return `  ${label.padEnd(32)} ${money(result.monthly.cashFlow).padStart(10)} ${dscr.padStart(6)} ${money(result.refinance.cashLeftInDeal).padStart(10)} ${result.score.total.toFixed(1).padStart(6)}  ${result.score.verdict}`;
  });
  return ["Stress test", header, ...rows].join("\n");
}
