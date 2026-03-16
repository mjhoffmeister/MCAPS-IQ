# Prompt & Skill Evaluation Framework — Design Spec

> **Status**: Draft  
> **Date**: 2026-03-16  
> **Scope**: Evaluates the 14 instruction files, ~39 skills, and tool-calling patterns that guide the MCAPS-IQ agent.

---

## 1. Problem

We have **14 instructions**, **~39 skills**, and **57 MCP tools** (targeting ~41 post-consolidation). These are living documents that affect agent behavior in production. Today there is no systematic way to know:

1. **Does the agent select the right skill** for a given user utterance?
2. **Does it call the right tools** in the right order with the right params?
3. **Does it avoid anti-patterns** documented in `crm-query-strategy.instructions.md` and elsewhere?
4. **Does a skill edit break behavior** in an unrelated skill (regression)?
5. **How much context budget** does a skill chain consume?

The OIL bench suite (`mcp/oil/bench/`) already measures low-level metrics (token efficiency, call count, latency, retrieval quality, write safety). This spec extends that model to the **prompt/skill layer** — evaluating agent *behavior*, not just server *performance*.

---

## 2. What We're Evaluating

| Layer | Artifact | Count | Example |
|---|---|---|---|
| **Instruction** | `.github/instructions/*.instructions.md` | 14 | `crm-query-strategy`, `msx-role-and-write-gate` |
| **Skill** | `.github/skills/*/SKILL.md` | ~39 | `morning-brief`, `pipeline-hygiene-triage` |
| **Tool surface** | `mcp/msx` + `mcp/oil` tools | 57 → 41 | `get_milestones`, `get_customer_context` |
| **Copilot config** | `.github/copilot-instructions.md` | 1 | Top-level agent directive |

---

## 3. Eval Dimensions

### 3.1 Skill Routing Accuracy

> Given a user utterance, does the agent activate the correct skill(s)?

Each skill has trigger phrases in its YAML frontmatter `description` field. We test:

- **True positive**: trigger phrase → correct skill activates
- **True negative**: off-topic prompt → skill does NOT activate
- **Disambiguation**: overlapping triggers resolve to the right skill (e.g., "pipeline review" → `pipeline-hygiene-triage` not `milestone-health-review`)
- **Chain activation**: compound requests trigger the right skill chain (e.g., "prep me for governance" → `mcem-stage-identification` + `milestone-health-review` + `customer-evidence-pack`)

### 3.2 Tool Call Correctness

> Given a skill activation, does the agent call the expected tools with correct parameters?

Each skill documents a `## Flow` section with explicit tool calls. We test:

- **Required tools called**: every tool in the flow is invoked
- **Correct parameters**: GUIDs, filters, formats match the documented pattern
- **Correct sequencing**: dependencies respected (e.g., vault-first before CRM query)
- **No anti-pattern violations**: patterns from `crm-query-strategy.instructions.md` (e.g., never unscoped `get_milestones()`)

### 3.3 Anti-Pattern Detection

> Does the agent avoid known bad patterns?

From `crm-query-strategy.instructions.md` and skill docs:

| Anti-Pattern ID | Description | Source |
|---|---|---|
| `AP-001` | `get_milestones()` with no scoping parameter | crm-query-strategy |
| `AP-002` | `crm_query` with wrong entity set (`msp_milestones`) | crm-query-strategy |
| `AP-003` | Loop: `list_opportunities` per customer → `get_milestones` per opp | crm-query-strategy |
| `AP-004` | Skipping vault when OIL is available | crm-query-strategy |
| `AP-005` | CRM write without human-in-the-loop confirmation | msx-role-and-write-gate |
| `AP-006` | Guessing CRM property names not in entity schema | crm-entity-schema |
| `AP-007` | `crm_query` to entity set not in `ALLOWED_ENTITY_SETS` | tools.ts allowlist |
| `AP-008` | Treating vault cached state as live CRM truth | obsidian-vault |
| `AP-009` | Unbounded M365/WorkIQ retrieval | shared-patterns |
| `AP-010` | Role assumption without `crm_whoami` or explicit confirmation | msx-role-and-write-gate |

### 3.4 Output Format Compliance

> Does the agent produce output matching the skill's `## Output Schema`?

- **Required sections present**: e.g., morning brief must have 🔴/🟡/🟢/meetings/pipeline/gaps
- **Table format**: milestones/opportunities rendered as tables, not prose
- **Required columns**: per `copilot-instructions.md` (Opp # with deep-link, Stage, Deal Team, etc.)
- **Connect hook hint**: present when skill documents one

### 3.5 Context Budget Efficiency

> How much of the context window does a skill chain consume?

Extending the OIL bench token-efficiency pattern:

- **Schema overhead**: tool count × avg schema tokens per turn
- **Instruction overhead**: instruction file tokens loaded per skill activation
- **Response payload**: total tokens returned by tool calls
- **Budget ratio**: (schema + instruction + response) / context window size

---

## 4. Architecture

```
evals/
├── fixtures/                    # Synthetic test data
│   ├── crm-responses/          # Mocked CRM API responses
│   │   ├── whoami.json
│   │   ├── opportunities-contoso.json
│   │   ├── milestones-active.json
│   │   └── ...
│   ├── vault/                  # → symlink or copy of oil/bench/fixtures/vault
│   ├── m365-responses/         # Mocked WorkIQ/Calendar/Teams/Mail responses
│   │   ├── calendar-today.json
│   │   ├── workiq-meetings.json
│   │   └── ...
│   └── scenarios/              # User utterance → expected behavior
│       ├── skill-routing.yaml
│       ├── tool-correctness.yaml
│       ├── anti-patterns.yaml
│       └── output-format.yaml
├── harness.ts                  # Shared eval runner, mock MCP client
├── judges/                     # Evaluation judges (rule-based + LLM)
│   ├── tool-sequence.ts        # Checks tool call order and params
│   ├── anti-pattern.ts         # Detects known anti-patterns
│   ├── output-format.ts        # Validates output structure
│   └── llm-judge.ts            # LLM-as-judge for subjective quality
├── routing/                    # Skill routing evals
│   └── routing.eval.ts
├── tool-correctness/           # Tool calling evals
│   └── tool-calls.eval.ts
├── anti-patterns/              # Anti-pattern evals
│   └── anti-patterns.eval.ts
├── output-format/              # Output format evals
│   └── output-format.eval.ts
├── context-budget/             # Token efficiency evals
│   └── context-budget.eval.ts
└── report.ts                   # Aggregation + CI reporter
```

### 4.1 Eval Harness

The harness intercepts MCP tool calls and records them without hitting real CRM/vault/M365. Two execution modes:

#### Mode A: Trace-Based (offline, fast)

Capture tool call traces from real sessions, then replay and validate:

```typescript
interface ToolCallTrace {
  tool: string;           // "msx-crm:get_milestones"
  params: Record<string, unknown>;
  response: unknown;      // mocked or captured response
  timestamp: number;
}

interface EvalScenario {
  id: string;
  name: string;
  userUtterance: string;
  expectedSkill: string;
  expectedToolCalls: ToolCallTrace[];
  antiPatterns: string[]; // AP-001, AP-002, etc.
  outputValidation: OutputCheck;
}
```

#### Mode B: Live Agent Loop (online, comprehensive)

Run the actual agent against mock MCP servers, capture the full conversation:

```typescript
interface LiveEvalConfig {
  model: string;          // "claude-sonnet-4-20250514" | "gpt-4o" | etc.
  systemPrompt: string;   // assembled from instructions + skill
  mcpMocks: MockServer[]; // mock MCP servers returning fixture data
  scenarios: EvalScenario[];
  iterations: number;     // repeat for consistency measurement
}
```

### 4.2 Mock MCP Servers

Lightweight mock implementations that return fixture data:

```typescript
// Mock CRM server — returns fixture responses keyed by tool+params
class MockCrmServer {
  private fixtures: Map<string, unknown>;
  
  handle(tool: string, params: Record<string, unknown>): unknown {
    const key = this.fixtureKey(tool, params);
    return this.fixtures.get(key) ?? { error: "no fixture" };
  }
}

// Mock OIL server — backed by the bench fixture vault
class MockOilServer {
  // Uses real OIL graph/search against bench/fixtures/vault
  // Write operations are no-ops that record the call
}
```

### 4.3 Judges

#### Rule-Based Judges (deterministic, fast)

```typescript
// Tool sequence judge — checks required calls are present and ordered
function judgeToolSequence(
  actual: ToolCallTrace[],
  expected: ToolCallTrace[],
): { pass: boolean; missing: string[]; extra: string[]; orderViolations: string[] }

// Anti-pattern judge — checks against AP-* patterns
function judgeAntiPatterns(
  calls: ToolCallTrace[],
  patterns: AntiPatternRule[],
): { violations: Array<{ id: string; tool: string; reason: string }> }

// Output format judge — validates structural compliance
function judgeOutputFormat(
  output: string,
  schema: OutputSchema,
): { pass: boolean; missing: string[]; malformed: string[] }
```

#### LLM-as-Judge (subjective quality, slower)

For dimensions that can't be rule-checked:
- **Synthesis quality**: Did the agent connect cross-medium signals meaningfully?
- **Risk surfacing**: Did it proactively flag risks with evidence?
- **Role appropriateness**: Did it respect the user's role boundaries?
- **Conciseness**: Is the output action-oriented vs. verbose?

```typescript
interface LlmJudgeResult {
  dimension: string;
  score: 1 | 2 | 3 | 4 | 5;
  reasoning: string;
  passThreshold: number;  // e.g., 3
}
```

---

## 5. Scenario Design

### 5.1 Skill Routing Scenarios

```yaml
# evals/fixtures/scenarios/skill-routing.yaml
scenarios:
  - id: route-morning-brief
    utterance: "start my day"
    expected_skill: morning-brief
    negative_skills: [pipeline-hygiene-triage, milestone-health-review]

  - id: route-morning-brief-alt
    utterance: "catch me up on everything"
    expected_skill: morning-brief

  - id: route-pipeline-not-milestone
    utterance: "show me stale pipeline entries"
    expected_skill: pipeline-hygiene-triage
    negative_skills: [milestone-health-review]

  - id: route-milestone-not-pipeline
    utterance: "how are my committed milestones doing?"
    expected_skill: milestone-health-review
    negative_skills: [pipeline-hygiene-triage]

  - id: route-disambiguation-review
    utterance: "weekly review"
    expected_skill: pipeline-hygiene-triage  # Specialist default
    context:
      role: Specialist

  - id: route-disambiguation-review-csam
    utterance: "weekly review"
    expected_skill: milestone-health-review  # CSAM default
    context:
      role: CSAM

  - id: route-chain-governance
    utterance: "prep me for the Contoso governance meeting"
    expected_skills:
      - mcem-stage-identification
      - milestone-health-review
      - customer-evidence-pack

  - id: route-negative-off-topic
    utterance: "What's the weather like today?"
    expected_skill: null  # No skill should activate
```

### 5.2 Tool Call Correctness Scenarios

```yaml
# evals/fixtures/scenarios/tool-correctness.yaml
scenarios:
  - id: milestone-health-scoped
    skill: milestone-health-review
    context:
      mediums: [crm, vault]
      role: CSAM
      customer: Contoso
    expected_calls:
      - tool: msx-crm:crm_auth_status
        order: 1
      - tool: oil:get_customer_context
        params: { customer: "Contoso" }
        order: 2
      - tool: msx-crm:get_milestones
        params_contains:
          customerKeyword: "Contoso"
          statusFilter: "active"
          includeTasks: true
        order: 3
    forbidden_calls:
      - tool: msx-crm:get_milestones
        params: {}  # unscoped

  - id: morning-brief-parallel
    skill: morning-brief
    context:
      mediums: [crm, vault, workiq]
      role: CSA
    expected_calls:
      - tool: oil:get_vault_context
        phase: 1
      - tool: msx-crm:crm_auth_status
        phase: 1  # parallel with vault
      - tool: msx-crm:get_my_active_opportunities
        phase: 2
      - tool: msx-crm:get_milestones
        phase: 2
        params_contains:
          statusFilter: "active"
          includeTasks: true

  - id: vault-first-crm-query
    skill: vault-context-assembly
    context:
      mediums: [crm, vault]
    expected_sequence:
      - oil:get_vault_context  # must come before any CRM call
      - oil:get_customer_context
      - msx-crm:*             # any CRM call must follow vault
```

### 5.3 Anti-Pattern Scenarios

```yaml
# evals/fixtures/scenarios/anti-patterns.yaml
scenarios:
  - id: ap001-unscoped-milestones
    description: "Agent must not call get_milestones without scoping"
    utterance: "show me all my milestones"
    forbidden_patterns:
      - AP-001  # get_milestones with no scope param

  - id: ap003-no-loop
    description: "Agent must batch, not loop"
    utterance: "Contoso milestone status for all opportunities"
    forbidden_patterns:
      - AP-003  # sequential per-opp calls
    expected_pattern: "single get_milestones with customerKeyword"

  - id: ap004-vault-skip
    description: "Agent must use vault when available"
    utterance: "what's happening with Fabrikam?"
    context:
      mediums: [crm, vault]
    forbidden_patterns:
      - AP-004  # vault available but skipped
    expected_calls:
      - tool: oil:get_customer_context
        before: msx-crm:*

  - id: ap005-write-gate
    description: "Agent must confirm before CRM writes"
    utterance: "update the milestone status to at-risk"
    forbidden_patterns:
      - AP-005  # write without confirmation
    expected_behavior: "dry-run preview shown before execution"

  - id: ap010-role-first
    description: "Agent must establish role before write guidance"
    utterance: "create a new milestone for the Azure migration"
    forbidden_patterns:
      - AP-010  # role assumed without confirmation
```

---

## 6. Scoring Model

### Per-Scenario Scores

| Dimension | Weight | Scoring |
|---|---|---|
| Skill routing | 25% | Binary: correct activation / not |
| Tool call correctness | 30% | % of expected calls present with correct params |
| Anti-pattern avoidance | 20% | 1 - (violations / checked patterns) |
| Output format compliance | 15% | % of required sections/columns present |
| Context efficiency | 10% | Budget ratio below threshold |

### Aggregate Scores

```
Skill Score = Σ(dimension_weight × dimension_score) across all scenarios for that skill
Instruction Score = Avg(skill_scores) for skills governed by that instruction
Overall Score = Avg(all skill scores)
```

### Pass/Fail Thresholds

| Level | Threshold | Consequence |
|---|---|---|
| 🟢 Pass | ≥85% | Ship |
| 🟡 Review | 70–84% | Manual review, likely fine |
| 🔴 Fail | <70% | Block merge, investigate |

---

## 7. Implementation Phases

### Phase 1: Scenario Fixtures + Rule-Based Judges (offline, no LLM)

**Goal**: Validate tool-call patterns from captured traces.

1. Define scenario YAML files for the top-10 most-used skills:
   - `morning-brief`
   - `milestone-health-review`
   - `pipeline-hygiene-triage`
   - `vault-context-assembly`
   - `mcem-stage-identification`
   - `risk-surfacing`
   - `task-hygiene-flow`
   - `role-orchestration`
   - `customer-evidence-pack`
   - `exit-criteria-validation`
2. Build `tool-sequence` and `anti-pattern` judges (pure TypeScript, no LLM dependency)
3. Build CRM + OIL mock servers backed by fixture data
4. Run as Vitest suite: `npm run eval` from repo root

**Deliverables**: `evals/` directory, fixture files, 3 judges, Vitest config, `eval` npm script.

### Phase 2: Live Agent Loop (requires LLM API)

**Goal**: Run the full agent against mock servers, validate end-to-end.

1. Build live eval harness that:
   - Assembles system prompt from instructions + skill files
   - Connects to mock MCP servers
   - Sends user utterance to LLM
   - Captures tool calls + final output
2. Add LLM-as-judge for subjective dimensions
3. Run as CI gate with configurable model

**Deliverables**: Live harness, LLM judge, CI integration, multi-model comparison.

### Phase 3: Regression + Diff Evals

**Goal**: Catch regressions when skills/instructions change.

1. Golden traces: snapshot "known-good" tool call sequences per scenario
2. On PR: re-run evals, diff against golden traces
3. Alert on:
   - New anti-pattern violations
   - Tool call sequence changes
   - Output format regressions
   - Score drops >5% on any dimension

**Deliverables**: Golden trace snapshots, diff reporter, PR check integration.

---

## 8. Relation to Tool Consolidation

Tool consolidation (57 → 41) directly impacts evals:

| Consolidation | Eval Impact |
|---|---|
| Staging queue 5→2 | Fewer tool names in traces; update scenario fixtures |
| Opportunity queries 2→1 | Update `scope` param expectations in scenarios |
| Metadata picklists 2→1 | Update tool name in scenario fixtures |
| Team management 2→1 | Update `recordType` param expectations |
| `close_task` → `update_task` | Remove `close_task` from expected calls |
| OIL write consolidation | Update vault-write scenarios |

**Recommendation**: Build eval fixtures using the **post-consolidation** tool names. Add backward-compat aliases in scenario fixtures for transition period.

---

## 9. Extending the OIL Bench Pattern

The existing `mcp/oil/bench/` harness measures server-level metrics. The new eval framework measures agent-level behavior. They complement each other:

| Dimension | OIL Bench (existing) | Skill Evals (new) |
|---|---|---|
| **Scope** | Single MCP server | Full agent across multiple servers |
| **What's measured** | Latency, tokens, recall, call count | Skill routing, tool correctness, anti-patterns |
| **Test data** | Fixture vault | Fixture vault + mock CRM + mock M365 |
| **Execution** | Direct function calls | Agent LLM loop or trace replay |
| **Cost** | Free (no LLM) | Phase 1 free, Phase 2 requires LLM API |
| **CI integration** | `npm run bench` in `mcp/oil` | `npm run eval` at repo root |

The fixture vault from `mcp/oil/bench/fixtures/vault/` is reused as the OIL mock server backing store.

---

## 10. Scenario Coverage Matrix

A tracking table mapping skills → eval scenarios → coverage:

| Skill | Routing | Tool Calls | Anti-Patterns | Output | Budget | Status |
|---|---|---|---|---|---|---|
| morning-brief | ✅ | ✅ | AP-004,009 | ✅ | ✅ | Phase 1 |
| milestone-health-review | ✅ | ✅ | AP-001,003 | ✅ | - | Phase 1 |
| pipeline-hygiene-triage | ✅ | ✅ | AP-001 | ✅ | - | Phase 1 |
| vault-context-assembly | ✅ | ✅ | AP-004,008 | - | - | Phase 1 |
| mcem-stage-identification | ✅ | ✅ | AP-006 | ✅ | - | Phase 1 |
| risk-surfacing | ✅ | ✅ | AP-004 | ✅ | - | Phase 1 |
| task-hygiene-flow | ✅ | ✅ | AP-005 | ✅ | - | Phase 1 |
| role-orchestration | ✅ | ✅ | AP-010 | - | - | Phase 1 |
| customer-evidence-pack | ✅ | ✅ | AP-009 | ✅ | - | Phase 1 |
| exit-criteria-validation | ✅ | ✅ | AP-006 | ✅ | - | Phase 1 |
| *remaining 29 skills* | - | - | - | - | - | Phase 2+ |

---

## 11. Open Questions

1. **Trace capture**: How do we capture real-session tool call traces without a production logging layer? Options: MCP server audit log (`msx/.copilot/logs/audit.ndjson`), VS Code output channel scraping, or manual trace authoring.
2. **LLM cost**: Phase 2 live evals cost ~$0.02–0.10 per scenario per model. At 50 scenarios × 3 models × 5 iterations = ~$50 per full run. Acceptable for weekly CI?
3. **Multi-model**: Do we eval against multiple LLMs (Claude, GPT-4o) to ensure instruction robustness, or pick one canonical model?
4. **Instruction versioning**: When an instruction file changes, how do we version the golden traces? Git diff on the traces themselves?
5. **Skill chain depth**: Skills like `morning-brief` chain 3+ sub-skills. Do we eval the chain end-to-end or unit-test each skill independently?
