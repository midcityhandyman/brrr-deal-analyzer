import type { DealInput } from "./types.js";

// Synthetic sample deals. Every number here is invented for the demo and the
// tests. None of them describe a real property.

export const SAMPLE_DEALS: DealInput[] = [
  {
    name: "Sample Duplex A (invented numbers)",
    purchase: { price: 92000, closingCosts: 3200 },
    bridge: { loanPctOfPurchase: 85, loanPctOfRehab: 100, ratePct: 11, pointsPct: 2 },
    rehab: { budget: 38000, contingencyPct: 10 },
    holding: { months: 5, monthlyCosts: 420 },
    rent: { monthlyRent: 2350, otherMonthlyIncome: 40, vacancyPct: 6 },
    expenses: {
      taxesAnnual: 3100,
      insuranceAnnual: 1450,
      maintenancePct: 6,
      capexPct: 6,
      managementPct: 8,
      hoaMonthly: 0,
      otherMonthly: 35,
    },
    refinance: { arv: 195000, ltvPct: 75, ratePct: 7.25, termYears: 30, closingCosts: 4100 },
  },
  {
    name: "Sample Bungalow B (invented numbers)",
    purchase: { price: 98000, closingCosts: 3900 },
    bridge: { loanPctOfPurchase: 80, loanPctOfRehab: 0, ratePct: 10.5, pointsPct: 1.5 },
    rehab: { budget: 27000, contingencyPct: 10 },
    holding: { months: 4, monthlyCosts: 380 },
    rent: { monthlyRent: 1850, otherMonthlyIncome: 0, vacancyPct: 7 },
    expenses: {
      taxesAnnual: 2600,
      insuranceAnnual: 1100,
      maintenancePct: 7,
      capexPct: 6,
      managementPct: 8,
      hoaMonthly: 0,
      otherMonthly: 25,
    },
    refinance: { arv: 160000, ltvPct: 75, ratePct: 7.5, termYears: 30, closingCosts: 3800 },
  },
  {
    name: "Sample Ranch C (invented numbers)",
    purchase: { price: 176000, closingCosts: 4800 },
    bridge: { loanPctOfPurchase: 80, loanPctOfRehab: 50, ratePct: 12, pointsPct: 2 },
    rehab: { budget: 44000, contingencyPct: 0 },
    holding: { months: 7, monthlyCosts: 510 },
    rent: { monthlyRent: 1700, otherMonthlyIncome: 0, vacancyPct: 8 },
    expenses: {
      taxesAnnual: 4900,
      insuranceAnnual: 1700,
      maintenancePct: 8,
      capexPct: 7,
      managementPct: 9,
      hoaMonthly: 60,
      otherMonthly: 30,
    },
    refinance: { arv: 228000, ltvPct: 75, ratePct: 7.75, termYears: 30, closingCosts: 4600 },
  },
];
