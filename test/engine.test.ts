import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeDeal, stressTest } from "../src/engine.js";
import { SAMPLE_DEALS } from "../src/samples.js";
import type { DealInput } from "../src/types.js";
import { DealInputError, validateDeal } from "../src/validate.js";

/** Round numbers chosen so every figure can be checked by hand. */
function handDeal(): DealInput {
  return {
    name: "Hand checked deal",
    purchase: { price: 100000, closingCosts: 2000 },
    bridge: { loanPctOfPurchase: 80, loanPctOfRehab: 0, ratePct: 12, pointsPct: 2 },
    rehab: { budget: 30000, contingencyPct: 10 },
    holding: { months: 6, monthlyCosts: 300 },
    rent: { monthlyRent: 2000, otherMonthlyIncome: 0, vacancyPct: 5 },
    expenses: {
      taxesAnnual: 2400,
      insuranceAnnual: 1200,
      maintenancePct: 5,
      capexPct: 5,
      managementPct: 10,
      hoaMonthly: 0,
      otherMonthly: 0,
    },
    refinance: { arv: 180000, ltvPct: 75, ratePct: 6, termYears: 30, closingCosts: 3000 },
  };
}

test("acquisition: project cost and cash invested", () => {
  const { acquisition: a } = analyzeDeal(handDeal());
  assert.equal(a.rehabTotal, 33000);
  assert.equal(a.bridgeLoan, 80000);
  assert.equal(a.bridgePoints, 1600);
  assert.equal(a.bridgeInterest, 4800); // 80,000 x 1 percent x 6 months
  assert.equal(a.holdingCosts, 1800);
  assert.equal(a.totalProjectCost, 143200);
  assert.equal(a.cashInvested, 63200);
});

test("refinance: proceeds, cash left in the deal and equity", () => {
  const { refinance: r } = analyzeDeal(handDeal());
  assert.equal(r.loanAmount, 135000);
  assert.equal(r.netProceeds, 52000); // 135,000 - 80,000 - 3,000
  assert.equal(r.cashLeftInDeal, 11200);
  assert.equal(r.cashRecoveredPct, 82.28);
  assert.equal(r.equity, 45000);
  assert.equal(r.equityPct, 25);
});

test("operations: income, expenses and net operating income", () => {
  const { monthly: m } = analyzeDeal(handDeal());
  assert.equal(m.grossIncome, 2000);
  assert.equal(m.vacancyLoss, 100);
  assert.equal(m.effectiveIncome, 1900);
  assert.equal(m.management, 190); // percent of collected income
  assert.equal(m.operatingExpenses, 690); // 200 + 100 + 100 + 100 + 190
  assert.equal(m.noi, 1210);
});

test("returns: cash flow, cash on cash and debt service coverage", () => {
  const { monthly: m, returns: ret } = analyzeDeal(handDeal());
  assert.equal(m.debtService, 809.39); // 135,000 at 6 percent for 30 years
  assert.equal(m.cashFlow, 400.61);
  assert.equal(ret.annualCashFlow, 4807.28); // twelve times the unrounded monthly figure
  assert.equal(ret.cashOnCashPct, 42.92);
  assert.equal(ret.dscr, 1.49);
  assert.equal(ret.capRatePct, 8.07);
  assert.equal(ret.rentToCostPct, 1.5);
  assert.equal(ret.infiniteReturn, false);
});

test("cash left in the deal equals project cost plus refinance costs minus the new loan", () => {
  for (const deal of SAMPLE_DEALS) {
    const r = analyzeDeal(deal);
    const expected = r.acquisition.totalProjectCost + r.refinance.closingCosts - r.refinance.loanAmount;
    assert.ok(Math.abs(r.refinance.cashLeftInDeal - expected) < 0.02, deal.name);
  }
});

test("all cash recovered gives an infinite return instead of a division by zero", () => {
  const deal = handDeal();
  deal.refinance.arv = 220000; // loan 165,000, proceeds 82,000, more than the 63,200 invested
  const r = analyzeDeal(deal);
  assert.ok(r.refinance.cashLeftInDeal < 0);
  assert.equal(r.returns.cashOnCashPct, null);
  assert.equal(r.returns.infiniteReturn, true);
  const coc = r.score.components.find((c) => c.key === "cashOnCash");
  assert.equal(coc?.points, coc?.maxPoints);
});

test("all cash deal with no refinance debt has no coverage ratio", () => {
  const deal = handDeal();
  deal.bridge.loanPctOfPurchase = 0;
  deal.refinance.ltvPct = 0;
  deal.refinance.closingCosts = 0;
  const r = analyzeDeal(deal);
  assert.equal(r.acquisition.bridgeLoan, 0);
  assert.equal(r.monthly.debtService, 0);
  assert.equal(r.returns.dscr, null);
  assert.equal(r.monthly.cashFlow, r.monthly.noi);
  assert.equal(r.refinance.cashLeftInDeal, r.acquisition.cashInvested);
});

test("warnings flag negative cash flow, weak coverage and a short refinance", () => {
  const deal = handDeal();
  deal.rent.monthlyRent = 900;
  deal.refinance.arv = 100000; // loan 75,000 cannot pay off the 80,000 bridge
  const r = analyzeDeal(deal);
  assert.ok(r.monthly.cashFlow < 0);
  // The shortfall is printed as a positive amount, not "negative cash flow of -x".
  const shortfall = r.warnings.find((w) => w.startsWith("Negative cash flow"));
  assert.ok(shortfall?.includes(`${-r.monthly.cashFlow} short each month`), shortfall);
  assert.ok(!shortfall?.includes("-"));
  assert.ok(r.warnings.some((w) => w.includes("below")));
  assert.ok(r.warnings.some((w) => w.includes("more cash is needed at closing")));
  assert.ok(r.warnings.some((w) => w.includes("higher than the after repair value")));
  assert.equal(r.score.verdict, "pass");
});

test("a clean deal has no warnings", () => {
  assert.deepEqual(analyzeDeal(handDeal()).warnings, []);
});

test("validation reports every bad field and analyzeDeal refuses the input", () => {
  const deal = handDeal();
  deal.purchase.price = 0;
  deal.rent.vacancyPct = 140;
  deal.refinance.termYears = Number.NaN;
  const problems = validateDeal(deal);
  assert.equal(problems.length, 3);
  assert.ok(problems[0].startsWith("purchase.price"));
  assert.throws(() => analyzeDeal(deal), DealInputError);
  assert.deepEqual(validateDeal(handDeal()), []);
});

test("analyzeDeal does not mutate its input and is deterministic", () => {
  const deal = handDeal();
  const before = JSON.stringify(deal);
  const first = analyzeDeal(deal);
  const second = analyzeDeal(deal);
  assert.equal(JSON.stringify(deal), before);
  assert.deepEqual(first, second);
});

test("stress test: scenarios move the numbers in the expected direction", () => {
  const deal = handDeal();
  const before = JSON.stringify(deal);
  const scenarios = stressTest(deal);
  assert.equal(scenarios.length, 5);
  assert.equal(scenarios[0].label, "Base case");
  assert.deepEqual(scenarios[0].result, analyzeDeal(deal));
  // Rent, rate and rehab stresses can only hurt. A lower appraisal is different:
  // the loan shrinks, so coverage improves while more cash stays in the deal.
  for (const i of [1, 2, 4]) {
    assert.ok(scenarios[i].result.score.total < scenarios[0].result.score.total, scenarios[i].label);
  }
  assert.ok(scenarios[1].result.monthly.cashFlow < scenarios[0].result.monthly.cashFlow);
  assert.ok(scenarios[3].result.refinance.cashLeftInDeal > scenarios[0].result.refinance.cashLeftInDeal);
  assert.equal(JSON.stringify(deal), before);
});

test("sample deals all validate and cover the verdict range", () => {
  const verdicts = SAMPLE_DEALS.map((d) => analyzeDeal(d).score.verdict);
  assert.deepEqual(verdicts, ["strong", "workable", "pass"]);
});

test("validation names a missing section instead of crashing", () => {
  const { refinance: _refinance, ...partial } = handDeal();
  const problems = validateDeal(partial as DealInput);
  assert.deepEqual(problems, ["refinance section is missing"]);
  assert.throws(() => analyzeDeal(partial as DealInput), DealInputError);
  assert.throws(() => analyzeDeal(null as unknown as DealInput), DealInputError);
});

test("stress test accepts a valid deal at the top of the rate range", () => {
  const deal = handDeal();
  deal.refinance.ratePct = 40; // the highest rate validation allows; the stress adds one point
  const scenarios = stressTest(deal);
  assert.equal(scenarios.length, 5);
  assert.ok(scenarios[2].result.monthly.debtService > scenarios[0].result.monthly.debtService);
  // A deal that is invalid to begin with is still refused.
  deal.refinance.ratePct = 41;
  assert.throws(() => stressTest(deal), DealInputError);
});

test("a deal with no cash invested is not scored as zero percent recovered", () => {
  const deal = handDeal();
  deal.purchase.closingCosts = 0;
  deal.bridge = { loanPctOfPurchase: 100, loanPctOfRehab: 100, ratePct: 12, pointsPct: 0 };
  deal.holding = { months: 0, monthlyCosts: 0 };
  const r = analyzeDeal(deal);
  assert.equal(r.acquisition.cashInvested, 0);
  assert.ok(r.refinance.netProceeds < 0); // loan 135,000 minus 133,000 payoff minus 3,000 costs
  const short = r.score.components.find((c) => c.key === "cashRecovered");
  assert.equal(short?.points, 0);
  assert.equal(short?.value, null);

  deal.refinance.closingCosts = 0;
  const covered = analyzeDeal(deal).score.components.find((c) => c.key === "cashRecovered");
  assert.equal(covered?.points, covered?.maxPoints);
  assert.ok(covered?.note.includes("nothing to recover"));
});
