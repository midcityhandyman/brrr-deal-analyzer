# brrr-deal-analyzer

A buy, rehab, rent, refinance deal has four phases and each one hides costs that a quick spreadsheet tends to skip.
This tool runs the whole deal from purchase to refinance and shows cash flow, returns, cash left in the deal and a score you can read line by line.

**Not financial advice.** This is a calculator with fixed, simplified assumptions. It does not know your market, your lender or your tax position, and nothing it prints is a recommendation to buy, sell or finance anything. Check every number with qualified professionals before acting.

## What it does

You give it purchase, bridge loan, rehab, holding, rent, expense and refinance inputs. It returns:

- **Project cost and cash invested**: purchase, closing, rehab with contingency, bridge points and interest, holding costs.
- **Refinance outcome**: new loan, net proceeds after paying off the bridge loan, cash left in the deal, percent of cash recovered, equity.
- **Monthly operations**: effective income after vacancy, each expense line, net operating income, debt service, cash flow.
- **Returns**: cash on cash return, debt service coverage ratio, cap rate, rent to cost, all in cost to value.
- **A transparent score** from 0 to 100. Five components, each linear between a floor (zero points) and a target (full points). Every component reports its measured value, floor, target, points and a note.
- **Warnings** for negative cash flow, weak coverage, a refinance that cannot pay off the bridge loan, cost above value, zero contingency and zero vacancy.
- **A stress test** that reruns the deal with lower rent, a higher rate, a lower appraisal and a rehab overrun.

### Score components (defaults)

| Component | Floor | Target | Max points |
| --- | --- | --- | --- |
| Monthly cash flow | 0 | 300 | 25 |
| Cash on cash return | 0% | 12% | 25 |
| Debt service coverage | 1.0 | 1.4 | 25 |
| Cash recovered at refinance | 50% | 100% | 15 |
| Equity after refinance | 15% | 30% | 10 |

Verdicts: 75 and up is `strong`, 55 and up is `workable`, 35 and up is `marginal`, below that is `pass`. All of these live in one config object (`DEFAULT_SCORE_CONFIG` in `src/score.ts`) and `analyzeDeal` accepts a replacement.

## Architecture

```mermaid
flowchart LR
  UI["web/ single page UI"] --> E
  Demo["demo/run-demo.ts"] --> E
  Tests["test/*.test.ts"] --> E
  subgraph Engine["src/ TypeScript engine (pure functions, no I/O)"]
    E["analyzeDeal"] --> V["validate.ts: input rules"]
    E --> A["acquisition: cost and cash invested"]
    E --> O["operations: income, expenses, NOI"]
    A --> R["refinance: proceeds and cash left"]
    O --> M["returns: cash flow, cash on cash, coverage"]
    R --> M
    M --> S["score.ts: weighted linear score"]
    M --> W["warnings"]
  end
  S --> Out["DealResult object"]
  W --> Out
  Out --> Rep["report.ts: plain text"]
```

The engine has no dependencies and does no I/O. The UI, the demo and the tests all call the same `analyzeDeal` function and render the same result object.

## Run it

```bash
npm install
npm start
```

Then open http://localhost:4173. Set `PORT` in the environment to use another port. No keys, accounts or network access are needed.

## Tests

```bash
npm test
```

This compiles the TypeScript and runs 24 unit tests with the Node built in test runner. The core test deal uses round numbers so every figure can be checked by hand. CI (`.github/workflows/ci.yml`) runs the tests and the demo on Node 20 and 22.

## Demo

```bash
npm run demo
```

The demo analyzes three invented deals (one strong, one workable, one to pass on), prints a full report and stress test for each, then ranks them. It runs offline. Captured output is in [`demo/output.txt`](demo/output.txt). A short excerpt:

```text
Score: 89.4 of 100 (strong)
  Monthly cash flow             25.0 / 25  value 368.22 per month, floor 0, target 300 (at or above target)
  Cash on cash return           25.0 / 25  value 91.11 percent, floor 0, target 12 (at or above target)
  Debt service coverage         23.1 / 25  value 1.37 ratio, floor 1, target 1.4 (between floor and target)
  Cash recovered at refinance    9.6 / 15  value 82.04 percent, floor 50, target 100 (between floor and target)
  Equity after refinance         6.7 / 10  value 25 percent of value, floor 15, target 30 (between floor and target)
```

## Use the engine from code

```ts
import { analyzeDeal, SAMPLE_DEALS } from "./src/index.js";

const result = analyzeDeal(SAMPLE_DEALS[0]);
console.log(result.monthly.cashFlow, result.returns.dscr, result.score.total);
```

## Where this pattern runs

The pattern here (a pure calculation engine, a result object that explains itself, and thin front ends on top) is drawn from systems that run two small service companies day to day. This repository is a clean, standalone version with invented data only.

## Limitations

- **Simplified loan model.** The bridge loan is interest only and treated as fully drawn on day one, so interest is slightly overstated when rehab funds are drawn in stages. The refinance is a single fixed rate, fully amortizing loan.
- **One stabilized year.** No rent growth, expense inflation, appreciation, loan paydown, or multi year projection. No internal rate of return.
- **No taxes.** Income tax, depreciation and transfer taxes are not modeled.
- **No seasoning or lender rules.** The refinance uses the loan to value you enter. Real lenders may cap the loan at cost, require a waiting period, or set a minimum coverage ratio. The 1.2 coverage warning is a common rule of thumb, not any lender's actual policy.
- **The score is a convention, not a truth.** Floors, targets and weights are opinions that suit small rentals in lower priced markets. A deal in a high priced market can be sound and still score poorly. Change the config to fit your own criteria.
- **A lower appraisal can raise the score.** A smaller refinance loan means a lower payment and better coverage, while more cash stays in the deal. The stress test shows both effects; read the cash left column, not only the score.
- **Cash on cash is undefined when no cash is left in the deal.** The engine reports that case as an infinite return (or not applicable when cash flow is not positive) instead of a number.
- **Inputs are trusted.** The engine checks ranges, but it cannot tell you whether your rent, rehab or value estimates are realistic. Those estimates drive everything.
- **Single currency, no locale handling.** Amounts print with a dollar sign.
- The UI was checked by hand in one desktop browser. It has no automated browser tests.

License: MIT, see the LICENSE file.
