import assert from "node:assert/strict";
import { test } from "node:test";
import { interestOnlyCost, monthlyPayment, pctOf, round2 } from "../src/finance.js";

test("monthlyPayment matches the standard amortization formula", () => {
  // 100,000 at 6 percent for 30 years is the textbook 599.55.
  assert.equal(round2(monthlyPayment(100000, 6, 30)), 599.55);
  // 200,000 at 7.5 percent for 30 years.
  assert.equal(round2(monthlyPayment(200000, 7.5, 30)), 1398.43);
});

test("monthlyPayment handles zero rate and zero principal", () => {
  assert.equal(monthlyPayment(120000, 0, 10), 1000);
  assert.equal(monthlyPayment(0, 7, 30), 0);
});

test("monthlyPayment rejects a zero term", () => {
  assert.throws(() => monthlyPayment(1000, 5, 0), RangeError);
});

test("interestOnlyCost is simple interest for the holding period", () => {
  assert.equal(interestOnlyCost(100000, 12, 6), 6000);
  assert.equal(interestOnlyCost(0, 12, 6), 0);
  assert.equal(interestOnlyCost(100000, 12, 0), 0);
});

test("round2 and pctOf", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(-0.001), 0);
  assert.equal(pctOf(25, 200), 12.5);
  assert.equal(pctOf(5, 0), 0);
});
