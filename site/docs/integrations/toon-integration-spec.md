---
hide:
  - toc
---

# TOON Integration Spec — MCAPS Copilot Tools

> **Status**: Proposal / RFC  
> **Date**: 2026-03-11  
> **Author**: Agent-assisted  
> **TOON Version**: Spec v3.0 (`@toon-format/toon`)

---

## 1. Executive Summary

[Token-Oriented Object Notation (TOON)](https://github.com/toon-format/toon) is a compact, human-readable encoding of the JSON data model that minimizes LLM tokens while preserving lossless round-trips. It combines YAML-like indentation for nested objects with CSV-style tabular arrays for uniform data.

**Key claims**: ~40% fewer tokens than formatted JSON at ~74% retrieval accuracy (vs JSON's 70%) across 4 models and 209 benchmark questions.

This document maps TOON onto the existing MCAPS Copilot Tools MCP architecture, identifies specific integration points, defines an evaluation framework, and proposes a phased rollout.

---

## 2. Current Serialization Architecture

All MCP tool responses flow through a single serialization point per server:

### MSX Server (`mcp/msx/src/tools.js`)

```javascript
// Line 207 — the universal response wrapper
const text = (content) => ({
  content: [{
    type: 'text',
    text: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  }]
});
```

Every `return text(...)` call in the MSX server passes through this. The 2-space indented `JSON.stringify` is the sole serialization format for all CRM data → LLM context.

### OIL Server (`mcp/oil/src/tools/`)

Each tool file serializes independently via `JSON.stringify(result, null, 2)` in the tool handler (e.g., `retrieve.ts:47`, `orient.ts:54`, `composite.ts:47`).

### Estimated Token Budget per Session

| Payload | Tokens (JSON) | Frequency | Session Cost |
|---------|--------------|-----------|-------------|
| Milestones (full, 200 records) | 15,000–25,000 | 1–3×/session | 25K–75K |
| Opportunities (100 records) | 8,000–15,000 | 1–2×/session | 8K–30K |
| Generic CRM query (500 records) | 12,000–20,000 | 1–3×/session | 12K–60K |
| Milestone triage (200 records) | 6,000–10,000 | 1–2×/session | 6K–20K |
| Vault context (1000+ notes) | 5,000–12,000 | 1×/session | 5K–12K |
| Search results (10–50 hits) | 2,000–5,000 | 3–5×/session | 6K–25K |
| **Estimated total** | | | **62K–222K** |

A 40% reduction = **25K–89K tokens saved per session**.

---

## 3. Data Pattern Analysis — TOON Fit Assessment

TOON's compactness depends on data structure. Classification of our payloads:

### Tier 1 — High Fit (Tabular arrays, ~60% token savings expected)

These are uniform arrays of objects with identical fields — TOON's sweet spot.

| Payload | Source | Fields/Record | Max Records | Shape |
|---------|--------|--------------|-------------|-------|
| Milestones (full) | `tools.js:665` | 18–20 | 500 | `{ count, milestones: [{...}] }` |
| Milestones (triage buckets) | `tools.js:308-345` | 10 | 500 | `{ summary, overdue: [{...}], ... }` |
| Opportunities | `tools.js:527` | 8 | 100+ | `{ count, opportunities: [{...}] }` |
| Tasks | `tools.js:1365-1397` | 9 | 500+ | `{ count, tasks: [{...}] }` |
| Accounts | `tools.js:1270-1284` | 4 | 100+ | `{ count, accounts: [{...}] }` |
| CRM generic query | `tools.js:440-448` | Variable | 500 | `{ count, value: [{...}] }` |
| Search results | `retrieve.ts:47` | 5 | 50 | `[{ path, title, excerpt, score, matchType }]` |
| Query notes | `retrieve.ts:89` | 3 | 100+ | `[{ path, title, tags }]` |

**Example — Milestones (triage bucket)**:
```json
{
  "overdue": [
    { "id": "abc-123", "number": 42, "name": "Azure Migration POC", "status": "On Track", "commitment": "Committed", "date": "2026-02-15", "opportunity": "Contoso Cloud", "workload": "Azure Infra", "recordUrl": "https://..." },
    { "id": "def-456", "number": 43, "name": "Security Review", "status": "On Track", "commitment": "Committed", "date": "2026-02-20", "opportunity": "Contoso Cloud", "workload": "Security", "recordUrl": "https://..." }
  ]
}
```

**TOON equivalent** (~45% smaller):
```toon
overdue[2]{id,number,name,status,commitment,date,opportunity,workload,recordUrl}:
  abc-123,42,Azure Migration POC,On Track,Committed,2026-02-15,Contoso Cloud,Azure Infra,https://...
  def-456,43,Security Review,On Track,Committed,2026-02-20,Contoso Cloud,Security,https://...
```

### Tier 2 — Medium Fit (Mixed nested+tabular, ~20–30% savings)

Structures with a summary object + tabular arrays. TOON handles these via indentation for the top-level + tabular for the arrays.

| Payload | Source | Structure |
|---------|--------|-----------|
| Milestone summary | `tools.js:280-300` | `{ count, byStatus: {}, byCommitment: {}, milestones: [...] }` |
| Milestone triage (full) | `tools.js:308-345` | `{ summary: {...}, overdue: [...], due_soon: [...], ... }` |
| Vault context | `orient.ts:51-60` | `{ folderStructure: {tree}, topTags: [...], mostLinkedNotes: [...] }` |
| CRM prefetch | `composite.ts:40-60` | `{ prefetch: [{ customerName, tpid, odata_hints: {...} }] }` |
| Correlation results | `composite.ts:90-115` | `{ matches: [...], summary: {...} }` |

### Tier 3 — Low Fit (Deeply nested / non-uniform, <10% savings)

| Payload | Why |
|---------|-----|
| Single record lookups (`crm_get_record`) | Flat object, few fields — no array to tabularize |
| `crm_whoami` | Single flat object |
| Folder tree structures | Recursive nesting, 0% tabular eligibility |

---

## 4. Integration Architecture

### 4.1 Proposed Approach: Transparent Encoding Layer

Rather than rewriting each tool, introduce a **format-aware response encoder** that sits inside the existing `text()` wrapper:

```
Tool handler → JS object → Encoder (JSON or TOON) → text() → MCP response
```

**Key design decisions**:

1. **Opt-in per tool** — Not all payloads benefit. Tools register their response schema hints.
2. **Fallback to JSON** — If TOON encoding fails or data is non-tabular, fall back to JSON.
3. **Model awareness** — Wrap TOON output in a ```toon code fence per TOON's LLM integration guidance so models can identify the format.
4. **No decode needed** — TOON is read-only by the LLM. The LLM never sends TOON back; it's a purely output-side optimization.

### 4.2 Code Changes

#### MSX Server — `mcp/msx/src/tools.js`

```javascript
// New: format-aware text() replacement
import { encode } from '@toon-format/toon';

const TOON_ENABLED = process.env.TOON_FORMAT !== '0'; // opt-out flag

function text(content, { toon = false } = {}) {
  if (typeof content === 'string') {
    return { content: [{ type: 'text', text: content }] };
  }
  if (toon && TOON_ENABLED) {
    try {
      const encoded = encode(content);
      return { content: [{ type: 'text', text: '```toon\n' + encoded + '\n```' }] };
    } catch {
      // Fall back to JSON on encode failure
    }
  }
  return { content: [{ type: 'text', text: JSON.stringify(content, null, 2) }] };
}
```

Then annotate high-value tool returns:
```javascript
// get_milestones (full format)
return text({ count: milestones.length, milestones: enriched }, { toon: true });

// list_opportunities
return text({ count: allOpps.length, opportunities: allOpps.map(...) }, { toon: true });

// get_milestone_activities 
return text({ count: tasks.length, tasks }, { toon: true });
```

#### OIL Server — `mcp/oil/src/tools/`

Same pattern: create a shared `formatResponse(data, { toon })` helper in a new `mcp/oil/src/format.ts`, import in each tool file.

### 4.3 Dependency

```
npm install @toon-format/toon
```

- **Package**: `@toon-format/toon` (MIT license, TypeScript, 25 releases, 23K+ stars)
- **Size**: Lightweight — pure TypeScript encoder/decoder, no native deps
- **Compatibility**: ESM + CJS, Node 18+

---

## 5. Evaluation Framework

### 5.1 Token Efficiency Benchmark (extend existing bench suite)

The OIL server already has a benchmark harness at `mcp/oil/bench/` with `estimateTokens()` and fixture data. Extend it:

**New benchmark file**: `mcp/oil/bench/token-efficiency/toon-comparison.bench.ts`

```typescript
import { encode } from '@toon-format/toon';
import { estimateTokens } from '../harness.js';

// Test payloads representing real CRM responses
const fixtures = {
  milestones_full: { /* 50 milestone records, 18 fields each */ },
  milestones_triage: { /* triage format with 4 buckets */ },
  opportunities: { /* 30 opportunity records, 8 fields each */ },
  tasks: { /* 100 task records, 9 fields each */ },
  search_results: { /* 20 search hits, 5 fields each */ },
  vault_context: { /* nested vault structure */ },
  crm_generic: { /* 100 records, variable fields */ },
};

describe('TOON vs JSON Token Efficiency', () => {
  for (const [name, data] of Object.entries(fixtures)) {
    it(`${name}: should measure token savings`, () => {
      const json = JSON.stringify(data, null, 2);
      const jsonCompact = JSON.stringify(data);
      const toon = encode(data);

      const jsonTokens = estimateTokens(json);
      const jsonCompactTokens = estimateTokens(jsonCompact);
      const toonTokens = estimateTokens(toon);

      const savings = ((jsonTokens - toonTokens) / jsonTokens * 100).toFixed(1);
      const vsCompact = ((jsonCompactTokens - toonTokens) / jsonCompactTokens * 100).toFixed(1);

      console.log(`  ${name}:`);
      console.log(`    JSON (pretty):  ${jsonTokens} tokens`);
      console.log(`    JSON (compact): ${jsonCompactTokens} tokens`);
      console.log(`    TOON:           ${toonTokens} tokens`);
      console.log(`    Savings vs pretty: ${savings}%`);
      console.log(`    Savings vs compact: ${vsCompact}%`);
    });
  }
});
```

### 5.2 Retrieval Accuracy Benchmark

Validate that LLMs can still extract correct answers from TOON-encoded CRM data.

**Method**:
1. Generate 50 field-retrieval questions against milestone/opportunity fixtures
2. Encode same data as JSON and TOON
3. Send both to target models (Claude Haiku / GPT-4o-mini) with identical prompts
4. Compare answer accuracy deterministically

**Question categories** (mapped from TOON's benchmark methodology):
- **Field retrieval**: "What is the status of milestone #42?" 
- **Aggregation**: "How many milestones are Committed?"
- **Filtering**: "Which overdue milestones belong to Contoso?"
- **Structure awareness**: "How many fields does each milestone have?"

### 5.3 Live A/B Framework

Once benchmarks show promise, enable per-session comparison:

```javascript
// Environment variable toggle
TOON_FORMAT=1   // enable TOON for tabular payloads
TOON_FORMAT=0   // disable (JSON default)
TOON_LOG=1      // log token counts for both formats to stderr
```

When `TOON_LOG=1`, the `text()` wrapper logs:
```
[TOON] get_milestones: JSON=12,450 tokens, TOON=7,470 tokens (−40.0%)
```

This enables field measurement without changing behavior.

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Model confusion** — LLM misreads TOON syntax | Medium | Use ```toon code fences; test with target models before shipping; fall back to JSON |
| **Non-uniform records** — CRM records with optional fields break tabular layout | Low | TOON handles semi-uniform data; `encode()` auto-detects and falls back to nested format |
| **OData annotation bloat** — `@OData.Community.Display.V1.FormattedValue` duplicates add noise | N/A (pre-existing) | Strip annotations before TOON encoding (already done in triage/summary formats) |
| **Dependency risk** — TOON is young (5 months old, spec v3) | Medium | MIT license, 23K stars, 37 contributors, multi-language ecosystem; pin version; encoder is small enough to vendor if needed |
| **Latency overhead** — TOON encoding adds CPU time | Low | Encoding is O(n) string manipulation; negligible vs network latency of CRM calls |
| **Debugging difficulty** — TOON less familiar than JSON for developers | Low | All internal code stays JSON; TOON is only the wire format to LLM |

---

## 7. What NOT to Convert

| Payload | Reason |
|---------|--------|
| Single-record lookups (`crm_get_record`) | Flat object, no array — no savings |
| `crm_whoami` | 5–10 fields, negligible token cost |
| Folder tree structures | Recursive nesting, 0% tabular eligibility — TOON docs say JSON-compact is better |
| Error responses | Already plain strings |
| Approval queue / staged operations | Internal state, never sent to LLM in bulk |
| Tool schemas (inputSchema) | Defined by MCP protocol, must be JSON |

---

## 8. Phased Rollout Plan

### Phase 0 — Benchmark (1 week)

1. Install `@toon-format/toon` as a dev dependency in `mcp/oil`
2. Create fixture data from real CRM response shapes (sanitized)
3. Extend `mcp/oil/bench/token-efficiency/` with TOON comparison benchmarks
4. Measure token savings per payload type
5. **Gate**: Proceed only if Tier 1 payloads show ≥30% savings vs pretty JSON

### Phase 1 — MSX Server Opt-in (1 week)

1. Install `@toon-format/toon` as a production dependency in `mcp/msx`
2. Refactor `text()` to accept `{ toon: true }` option
3. Enable TOON for 3 highest-impact tools:
   - `get_milestones` (format='full')
   - `list_opportunities`
   - `get_milestone_activities`
4. Add `TOON_FORMAT` and `TOON_LOG` environment variables
5. Ship with `TOON_FORMAT=0` (off by default)

### Phase 2 — OIL Server + Accuracy Testing (1 week)

1. Add TOON encoding to OIL tools (`search_vault`, `query_notes`)
2. Run retrieval accuracy benchmark against Claude Haiku + GPT-4o-mini
3. **Gate**: Proceed only if accuracy ≥ JSON baseline (within 2% margin)

### Phase 3 — Default On + Monitoring (ongoing)

1. Flip `TOON_FORMAT=1` as default
2. Monitor via `TOON_LOG` for real-session token savings
3. Extend to remaining Tier 1 payloads (accounts, generic CRM query)
4. Document in skill authoring guidelines

---

## 9. Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token savings (Tier 1 payloads) | ≥35% vs `JSON.stringify(data, null, 2)` | Benchmark suite |
| Token savings (Tier 2 payloads) | ≥15% vs pretty JSON | Benchmark suite |
| Retrieval accuracy | ≥ JSON baseline (within 2%) | LLM accuracy benchmark |
| Encoding latency | < 5ms for 500-record payload | Benchmark suite |
| Zero regressions | No tool failures in existing test suite | `vitest` CI |
| Session token reduction | ≥20% overall session context reduction | `TOON_LOG` telemetry |

---

## 10. Open Questions

1. **MCP protocol compatibility** — The MCP spec defines `text` content type. Are ```toon code fences sufficient for model recognition, or do we need a custom content type?

2. **Streaming** — TOON supports `encodeLines()` for streaming. Should we integrate with the MCP streaming response pattern for very large payloads (500+ records)?

3. **OData annotation stripping** — Should we strip `@OData.Community.Display.V1.FormattedValue` annotations *before* TOON encoding (losing formatted labels), or keep them (losing some TOON savings)?  Current `triage` format already strips them; `full` format does not.

4. **Hybrid format** — For Tier 2 payloads (summary + array), should we encode only the array portion as TOON and keep the summary as plain key-value, or encode the whole structure?

5. **Model-specific tuning** — TOON benchmarks show model-dependent accuracy (Haiku: 59.8%, GPT-5-nano: 90.9%). Should we toggle TOON based on the downstream model?

---

## Appendix A — TOON Format Quick Reference

```
# Flat object (YAML-like)
name: Alice
role: admin

# Array of primitives
tags[3]: azure,migration,security

# Tabular array (CSV-like with header)
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user

# Nested object
context:
  task: deploy
  env: prod

# Mixed: nested summary + tabular array
summary:
  total: 42
  overdue: 3
milestones[42]{id,name,status,date}:
  abc-123,Azure POC,On Track,2026-03-15
  def-456,Security Review,Blocked,2026-03-01
  ...
```

## Appendix B — Files to Modify

| File | Change |
|------|--------|
| `mcp/msx/package.json` | Add `@toon-format/toon` dependency |
| `mcp/msx/src/tools.js` | Refactor `text()`, annotate tool returns |
| `mcp/oil/package.json` | Add `@toon-format/toon` dependency |
| `mcp/oil/src/format.ts` | New: shared TOON response formatter |
| `mcp/oil/src/tools/retrieve.ts` | Use formatter for search/query results |
| `mcp/oil/src/tools/orient.ts` | Use formatter for vault context |
| `mcp/oil/bench/token-efficiency/toon-comparison.bench.ts` | New: TOON benchmark |
| `mcp/oil/bench/harness.ts` | Add TOON encoding helpers to harness |
