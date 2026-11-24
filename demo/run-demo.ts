// Offline demo: analyzes three invented deals and prints a report for each,
// followed by a stress test and a ranked summary. No network, no keys.
import { analyzeDeal, formatReport, formatStressTable, money, SAMPLE_DEALS, stressTest } from "../src/index.js";

const lines: string[] = [];
lines.push("BRRR deal analyzer demo");
lines.push("All deals below use invented numbers. This is not financial advice.");
lines.push("");

const results = SAMPLE_DEALS.map((deal) => {
  const result = analyzeDeal(deal);
  lines.push(formatReport(result));
  lines.push(formatStressTable(stressTest(deal)));
  lines.push("");
  return result;
});

lines.push("Ranked summary");
const ranked = [...results].sort((a, b) => b.score.total - a.score.total);
ranked.forEach((r, i) => {
  lines.push(
    `  ${i + 1}. ${r.name.padEnd(38)} score ${r.score.total.toFixed(1).padStart(5)}  ${r.score.verdict.padEnd(9)} cash flow ${money(r.monthly.cashFlow)} per month`,
  );
});

console.log(lines.join("\n"));
