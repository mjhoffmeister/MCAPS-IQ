# Eval Regression Tracking & Test Data Strategy — Spec

> **Status**: Draft  
> **Date**: 2026-03-16  
> **Parent**: [eval-framework-spec.md](eval-framework-spec.md), [eval-hardening-spec.md](eval-hardening-spec.md)  
> **Scope**: Two problems: (1) eval scores are computed and discarded — no trend visibility, no regression detection; (2) production CRM/M365 is the only live data source — no safe way to test with realistic data at scale.

---

## 1. Problem Statement

### 1.1 Regression Tracking

Today, `npm run eval` and `npm run eval:live` log scores to stdout and throw them away. There is no mechanism to:

- Compare scores between commits/PRs
- Detect when a skill edit degrades an unrelated skill
- Track score trends across model changes (gpt-4o-mini → gpt-4.1)
- Set pass/fail gates in CI based on score delta vs. baseline
- Audit what changed when a regression is detected

The `report.ts` aggregator produces Markdown but nothing persists it. The hardening spec (WS-3) mentions a CI workflow but stops at "run the tests" — it doesn't address what happens to the results.

### 1.2 Test Data

Production Dynamics 365 is the only CRM instance. Consequences:

- `capture-fixtures.js` hits live customer data (PII risk even with `--redact`)
- Fixtures reflect one user's pipeline — no way to test multi-role scenarios (SE vs. CSAM vs. Specialist on same account)
- No way to control data shape: can't create an "overdue milestone" or "stale opportunity" on demand
- Coverage gaps: no M365 real captures, OIL fixtures depend on local vault state
- Fixture staleness: captures age out as live data changes, but evals keep passing on stale snapshots

---

## 2. Regression Tracking

### 2.1 Score Persistence Format

After each eval run, write a JSON results file to `evals/results/`:

```
evals/results/
├── baseline.json                     # checked in — the "known good" reference
├── latest.json                       # gitignored — most recent run output
└── history/                          # gitignored — timestamped run archive  
    ├── 2026-03-16T22-30-00Z.json
    └── 2026-03-17T09-15-00Z.json
```

#### Result File Schema

```typescript
interface EvalRunResult {
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Git commit hash (short) */
  commit: string;
  /** Git branch name */
  branch: string;
  /** Phase: "offline" | "live" | "both" */
  phase: "offline" | "live" | "both";
  /** Model used for live evals (null for offline-only) */
  model: string | null;
  /** Aggregate scores */
  summary: {
    overallScore: number;
    level: "pass" | "review" | "fail";
    scenarioCount: number;
    passed: number;
    review: number;
    failed: number;
  };
  /** Per-scenario breakdown */
  scenarios: Array<{
    id: string;
    score: number;
    level: "pass" | "review" | "fail";
    dimensions: {
      skillRouting?: { pass: boolean; score: number };
      toolCorrectness?: { pass: boolean; score: number; missing: string[] };
      antiPatterns?: { pass: boolean; score: number; violations: string[] };
      outputFormat?: { pass: boolean; score: number; missing: string[] };
      contextEfficiency?: { pass: boolean; score: number };
    };
  }>;
  /** Fixture manifest snapshot — detect capture staleness */
  fixtureAge: {
    capturedAt: string;
    ageDays: number;
    stale: boolean;
  };
}
```

### 2.2 Baseline Workflow

1. **Establish baseline**: `npm run eval:baseline` — runs Phase 1 + Phase 2, writes `evals/results/baseline.json`, committed to repo.
2. **Regular runs**: `npm run eval` writes `evals/results/latest.json` (gitignored). Also appends to `evals/results/history/`.
3. **Regression check**: `npm run eval:diff` — compares `latest.json` vs. `baseline.json`, outputs delta report.
4. **Update baseline**: After intentional changes, `npm run eval:baseline --update` overwrites baseline and commits.

#### Diff Report Output

```
Eval Regression Report — 2026-03-17 vs baseline (2026-03-16)

Overall: 92.3% → 88.1% (▼ 4.2%)  ⚠️ REGRESSION

Regressions (score dropped > 2%):
  route-morning-brief:      100% → 100% (—)
  milestone-health-scoped:   95% →  82% (▼ 13%)  ← REGRESSION
  live-write-safety:         90% →  91% (▲  1%)

New failures:
  milestone-health-scoped: AP-001 violation (was clean in baseline)

Improvements:
  live-vault-first:          85% →  92% (▲  7%)
```

### 2.3 CI Integration

Extend the CI workflow from the hardening spec (WS-3 §5.5):

```yaml
# .github/workflows/eval.yml additions
- name: Run offline evals
  run: npm run eval

- name: Check for regressions
  run: npm run eval:diff -- --fail-on-regression --threshold 5
  # Fails the PR if any scenario drops > 5% vs. baseline

- name: Upload eval results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: eval-results-${{ github.sha }}
    path: evals/results/latest.json

- name: Comment PR with eval summary
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const diff = fs.readFileSync('evals/results/diff-report.md', 'utf8');
      github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: `## Eval Results\n\n${diff}`
      });
```

### 2.4 npm Scripts

```jsonc
{
  "eval:baseline": "vitest run --config vitest.config.ts && node scripts/eval-persist.js --baseline",
  "eval:diff": "node scripts/eval-persist.js --diff",
  "eval:history": "node scripts/eval-persist.js --history"
}
```

### 2.5 Implementation: `scripts/eval-persist.js`

Single script, three modes:

| Flag | Behavior |
|------|----------|
| `--baseline` | Write `baseline.json` from latest run |
| `--diff` | Compare `latest.json` vs `baseline.json`, write `diff-report.md`, exit 1 on regression |
| `--history` | Print score trend from `history/` files |
| `--fail-on-regression --threshold N` | Exit 1 if any scenario drops > N% |

The script reads from `evals/results/latest.json` (written by a Vitest reporter — see §2.6).

### 2.6 Vitest Custom Reporter

Instead of a post-run script, wire persistence directly into the test runner:

```typescript
// evals/reporters/json-persist.ts
import type { Reporter } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const RESULTS_DIR = join(import.meta.dirname, "../results");
const HISTORY_DIR = join(RESULTS_DIR, "history");

export default class EvalPersistReporter implements Reporter {
  onFinished(files, errors) {
    mkdirSync(HISTORY_DIR, { recursive: true });

    // Collect results from Vitest's test metadata
    // (eval tests attach scores via test.meta — see §2.7)
    const result: EvalRunResult = {
      timestamp: new Date().toISOString(),
      commit: execSync("git rev-parse --short HEAD").toString().trim(),
      branch: execSync("git branch --show-current").toString().trim(),
      // ... assemble from test metadata
    };

    const latest = join(RESULTS_DIR, "latest.json");
    const history = join(HISTORY_DIR, `${result.timestamp.replace(/:/g, "-")}.json`);

    writeFileSync(latest, JSON.stringify(result, null, 2));
    writeFileSync(history, JSON.stringify(result, null, 2));
  }
}
```

### 2.7 Test Metadata Attachment

Each eval test attaches its score to Vitest's test context so the reporter can collect it:

```typescript
// Example: tool-calls.eval.ts
it("calls auth, vault, then scoped milestones in order", ({ meta }) => {
  // ... existing test logic ...
  const result = judgeToolSequence(recorder.calls, expected);

  // Attach score for the reporter
  meta.evalScore = result.score;
  meta.evalDimension = "toolCorrectness";
  meta.evalScenarioId = "milestone-health-scoped";

  expect(result.pass).toBe(true);
});
```

---

## 3. Test Data Strategy

Production CRM is the only data source. Here are four options, ordered from least to most effort. They are **not mutually exclusive** — the recommended approach combines Options A + C for immediate value, then adds D when eval coverage demands grow.

### Option A: Synthetic Fixture Generator (Recommended — start here)

**Idea**: Instead of capturing live data, generate fixture JSON programmatically with controlled data shapes. Each scenario defines the data conditions it needs.

**Effort**: Low — one utility file, no infrastructure.

**What it solves**:
- Full control over data shape (overdue milestones, stale opps, multi-role scenarios)
- No PII risk — all data is fictional
- Scenarios can express "given this data, expect this behavior"
- Trivial to create edge cases (empty pipeline, 50 milestones, conflicting stages)

**What it doesn't solve**:
- Schema drift — synthetic fixtures can diverge from real CRM shapes over time
- Doesn't test tool-call → CRM API → response parsing pipeline

#### Design

```typescript
// evals/fixtures/generators/crm-factory.ts
import type { Opportunity, Milestone, Task, WhoAmI } from "./crm-types.js";

/** Builder for realistic CRM fixture data */
export class CrmFixtureFactory {
  #opportunities: Opportunity[] = [];
  #milestones: Milestone[] = [];
  #tasks: Task[] = [];

  /** Identity for crm_whoami */
  whoami(role: "Specialist" | "SE" | "CSA" | "CSAM" = "CSA"): WhoAmI {
    return {
      userId: "aaaaaaaa-0000-0000-0000-000000000001",
      fullName: "Jin Lee",
      email: "jinlee@example.com",
      title: titleForRole(role),
      businessUnit: "Customer Success Unit",
    };
  }

  /** Add an opportunity with sensible defaults */
  addOpportunity(overrides: Partial<Opportunity> = {}): this {
    this.#opportunities.push({
      opportunityid: crypto.randomUUID(),
      msp_opportunitynumber: `OPP-${2026}-${String(this.#opportunities.length + 1).padStart(3, "0")}`,
      name: `Opportunity ${this.#opportunities.length + 1}`,
      msp_activesalesstage: "3 - Solution & Proof",
      estimatedclosedate: futureDate(90),
      msp_estcompletiondate: futureDate(90),
      estimatedvalue: 50000,
      statecode: 0,
      ...overrides,
    });
    return this;
  }

  /** Add milestones linked to the last opportunity */
  addMilestone(overrides: Partial<Milestone> = {}): this {
    const opp = this.#opportunities.at(-1);
    this.#milestones.push({
      msp_engagementmilestoneid: crypto.randomUUID(),
      msp_name: `Milestone ${this.#milestones.length + 1}`,
      msp_milestonestatus: 861980001, // Committed
      msp_scheduleddate: futureDate(30),
      msp_monthlyuseamount: 5000,
      _msp_opportunity_value: opp?.opportunityid ?? null,
      ...overrides,
    });
    return this;
  }

  /** Generate a "pipeline health" scenario: 3 opps, mixed stages */
  static pipelineHealth(): CrmFixtureFactory {
    return new CrmFixtureFactory()
      .addOpportunity({ msp_activesalesstage: "3 - Solution & Proof", name: "Azure Migration FY26" })
      .addMilestone({ msp_name: "Landing Zone Setup", msp_milestonestatus: 861980001 })
      .addMilestone({ msp_name: "App Modernization POC", msp_milestonestatus: 861980002 })
      .addOpportunity({ msp_activesalesstage: "2 - Qualify", name: "Security Modernization" })
      .addOpportunity({
        msp_activesalesstage: "3 - Solution & Proof",
        estimatedclosedate: pastDate(15), // overdue
        name: "Data Platform Refresh",
      });
  }

  /** Generate a "stale pipeline" scenario for pipeline-hygiene-triage testing */
  static stalePipeline(): CrmFixtureFactory {
    return new CrmFixtureFactory()
      .addOpportunity({
        estimatedclosedate: pastDate(45),
        msp_activesalesstage: "2 - Qualify",
        name: "Stale Opportunity",
      })
      .addOpportunity({
        estimatedclosedate: pastDate(90),
        name: "Very Stale — No Activity",
      });
  }

  /** Generate an "overdue milestones" scenario for milestone-health-review */
  static overdueMilestones(): CrmFixtureFactory {
    return new CrmFixtureFactory()
      .addOpportunity({ name: "Contoso Azure Migration" })
      .addMilestone({
        msp_name: "Azure Sentinel Onboarding",
        msp_scheduleddate: pastDate(6),
        msp_milestonestatus: 861980001,
      })
      .addMilestone({
        msp_name: "Landing Zone",
        msp_scheduleddate: futureDate(30),
        msp_milestonestatus: 861980001,
      });
  }

  /** Serialize all fixtures to the shapes MockCrmServer expects */
  build(): CrmFixtureSet {
    return {
      "whoami.json": this.whoami(),
      "opportunities-mine.json": { value: this.#opportunities },
      "milestones-active.json": { value: this.#milestones },
      "tasks-active.json": { value: this.#tasks },
    };
  }
}
```

#### Per-Scenario Fixture Binding

Scenarios declare the data shape they need, not the data itself:

```yaml
# evals/fixtures/scenarios/tool-correctness.yaml
scenarios:
  - id: milestone-health-overdue
    skill: milestone-health-review
    fixture: overdueMilestones        # ← references CrmFixtureFactory.overdueMilestones()
    context:
      role: CSAM
      customer: Contoso
    expected_calls:
      - tool: msx-crm:get_milestones
        paramsContains: { customerKeyword: "Contoso", statusFilter: "active" }
```

#### Schema Validation

Guard against drift between synthetic fixtures and real CRM shapes:

```typescript
// evals/fixtures/generators/schema-guard.ts
import Ajv from "ajv";

// JSON Schema for CRM opportunity (derived from crm-entity-schema.instructions.md)
const opportunitySchema = {
  type: "object",
  required: ["opportunityid", "name", "msp_activesalesstage", "statecode"],
  properties: {
    opportunityid: { type: "string", format: "uuid" },
    msp_opportunitynumber: { type: "string" },
    name: { type: "string" },
    msp_activesalesstage: { type: "string" },
    estimatedclosedate: { type: "string" },
    // ...
  },
};

/** Validate that a generated fixture matches the expected CRM shape */
export function validateFixtureShape(fixture: unknown, schema: object): boolean {
  const ajv = new Ajv();
  return ajv.validate(schema, fixture) as boolean;
}
```

#### Schema Refresh

Periodically (or on demand), compare synthetic shapes against a live capture:

```bash
# Capture a single "shape sample" from production CRM  
npm run fixtures:capture -- --server crm --dry-run --shape-only

# Output: evals/fixtures/schemas/crm-live-shapes.json
# Contains field names + types from real responses, no values
```

This gives a cheap way to detect when CRM adds new fields or changes types without storing actual customer data.

---

### Option B: Capture-and-Scrub (Current Model, Improved)

**Idea**: Keep `capture-fixtures.js` but improve the scrubbing pipeline from the hardening spec (WS-2 §4.3) so captured data is safe to commit.

**Effort**: Low-Medium — extend existing `--redact` flag.

**What it solves**:
- Fixtures match real CRM response shapes exactly
- Tests the full tool-call → response parsing pipeline
- Captures real edge cases you wouldn't think to synthesize

**What it doesn't solve**:
- Still requires VPN + `az login` to capture
- One user's data — can't easily create multi-role fixtures
- Can't create arbitrary data conditions (no "make a milestone overdue" button)
- PII risk is reduced but not eliminated (company names, project details can be identifying)

#### Improvements over Current

1. **Deep scrubbing** (from hardening spec WS-2 §4.3): customer name mapping, date shifting, amount rounding
2. **Shape-only mode**: `--shape-only` flag captures field names and types without values — safe for schema validation
3. **Multi-customer capture**: `--customer A --customer B` captures fixtures for multiple accounts in one run
4. **Freshness guard**: CI warns when `capture-manifest.json` is older than 14 days

#### When to Use

Capture-and-scrub is the right choice for **integration smoke tests** — verifying that the tool-call interface between the agent and the real CRM API hasn't broken. Run it locally before major releases. It complements synthetic fixtures (Option A), which are better for behavioral testing.

---

### Option C: Scenario Composition from Golden Traces (Recommended — pair with A)

**Idea**: Record tool-call traces from real agent sessions (via the agent's existing recorder infrastructure), then replay them as "golden traces" for regression testing. This bridges the gap between synthetic fixtures (controlled but disconnected from real behavior) and live captures (realistic but uncontrolled).

**Effort**: Low-Medium — add a trace export command, replay harness.

**What it solves**:
- Tests actual agent behavior (not hand-choreographed mock sequences)
- Creates ground truth from human-verified good sessions
- Regression detection: "this scenario used to produce these tool calls; does it still?"
- No production data dependency at eval time — traces are captured once, committed, replayed forever

**What it doesn't solve**:
- Traces age out as tool schemas change
- Captures one model's behavior — a different model may produce equally valid but different traces
- Doesn't catch novel failure modes (only regressions from known-good states)

#### Design

```
evals/traces/
├── README.md                          # Format docs
├── golden/                            # Committed, human-verified traces
│   ├── morning-brief-csa.trace.json
│   ├── milestone-health-csam.trace.json
│   └── write-safety-csa.trace.json
└── captured/                          # gitignored — raw session captures
    └── session-2026-03-16.trace.json
```

#### Trace Format

```typescript
interface AgentTrace {
  /** Unique trace ID */
  id: string;
  /** ISO-8601 capture timestamp */
  capturedAt: string;
  /** Model that produced this trace */
  model: string;
  /** User utterance that triggered the session */
  userUtterance: string;
  /** Scenario context */
  context: {
    role?: string;
    customer?: string;
    mediums?: string[];
  };
  /** Ordered list of tool calls the agent made */
  toolCalls: Array<{
    tool: string;
    params: Record<string, unknown>;
    response: unknown;
    durationMs: number;
  }>;
  /** Agent's final text output */
  agentOutput: string;
  /** Human verification */
  verified: {
    by: string;
    date: string;
    quality: "good" | "acceptable" | "poor";
    notes?: string;
  };
}
```

#### Capture Workflow

```bash
# 1. Run a live eval session and capture the trace
npm run eval:live -- --capture-trace

# 2. Review captured trace
npm run eval:trace -- --review captured/session-2026-03-16.trace.json

# 3. Promote to golden (human-verified)
npm run eval:trace -- --promote captured/session-2026-03-16.trace.json \
  --quality good --notes "Clean morning brief, correct tool ordering"

# 4. Run regression check against golden traces
npm run eval:trace -- --regression
```

#### Regression Check Logic

For each golden trace, re-run the scenario against mock servers (seeded with the trace's fixture responses), then compare:

| Check | Pass Criteria |
|-------|---------------|
| **Tool set match** | Same tools called (allow superset, flag missing) |
| **Tool order match** | Same ordering for order-constrained calls |
| **Anti-pattern clean** | No new anti-pattern violations vs. golden |
| **Output structure** | Same required sections/columns present |
| **Score delta** | Overall score within ±5% of golden baseline |

This is not an exact-match comparison — it allows the agent to improve while catching regressions.

---

### Option D: Sandbox CRM Instance

**Idea**: Provision a Dynamics 365 sandbox environment with controlled seed data. Run live evals against real CRM APIs with known data.

**Effort**: High — requires D365 sandbox provisioning, seed data scripts, org buy-in.

**What it solves**:
- Full end-to-end testing against real CRM APIs
- Controlled data: create specific opportunities, milestones, tasks, roles
- Multi-role testing: create sandbox users with different roles
- Write operation testing: actually execute staged writes and verify results
- No PII risk — all data is fictional

**What it doesn't solve**:
- Provisioning friction (D365 sandbox isn't instant)
- Seed data maintenance — scripts must track schema changes
- Auth complexity — sandbox identity management
- Cost — a D365 sandbox may have licensing implications

#### If Pursued

```
scripts/
├── sandbox/
│   ├── seed-data.ts          # Create fictional accounts, opps, milestones
│   ├── seed-users.ts         # Create test users per role  
│   ├── reset-sandbox.ts      # Wipe and re-seed between test runs
│   └── sandbox-config.ts     # Sandbox org URL, credentials
```

#### Seed Data Requirements

| Entity | Count | Purpose |
|--------|-------|---------|
| Accounts | 3 (Contoso, Fabrikam, Northwind) | Multi-customer scenarios |
| Opportunities | 8 (mixed stages, some stale) | Pipeline hygiene, stage identification |
| Milestones | 15 (active, overdue, committed, completed) | Milestone health, governance |
| Tasks | 20 (stale, orphaned, complete, blocked) | Task hygiene, SE workflows |
| Users | 4 (one per role) | Role-based scenario testing |

#### When to Invest in This

Only when:
1. Options A + C can't cover a critical test gap (e.g., write-then-read roundtrip verification)
2. The team has D365 sandbox access through existing org agreements
3. Eval runs need to validate actual CRM query performance or API behavior changes

---

## 4. Recommendation

### Immediate (this sprint)

| Action | Option | Effort |
|--------|--------|--------|
| Add `eval-persist.js` + Vitest reporter for score persistence | §2 | 1 day |
| Add `eval:baseline` / `eval:diff` npm scripts | §2 | 0.5 day |
| Create `CrmFixtureFactory` + 4 scenario presets | A | 1 day |
| Wire YAML scenarios to use factory-generated fixtures | A | 0.5 day |
| Add `.gitignore` entries for `evals/results/latest.json`, `history/` | §2 | trivial |
| Commit initial `baseline.json` | §2 | trivial |

### Next sprint

| Action | Option | Effort |
|--------|--------|--------|
| Add trace capture to live eval harness | C | 1 day |
| Record 5 golden traces (one per live scenario) | C | 0.5 day |
| Add `eval:trace --regression` command | C | 1 day |
| PR comment workflow (CI integration §2.3) | §2 | 0.5 day |
| Schema-only capture mode for drift detection | A | 0.5 day |

### Later (if needed)

| Action | Option | Effort |
|--------|--------|--------|
| D365 sandbox provisioning + seed scripts | D | multi-week |
| M365 mock expansion (real mail/calendar captures) | B | 1 day |
| Multi-model regression matrix (run golden traces on 3+ models) | C | 1 day |

---

## 5. File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `scripts/eval-persist.js` | Score persistence, diff, history |
| `evals/reporters/json-persist.ts` | Vitest custom reporter |
| `evals/fixtures/generators/crm-factory.ts` | Synthetic CRM fixture builder |
| `evals/fixtures/generators/oil-factory.ts` | Synthetic vault fixture builder |
| `evals/fixtures/generators/m365-factory.ts` | Synthetic M365 fixture builder |
| `evals/fixtures/generators/schema-guard.ts` | Shape validation against live schemas |
| `evals/results/baseline.json` | Committed baseline scores |
| `evals/traces/README.md` | Trace format documentation |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Add `eval:baseline`, `eval:diff`, `eval:history`, `eval:trace` scripts |
| `vitest.config.ts` | Add `json-persist` reporter |
| `.gitignore` | Add `evals/results/latest.json`, `evals/results/history/`, `evals/traces/captured/` |
| `evals/harness.ts` | Accept factory-generated fixtures; export `attachEvalMeta()` helper |
| `evals/tool-correctness/tool-calls.eval.ts` | Bind scenarios to factory presets instead of manual `crm.handle()` choreography |
| `evals/live/live-harness.ts` | Add `--capture-trace` flag; export trace in `AgentTrace` format |

### Unchanged

Existing judges, anti-pattern rules, and live scenarios require no changes — they consume fixture data and tool-call traces, both of which are enhanced but not restructured.

---

## 6. Open Questions

1. **Baseline granularity**: One baseline per model, or one shared baseline? If live evals use different models, scores aren't comparable. Recommendation: baseline includes model metadata; `eval:diff` matches on model name, warns on mismatch.

2. **Golden trace expiry**: When do golden traces become stale? Recommendation: traces carry a schema version stamp; mark stale when tool schemas change (detected by `sync-mock-tools.js` from hardening spec WS-2 §4.1).

3. **History retention**: How many historical runs to keep? Recommendation: keep last 30 (or 30 days), prune oldest on each run.

4. **PR scoring**: Should eval scores block merge? Recommendation: start with "comment only" mode; graduate to blocking after 2 weeks of stable baselines.
