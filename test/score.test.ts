import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeDeal } from "../src/engine.js";
import { cashRecoveredText, formatReport, money, pct } from "../src/report.js";
import { SAMPLE_DEALS } from "../src/samples.js";
import { DEFAULT_SCORE_CONFIG, linearPoints, verdictFor } from "../src/score.js";

test("linearPoints is zero at the floor, full at the target and linear between", () => {
  const band = { floor: 1.0, target: 1.4, maxPoints: 25 };
  assert.equal(linearPoints(0.8, band), 0);
  assert.equal(linearPoints(1.0, band), 0);
  assert.equal(linearPoints(1.2, band), 12.5);
  assert.equal(linearPoints(1.4, band), 25);
  assert.equal(linearPoints(3, band), 25);
  assert.throws(() => linearPoints(1, { floor: 2, target: 2, maxPoints: 10 }), RangeError);
});

test("default weights add up to 100", () => {
  const c = DEFAULT_SCORE_CONFIG;
  const sum = c.cashFlow.maxPoints + c.cashOnCash.maxPoints + c.dscr.maxPoints + c.cashRecovered.maxPoints + c.equity.maxPoints;
  assert.equal(sum, 100);
});

test("verdict thresholds", () => {
  assert.equal(verdictFor(75), "strong");
  assert.equal(verdictFor(74.9), "workable");
  assert.equal(verdictFor(55), "workable");
  assert.equal(verdictFor(35), "marginal");
  assert.equal(verdictFor(34.9), "pass");
});

test("score total is the sum of its components and every component explains itself", () => {
  for (const deal of SAMPLE_DEALS) {
    const { score } = analyzeDeal(deal);
    const sum = Math.round(score.components.reduce((s, c) => s + c.points, 0) * 10) / 10;
    assert.equal(score.total, sum);
    assert.equal(score.maxTotal, 100);
    assert.equal(score.components.length, 5);
    for (const c of score.components) {
      assert.ok(c.points >= 0 && c.points <= c.maxPoints, c.key);
      assert.ok(c.note.length > 0, c.key);
    }
  }
});

test("a custom score config changes the points, not the underlying numbers", () => {
  const deal = SAMPLE_DEALS[1];
  const base = analyzeDeal(deal);
  const strict = analyzeDeal(deal, {
    ...DEFAULT_SCORE_CONFIG,
    cashFlow: { floor: 0, target: 1000, maxPoints: 25 },
  });
  assert.deepEqual(strict.monthly, base.monthly);
  assert.ok(strict.score.total < base.score.total);
});

test("report formatting", () => {
  assert.equal(money(1234567.4), "$1,234,567");
  assert.equal(money(-950), "-$950");
  assert.equal(pct(12.345), "12.3%");
  assert.equal(pct(null), "n/a");
  const text = formatReport(analyzeDeal(SAMPLE_DEALS[0]));
  assert.ok(text.includes("Cash left in the deal"));
  assert.ok(text.includes("Score:"));
  const base = analyzeDeal(SAMPLE_DEALS[0]);
  assert.equal(cashRecoveredText(base), "82.0%");
  assert.equal(cashRecoveredText({ ...base, acquisition: { ...base.acquisition, cashInvested: 0 } }), "n/a (no cash invested)");
  assert.ok(!text.includes(String.fromCharCode(8212)));
});
