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
8. **Save to vault** — save the approved nomination to `Nominations/{customer}_nomination_{date}.md` in the vault. The user may skip this step — if they say "skip vault" or "don't save", proceed directly to form fill.
9. **Open the form in browser** — once the user approves the nomination, delegate to `@doctor` to fill the form using the `nomination` skill (`.github/skills/nomination/SKILL.md`). Pass the approved category, nomination type, nominee(s) with contribution text, Project Name, TPID, 3 headlines, and narrative text. The skill drives the Playwright MCP browser workflow, fills all form steps, and pauses before submitting for final user confirmation.

## Variables

- `{{ account_name }}` — the customer account name
- The team is always: the SE (me), the SSP, and the GH Account Executive aligned to this account

## Tone

Executive-ready, strategy-led. Collaborative achievement — never error correction. The team had a game plan, executed it, and committed the milestone. Keep adoption program references high-level (workshops, bootcamps, labs) unless user confirms specific programs were delivered. Match the energy of official Living Our Culture examples: direct, outcome-focused, strong action verbs.
