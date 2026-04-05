# MCAPS IQ Overview Diagram — Section Spec

> **Goal**: A single-page visual (landscape, 16:9 or wider) that leads with **business value**, then shows **how the system works** through real workflow examples. Target audience: non-technical MCAPS sellers (Specialists, SEs, CSAs, CSAMs) and their managers who need to understand *why this matters* before *how it works*.

---

## Design Principles

1. **Value first, architecture second.** The top third of the diagram should answer "why should I care?" before any boxes or arrows appear.
2. **Role-centric.** Every flow should visually map to an MCAPS role so viewers instantly find themselves.
3. **Plain English.** Label everything with the natural-language prompts users actually type, not internal skill names.
4. **Two-stage trust model.** Reflect the read-first, confirm-before-write safety pattern (mirrors the reference MSX Milestones diagram).
5. **Color coding by concern.** Consistent palette across all sections (see Color Key below).

---

## Section Breakdown

### Section 1 — Value Banner (Top Strip)

**Purpose**: Hook the viewer. Answer: *"What does this do for me?"*

| Element | Content |
|---------|---------|
| **Headline** | *"Talk to Copilot in plain English to run your pipeline."* |
| **3 value pillars** (icon + 1-liner each) | **Save Time**: Eliminate MSX screen-hopping — pipeline, milestones, tasks in one chat window. |
| | **Stay Sharp**: AI surfaces risks, stale deals, and missed follow-ups you'd otherwise miss. |
| | **Work Together**: Cross-role context flows automatically — handoffs, coverage gaps, and relationship health are visible. |
| **Trust callout** (small, right-aligned) | *"Read-only by default. Always asks before writing. Every output is a draft for your judgment."* |

**Visual style**: Full-width gradient strip (Microsoft Blue → Teal). White text. Icons for each pillar (magnifying glass, lightning bolt, people). No boxes/arrows — pure messaging.

---

### Section 2 — The "What You Say → What Happens" Bridge

**Purpose**: Show that the interface is natural language. Visually bridge from *value* (Section 1) to *system* (Sections 3–5).

**Layout**: A centered horizontal bar showing 4–5 example prompts users would actually type, each with a small arrow pointing down into the flow lanes below.

| Example Prompt | Maps To |
|----------------|---------|
| *"Start my day"* | Morning Brief flow (Section 3) |
| *"Run my weekly pipeline review"* | Weekly Governance flow (Section 3) |
| *"Show me my active opportunities"* | Pipeline Read flow (Section 4) |
| *"Is this deal ready to hand off?"* | Handoff Readiness flow (Section 4) |
| *"Update the close date on the Contoso opp"* | Staged Write flow (Section 5) |

**Visual style**: Chat-bubble shapes with user avatar. Downward arrows colored to match the flow lane they feed into.

---

### Section 3 — Daily & Weekly Rhythm Flows (Swim Lane A)

**Purpose**: Show the two flagship "autopilot" workflows that generate the most value for recurring use.

**Sub-lane A1: Morning Brief** (`/daily`, `/morning-prep`)

```
[Calendar via M365] ──→ [Vault: customer context] ──→ [CRM: pipeline state]
         │                        │                           │
         └────────────────────────┴───────────────────────────┘
                                  │
                           ┌──────▼──────┐
                           │ Role-Aware   │
                           │ Prioritized  │
                           │ Action List  │
                           └──────────────┘
```

Key callouts:
- **Parallel retrieval**: Calendar + Vault + CRM queried simultaneously for speed
- **Meeting prep auto-generated**: Creates vault meeting notes with pre-populated context
- **Role-specific output**: Specialist sees pipeline flags; SE sees task hygiene; CSAM sees governance items

**Sub-lane A2: Weekly Review** (`/weekly`)

```
Monday (Governance Prep)                    Friday (Digest)
┌──────────────────────┐                    ┌─────────────────────┐
│ Vault sweep          │                    │ Meeting aggregation  │
│ → Role skill chains  │                    │ → M365 gap fill      │
│ → Status + actions   │                    │ → CRM health check   │
│ → Vault write-back   │                    │ → Formatted digest   │
└──────────────────────┘                    └─────────────────────┘
           ↓                                           ↓
   Shareable governance                        Saved to vault
   status (internal +                          Weekly/ folder
   customer-safe)
```

Key callouts:
- **Auto-detects day of week** — no mode selection needed
- **Monday output is governance-ready** — shareable with account team and leadership
- **Friday output is reflective** — what happened, what's at risk, what carried forward

---

### Section 4 — On-Demand Analysis Flows (Swim Lane B)

**Purpose**: Show the analytical queries users run throughout the week.

**Layout**: 4 flow cards arranged horizontally, each showing input → processing → output.

#### B1: Account Review (`/account-review`)

```
User picks section(s):
  Health Card │ Seat Analysis │ Engagement │ Pipeline │ Full Review
       │              │              │           │
       ▼              ▼              ▼           ▼
    PBI MSXI    PBI OctoDash    M365 signals   CRM opps
       │              │              │           │
       └──────────────┴──────────────┴───────────┘
                            │
                    Scored health dashboard
                    with risk indicators
```

#### B2: Portfolio Prioritization (`/portfolio-prioritization`)

```
All tracked accounts → PBI seats + CRM pipeline + Vault engagement
                                     │
                         5-tier classification:
                    Greenfield │ Stagnant │ Whitespace │
                    High Performers │ Low Utilization
                                     │
                         Ranked action list
```

#### B3: What Next? (`/what-next`)

```
"I have a few minutes" → Quick scan (role-specific)
                                │
                        Top 3 actions ranked by urgency
                        (with offer to execute each)
```

#### B4: Meeting Lifecycle (`/meeting`)

```
Meeting title ──→ PREP MODE: vault + CRM + M365 context → Pre-filled note
        or
Pasted notes  ──→ PROCESS MODE: structure + extract actions → Updated vault
```

---

### Section 5 — Staged Write & Safety Model (Swim Lane C)

**Purpose**: Address the #1 concern — *"Will it break my CRM data?"* Show the two-stage trust architecture.

**Layout**: Two-column flow mirroring the reference diagram's Stage 1 / Stage 2 pattern.

```
┌─── Stage 1: Read & Draft (always safe) ───┐     ┌─── Stage 2: Review & Execute ────────┐
│                                            │     │                                      │
│  CRM Read ──→ AI Synthesis ──→ Draft       │────▶│  Human reviews draft                 │
│  M365 Read        │            (Markdown)  │     │  Approves / edits / cancels          │
│  Vault Read       │                        │     │  "Execute all" or "Cancel all"       │
│                   ▼                        │     │  CRM writes only on explicit approval │
│           No CRM writes.                   │     │                                      │
│           AI cannot modify                 │     │  Execution log (.json) for            │
│           records in Stage 1.              │     │  traceability                         │
└────────────────────────────────────────────┘     └──────────────────────────────────────┘
```

Callout boxes:
- **"Read-only by default"** — Stage 1 is the normal operating mode. Most workflows never need Stage 2.
- **"Human-in-the-loop"** — Stage 2 requires explicit approval. No silent writes. No auto-execution.
- **"Role-gated"** — Write permissions match your MSX role. You can only update what you'd be allowed to update manually.

---

### Section 6 — Data Sources & Integration Layer (Bottom Strip)

**Purpose**: Show what systems feed in, so viewers understand the breadth without needing to understand MCP.

**Layout**: Horizontal strip with 5 source icons connected to a central hub.

```
    MSX CRM          M365              Obsidian Vault      Power BI           GitHub
  (Dynamics 365)   (Outlook, Teams,   (Local knowledge    (MSXI, OctoDash,   (Repo activity,
   Opportunities    Calendar)          layer — customer     Azure AIO,         PRs, issues)
   Milestones                          notes, meeting       SE Productivity,
   Tasks                               history, people)     CXObserve)
   Deal Teams
        │               │                    │                   │                │
        └───────────────┴────────────────────┴───────────────────┴────────────────┘
                                             │
                                   ┌─────────▼─────────┐
                                   │  GitHub Copilot    │
                                   │  (VS Code Chat)    │
                                   │                    │
                                   │  43 skills         │
                                   │  20+ slash prompts │
                                   │  4 MCAPS roles     │
                                   └────────────────────┘
```

**No MCP jargon.** Label as "connected systems" or "data sources." The technical integration layer is invisible to the user — that's the point.

---

### Section 7 — Role Ribbon (Right Sidebar or Overlay)

**Purpose**: Show all 4 roles and their top 2–3 workflows so every viewer finds their entry point.

| Role | Icon | Top Workflows |
|------|------|---------------|
| **Specialist** | 🎯 | Pipeline hygiene, deal qualification, handoff readiness |
| **Solution Engineer** | 🔧 | Task hygiene, proof planning, HoK readiness, SE productivity |
| **Cloud Solution Architect** | 🏗️ | Architecture feasibility, execution sweep, delivery handoff |
| **CSAM** | 🤝 | Milestone governance, customer outcomes, adoption tracking |

Each role card should show 1 example prompt the person would type and what they'd get back (screenshot-style mockup or simplified output preview).

---

## Color Key

| Color | Hex | Meaning |
|-------|-----|---------|
| **Microsoft Blue** | `#0078D4` | Primary actions, user prompts, CRM data |
| **Teal** | `#00B7C3` | M365 integration, communication signals |
| **Green** | `#107C10` | Safe actions, read-only operations, vault |
| **Amber** | `#FFB900` | Attention needed — risks, stale items, write staging |
| **Purple** | `#5C2D91` | Power BI analytics, data insights |
| **Gray** | `#737373` | Background, supporting text, structural lines |
| **Red border** | `#D13438` | Safety callouts, write-gate boundaries |

---

## Callout Boxes (4 total, positioned around margins)

These mirror the reference diagram's numbered callout style.

| # | Title | Content |
|---|-------|---------|
| **1** | *"Why Plain English?"* | No SQL, no DAX, no OData. You describe what you need; the agent picks the right tools, queries the right systems, and assembles the answer. 43 skills activate automatically by matching your words to their capabilities. |
| **2** | *"Safety & Trust"* | Stage 1 is read-only against all systems. Stage 2 writes require explicit human approval. Role-gated: you can only modify what MSX would let you modify manually. Every staged change shows a diff before execution. |
| **3** | *"Multi-Signal Intelligence"* | Most MSX answers come from one system. MCAPS IQ cross-references 2+ sources (CRM + M365, CRM + Vault, PBI + CRM) and flags when sources disagree or go silent. You see the full picture, not a single pane. |
| **4** | *"Your Knowledge Compounds"* | The Obsidian vault stores meeting notes, customer context, and relationship history locally. Every meeting prep, action item, and insight feeds back into the vault — so the agent gets smarter about your accounts over time. |

---

## Production Notes

### Format Options

| Format | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Excalidraw** (`.excalidraw.md`) | Native Obsidian rendering, version-controllable, editable | Limited typography control, no pixel-perfect export | Best for internal iteration |
| **Figma / FigJam** | Professional polish, export to PNG/SVG/PDF | Requires Figma access, not version-controlled | Best for external sharing |
| **draw.io / diagrams.net** | Free, XML-based (git-friendly), good export | Less visual polish than Figma | Good middle ground |
| **PowerPoint** (via `processing-presentations` skill) | Universally accessible, easy to present | Limited diagramming precision | Best for embedding in decks |
| **Mermaid** | Code-based, renders in GitHub/docs | Too rigid for this complexity | Not recommended for this |

**Recommended**: Build in **Excalidraw** for rapid iteration → export to **Figma** for polish → export **PNG/SVG** for docs and decks.

### Size & Layout

- **Orientation**: Landscape 16:9 (1920×1080 minimum)
- **Sections flow**: Top-to-bottom (Value → Interface → Flows → Safety → Sources)
- **Role ribbon**: Right sidebar (vertical) or bottom row (horizontal) — test both
- **Callout boxes**: Positioned in margins, connected to relevant sections via thin leader lines
- **Zoom levels**: Design for both full-page view and section-level zoom (each section should be readable when cropped independently for slide decks)

### Phased Build

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| **Phase 1** | Sections 1 + 2 + 6 (Value + Interface + Sources) | The "elevator pitch" version — standalone shareable |
| **Phase 2** | Add Sections 3 + 4 (Daily/Weekly + On-Demand flows) | The "show me the workflows" version |
| **Phase 3** | Add Sections 5 + 7 (Safety + Role Ribbon) + Callouts | The complete reference diagram |

### Content Sourcing

All section content is grounded in existing repo artifacts:

| Section | Source Files |
|---------|-------------|
| Value Banner | `README.md`, `site/docs/index.md`, `agent-intent` skill |
| Prompt Bridge | `.github/prompts/*.prompt.md` (descriptions) |
| Morning Brief | `morning-brief` skill, `daily.prompt.md`, `morning-prep.prompt.md` |
| Weekly Review | `weekly.prompt.md` |
| Account Review | `account-review.prompt.md` |
| Portfolio Prioritization | `portfolio-prioritization.prompt.md` |
| What Next | `what-next.prompt.md` |
| Meeting Lifecycle | `meeting.prompt.md` |
| Staged Write | `write-gate` skill, `msx-role-and-write-gate.instructions.md` |
| Data Sources | `.vscode/mcp.json`, `ARCHITECTURE.md` |
| Role Ribbon | `role-specialist`, `role-se`, `role-csa`, `role-csam` skills |
| Callout 3 (Multi-Signal) | `shared-patterns` skill, `agent-intent` skill |
| Callout 4 (Vault) | `vault-routing` skill, `obsidian-vault.instructions.md` |
