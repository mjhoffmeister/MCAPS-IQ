---
description: "Generate an Americas Living Our Culture nomination for an account team that drove GitHub Copilot adoption and committed a milestone through cross-role strategic collaboration. Use: 'let's nominate [Account Name]'"
---

# Nominate Account Team

Generate an **Americas Living Our Culture** nomination for the cross-role team that strategically drove adoption on **{{ account_name }}** and committed a GHCP milestone.

## Context

This nomination recognizes the SE, SSP, and GitHub Account Executive who came together, built a game plan, executed adoption resources for the customer, and committed a milestone backed by verified production consumption.

## Steps

1. **Load nomination instructions** — read `.github/instructions/nomination.instructions.md` for award categories, form field constraints, narrative framing, and compliance rules.
2. **Check prior nominations** — search `Nominations/` in the vault for existing nominations. If any exist, review tone, structure, and level of detail to ensure consistency. Match the style — especially how generic or specific enablement references are.
3. **Confirm award category** — default to **"Make it Happen"** for standard 3-person teams. If the user specifies a category in their request, use it without re-confirming. Only present the category table and ask when the user hasn't indicated a preference.
3. **Resolve the account** — pull full customer context from the vault via `oil:get_customer_context` for `{{ account_name }}`. Extract:
   - Committed ACR on the milestone (the number that matters)
   - Active Copilot seats — proof that adoption is real
   - Seat whitespace — the expansion opportunity
   - Milestone ID and opportunity linkage
   - Team: SSP name, GH AE name, SE name (from Agent Insights / Teams transcripts)
   - Key dates of collaboration
   - Adoption actions taken — keep generic ("enablement sessions", "technical resources") unless user confirms specific programs were delivered. Match the specificity level of prior nominations in the vault.
   - Customer engagement signals — subsidiary structures, BU adoption, expansion interest
4. **If vault data is insufficient** — check CRM via `crm_get_record` or `get_milestones` for current milestone values. Cross-reference with MSXI seat data. **ACR source hierarchy: GH AE-confirmed number > CRM committed value > MSXI/OctoDash.** See ACR Verification Protocol in the instructions.
5. **Generate the nomination** matching the actual form fields (see Form Field Constraints in instructions):
   - **Project Name** (≤90 chars) — concise title for the achievement
   - **3 separate Headlines** (≤300 chars each) — strategic alignment, cross-role execution, measurable impact
   - **Per-nominee contribution** — what each person specifically did
   - **"What's Your Story?" narrative** (≤6,000 chars) — 300–500 word story following the arc: Opportunity → Approach → Impact
   - **CRITICAL**: Frame the narrative as adoption-driven strategy → committed milestone. NEVER reference prior CRM values, deltas, or corrections. The committed amount is the outcome of the team's game plan — not a fix.
6. **Compliance check** — run the checklist from the instructions against the output.
7. **Present** the full nomination ready to paste into the form. Offer to adjust tone, switch categories, or add/remove details.

---

## Post-Nomination Actions — MANDATORY GATE

**⛔ STOP after Step 7.** Once the user approves the nomination text, run the analysis below and present the action selector. Do NOT silently proceed to form fill. Do NOT skip to vault save. Present options and wait.

### Pre-flight analysis (runs automatically, not shown as raw data)

Before presenting options, the agent silently evaluates:

1. **Wins channel fitness** — score the story against the 7-dimension rubric from `wins-channel-post.instructions.md` (Customer Significance, Metric Impact, Competitive Narrative, Team Orchestration, Customer Journey, Expansion Signal, Peer Learning Value). Produce a score /14.
2. **Prior channel posts** — delegate to `m365-actions`: search the Wins & Customer Impact channel (Group `28d45944-2cd9-4b56-ae66-7369cac7357b`, Channel `19:16065ac38a6a4e0893e68c60892b6bae@thread.tacv2`) for recent posts mentioning `{{ account_name }}`. Flag if duplicate exists in last 30 days.
3. **Vault nomination history** — check `Nominations/` for existing nominations and posts for this account.

### Action Selector

Present a table with the agent's recommendation per action:

| # | Action | Agent Assessment | Recommendation |
|---|--------|-----------------|----------------|
| A | **Submit nomination** — fill the Living Our Culture form via browser | Ready ✅ | _(always available)_ |
| B | **Post to Wins channel** — transform into a peer-facing channel post | Fitness: [X]/14 [emoji] | [Recommended / Viable / Not recommended — with one-line reason] |
| C | **Save to vault only** — archive nomination text without submitting | — | _(always available)_ |
| D | **All of the above** — submit form + post to channel + save to vault | Fitness: [X]/14 [emoji] | [Recommended only if B is Recommended] |

**Fitness emoji mapping**: 🟢 10–14 (strong) · 🟡 6–9 (viable, could be enriched) · 🔴 0–5 (not recommended)

**Agent recommendation rules**:
- **B = "Recommended"** when fitness ≥ 10 and no duplicate in channel
- **B = "Viable — could be stronger"** when fitness 6–9. Note the weak dimensions.
- **B = "Not recommended"** when fitness < 6. Show top 2 reasons and what would make it channel-worthy.
- **B = "Duplicate detected"** when a recent post exists for this account. Suggest updating the existing post or skipping.
- **D = "Recommended"** only when B is "Recommended"

Ask: **"Which actions? (e.g., 'A and C', 'D', 'just A')"** — then STOP and WAIT.

**Skip rule**: If the user already specified actions in their original request (e.g., "nominate and post to channel", "just the form", "nominate but don't post"), skip the gate and execute the specified actions. Still run the fitness check silently for B — if fitness < 6 and user requested B, trigger the pushback protocol from `wins-channel-post.instructions.md` before proceeding.

### Cross-action optimization

- **A + B selected** → run form fill first, then generate channel post (nomination data is warm in context)
- **B alone** → chain to `wins-channel-post.prompt.md` directly with nomination data
- **C alone or with others** → vault save runs in parallel with other actions (no dependency)

---

## Action Execution

### Action A — Submit Nomination Form

8. **Save to vault** — save the approved nomination to `Nominations/{customer}_nomination_{date}.md` in the vault. The user may skip this step — if they say "skip vault" or "don't save", proceed directly to form fill.
9. **Open the form in browser** — delegate to `@doctor` to fill the form using the `nomination` skill (`.github/skills/nomination/SKILL.md`). Pass the approved category, nomination type, nominee(s) with contribution text, Project Name, TPID, 3 headlines, and narrative text. The skill drives the Playwright MCP browser workflow, fills all form steps, and pauses before submitting for final user confirmation.

### Action B — Post to Wins Channel

10. **Chain to `wins-channel-post.prompt.md`** — pass `{{ account_name }}` and the nomination data (ACR, nominees, team roles, headlines, narrative, competitive context, customer industry). The wins-channel-post workflow:
    - Uses the pre-computed fitness score from the action selector
    - Selects the best post archetype (Competitive Displacement / Strategic Partnership / Innovation / Quick Snapshot)
    - Transforms nomination content into a peer-facing post (NOT a copy-paste)
    - Resolves @mentions for team members
    - Presents the post for user approval
    - Posts to the channel via `m365-actions` delegation
    - **May push back** if fitness is marginal — this is by design. The channel's quality bar is independent of the nomination's worthiness.

### Action C — Save to Vault Only

11. **Save nomination** to `Nominations/{customer}_nomination_{date}.md`. No form fill, no channel post.

## Variables

- `{{ account_name }}` — the customer account name
- The team is always: the SE (me), the SSP, and the GH Account Executive aligned to this account

## Tone

Executive-ready, strategy-led. Collaborative achievement — never error correction. The team had a game plan, executed it, and committed the milestone. Keep adoption program references high-level (workshops, bootcamps, labs) unless user confirms specific programs were delivered. Match the energy of official Living Our Culture examples: direct, outcome-focused, strong action verbs.
