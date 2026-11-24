// Single page UI. All math lives in the compiled TypeScript engine; this file
// only reads the form, calls the engine and renders the result object.
import {
  analyzeDeal,
  cashOnCashText,
  cashRecoveredText,
  DealInputError,
  money,
  pct,
  SAMPLE_DEALS,
  stressTest,
} from "/dist/src/index.js";

// [group legend, [[path, label, step], ...]]
const FIELDS = [
  ["Buy", [
    ["purchase.price", "Purchase price", 1000],
    ["purchase.closingCosts", "Purchase closing costs", 100],
  ]],
  ["Bridge loan (interest only)", [
    ["bridge.loanPctOfPurchase", "Loan, % of purchase", 1],
    ["bridge.loanPctOfRehab", "Loan, % of rehab", 1],
    ["bridge.ratePct", "Rate %", 0.125],
    ["bridge.pointsPct", "Points %", 0.25],
  ]],
  ["Rehab and holding", [
    ["rehab.budget", "Rehab budget", 500],
    ["rehab.contingencyPct", "Contingency %", 1],
    ["holding.months", "Months until refinance", 1],
    ["holding.monthlyCosts", "Holding costs per month", 10],
  ]],
  ["Rent", [
    ["rent.monthlyRent", "Monthly rent", 25],
    ["rent.otherMonthlyIncome", "Other monthly income", 5],
    ["rent.vacancyPct", "Vacancy %", 0.5],
  ]],
  ["Expenses", [
    ["expenses.taxesAnnual", "Property taxes per year", 50],
    ["expenses.insuranceAnnual", "Insurance per year", 50],
    ["expenses.maintenancePct", "Maintenance % of rent", 0.5],
    ["expenses.capexPct", "Replacements % of rent", 0.5],
    ["expenses.managementPct", "Management % of collected", 0.5],
    ["expenses.hoaMonthly", "Association dues per month", 5],
    ["expenses.otherMonthly", "Other per month", 5],
  ]],
  ["Refinance", [
    ["refinance.arv", "After repair value", 1000],
    ["refinance.ltvPct", "Loan to value %", 1],
    ["refinance.ratePct", "Rate %", 0.125],
    ["refinance.termYears", "Term in years", 1],
    ["refinance.closingCosts", "Refinance closing costs", 100],
  ]],
];

const $ = (id) => document.getElementById(id);
const form = $("deal-form");
const preset = $("preset");

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function getPath(obj, path) {
  return path.split(".").reduce((o, key) => o[key], obj);
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((o, key) => (o[key] ??= {}), obj);
  target[last] = value;
}

function buildForm() {
  for (const [legend, fields] of FIELDS) {
    const set = el("fieldset", {}, [el("legend", { text: legend })]);
    for (const [path, label, step] of fields) {
      const input = el("input", { type: "number", name: path, step: String(step), min: "0", inputmode: "decimal" });
      set.append(el("label", {}, [el("span", { text: label }), input]));
    }
    form.append(set);
  }
  SAMPLE_DEALS.forEach((deal, i) => preset.append(el("option", { value: String(i), text: deal.name })));
}

function loadDeal(deal) {
  for (const input of form.elements) {
    if (input.name) input.value = getPath(deal, input.name);
  }
}

function readDeal() {
  const deal = { name: preset.selectedOptions[0]?.textContent ?? "Custom deal" };
  for (const input of form.elements) {
    if (input.name) setPath(deal, input.name, input.value === "" ? Number.NaN : Number(input.value));
  }
  return deal;
}

function card(label, value, tone) {
  return el("div", { class: "card" }, [
    el("div", { class: "label", text: label }),
    el("div", { class: `value ${tone ?? ""}`, text: value }),
  ]);
}

function table(headers, rows) {
  const head = el("tr", {}, headers.map((h) => el("th", { text: h })));
  const body = rows.map((cells) =>
    el("tr", {}, cells.map((c) => (c instanceof Node ? el("td", {}, [c]) : el("td", typeof c === "object" ? c : { text: c })))),
  );
  return el("div", { class: "table-wrap" }, [el("table", {}, [el("thead", {}, [head]), el("tbody", {}, body)])]);
}

function tone(value, good, ok) {
  if (value === null) return "";
  return value >= good ? "good" : value >= ok ? "warn" : "bad";
}

function render() {
  const errors = $("errors");
  let result;
  let scenarios;
  const deal = readDeal();
  try {
    result = analyzeDeal(deal);
    scenarios = stressTest(deal);
  } catch (err) {
    const problems = err instanceof DealInputError ? err.problems : [String(err)];
    errors.replaceChildren(el("strong", { text: "Fix these inputs:" }), el("ul", {}, problems.map((p) => el("li", { text: p }))));
    errors.hidden = false;
    return;
  }
  errors.hidden = true;
  const { acquisition: a, refinance: r, monthly: m, returns: ret, score } = result;

  $("headline").replaceChildren(
    card("Cash flow per month", money(m.cashFlow), tone(m.cashFlow, 200, 0)),
    card("Cash on cash", ret.cashOnCashPct === null ? (ret.infiniteReturn ? "infinite" : "n/a") : pct(ret.cashOnCashPct), ret.infiniteReturn ? "good" : tone(ret.cashOnCashPct, 10, 0)),
    card("Debt service coverage", ret.dscr === null ? "no debt" : ret.dscr.toFixed(2), tone(ret.dscr, 1.2, 1)),
    card("Cash left in the deal", money(r.cashLeftInDeal)),
    card("Score", `${score.total.toFixed(1)} / ${score.maxTotal}`, tone(score.total, 75, 35)),
    card("Verdict", score.verdict, tone(score.total, 75, 35)),
  );

  $("score").replaceChildren(
    table(
      ["Component", "Value", "Floor", "Target", "Points", "", "Why"],
      score.components.map((c) => [
        c.label,
        c.value === null ? "n/a" : `${c.value} ${c.unit}`,
        String(c.floor),
        String(c.target),
        `${c.points.toFixed(1)} / ${c.maxPoints}`,
        el("div", { class: "bar" }, [el("span", { style: `width:${(c.points / c.maxPoints) * 100}%` })]),
        { class: "note", text: c.note },
      ]),
    ),
  );

  const warnings = result.warnings.length ? result.warnings : ["None."];
  $("warnings").replaceChildren(...warnings.map((w) => el("li", { text: w })));

  $("breakdown").replaceChildren(
    table(
      ["Line", "Amount"],
      [
        ["Rehab with contingency", money(a.rehabTotal)],
        ["Bridge loan", money(a.bridgeLoan)],
        ["Bridge points and interest", money(a.bridgePoints + a.bridgeInterest)],
        ["Holding costs", money(a.holdingCosts)],
        ["Total project cost", money(a.totalProjectCost)],
        ["Cash invested before refinance", money(a.cashInvested)],
        ["Refinance loan", money(r.loanAmount)],
        ["Net refinance proceeds", money(r.netProceeds)],
        ["Cash recovered", cashRecoveredText(result)],
        ["Equity after refinance", `${money(r.equity)} (${pct(r.equityPct)})`],
        ["Effective income per month", money(m.effectiveIncome)],
        ["Operating expenses per month", money(m.operatingExpenses)],
        ["Net operating income per month", money(m.noi)],
        ["Debt service per month", money(m.debtService)],
        ["Cash on cash return", cashOnCashText(result)],
        ["Cap rate on value", pct(ret.capRatePct)],
        ["Rent to cost", pct(ret.rentToCostPct, 2)],
        ["All in cost to value", pct(ret.allInToArvPct)],
      ],
    ),
  );

  $("stress").replaceChildren(
    table(
      ["Scenario", "Cash flow", "Coverage", "Cash left", "Score", "Verdict"],
      scenarios.map((s) => [
        s.label,
        money(s.result.monthly.cashFlow),
        s.result.returns.dscr === null ? "n/a" : s.result.returns.dscr.toFixed(2),
        money(s.result.refinance.cashLeftInDeal),
        s.result.score.total.toFixed(1),
        s.result.score.verdict,
      ]),
    ),
  );
}

buildForm();
loadDeal(SAMPLE_DEALS[0]);
preset.addEventListener("change", () => {
  loadDeal(SAMPLE_DEALS[Number(preset.value)]);
  render();
});
form.addEventListener("input", render);
render();
