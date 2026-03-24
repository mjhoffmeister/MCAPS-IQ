---
description: "SE role card — technical proof executor and HoK engagement driver. Covers POC/Pilot/Demo/HoK management, CRM task-record hygiene, BANT qualification support, SE-to-CSU handoff, and Hands-on-Keyboard positioning. Load when user identifies as Solution Engineer or SE, or asks about proof management, task hygiene, or HoK engagement."
applyTo: ".github/skills/**"
---

# Role Card: Solution Engineer (SE)

## Mission
Drive **technical win quality** and **cloud consumption acceleration** through disciplined milestone-task management, proof execution, Hands-on-Keyboard (HoK) engagement, and timely cross-role handoff.

## Hands-on-Keyboard (HoK) Mandate

Every SE is expected to position HoK with every client and maintain active HoK engagements. HoK is hands-on work in customer development, test, or production environments that accelerates cloud consumption.

### HoK Positioning Rules
1. **Position with every client** — the ability to position HoK for the opportunity to execute with excellence is an expectation.
2. **Cusp customers** — identify customers where next steps are uncertain and engage leadership about HoK fit. Proactively surface cusp customers in pipeline reviews and manager conversations.
3. **Legal coverage first** — legal coverage **must** be in place before any work in customer environments. Never begin HoK execution without confirmed legal coverage.
4. **Environment classification** — explicitly categorize HoK work by environment tier: development, test, or production. Production access requires heightened scrutiny and approval.

### HoK Resources
- **SE Playbook & SE Readiness Backpack**: Comprehensive guides and best practices for SEs
- **Community & Support Channels**: Microsoft Teams channels per Solution Play (M&M, Data, Apps, Software) for async Q&A
- **Skilling Plans**: Required quarterly completion tracked at https://aka.ms/FRI
- **HoK Field Playbook**: Guidance and legal coverage for hands-on work in customer environments

## MCEM Stage Accountability

| Stage | Role |
|---|---|
| Stages 1–2 | Contribute — shape technical need, proof plan, and **HoK positioning**; keep uncommitted milestone tasks current |
| **Stage 3** | **Lead technical proof and HoK execution** — drive proof execution, HoK delivery, task clarity, remove blockers |
| Stages 4–5 | Contribute — preserve continuity via CSU handoff, post-commitment task hygiene, and HoK artifact transfer on SE-influenced milestones |

## Ownership Scope in MSX

- Maintain task-level accuracy on milestones SE touches
- Add SE to deal team when materially contributing
- Express execution via concrete tasks — avoid milestone-level ambiguity
- Track HoK engagements as explicit tasks with environment tier and legal coverage status

## Hygiene Cadence
- **Daily/Weekly**: milestone task hygiene for active opportunities; HoK engagement status review
- **At handoff**: ensure BANT evidence, HoK artifacts, legal coverage records, and handoff artifacts are complete

## Boundary Rules
1. SE owns technical completion evidence; Specialist owns milestone structure/assignment.
2. Uncommitted milestones: SE manages task hygiene, technical shaping tasks, and HoK positioning tasks.
3. Committed milestones where SE influenced: continue task updates and HoK execution until owner-driven execution is stable.
4. Committed milestones where SE did NOT influence: limit to hygiene-only, provide monitoring note.
5. BANT-qualified handoff to CSU only when Budget, Authority, Need, Timeline are evidenced.
6. **HoK legal gate**: No HoK execution task may be created or started without legal coverage confirmation. Flag as blocker if missing.

### Hard Blocks (agent must STOP and redirect)
- **NEVER `create_milestone`** — this is Specialist-owned. If milestones are missing, tell the SE to flag the gap to their Specialist.
- **NEVER update milestone structure** (name, date, monthlyUse, workload, commitment) — redirect to Specialist or CSAM.
- **NEVER update opportunity fields** (stage, close date, revenue) — redirect to Specialist.
- SE **may** create/update/close tasks on milestones they actively contribute to.
- See `msx-role-and-write-gate.instructions.md` §2a for the full Role-Action Authority Matrix.

## Cross-Role Skill Lens

When running shared skills, apply this SE focus:

| Skill | SE Focus |
|---|---|
| `task-hygiene-flow` | Owner, due date, status, blocker text, completion condition per task; HoK task legal coverage status |
| `proof-plan-orchestration` | Technical proof requirements, success criteria, milestone plan; HoK scope and environment tier |
| `hok-readiness-check` | Legal coverage verification, customer environment access, HoK positioning for cusp customers |
| `handoff-readiness-validation` | BANT evidence completeness, technical decisions documented, HoK artifacts transferred |
| `commit-gate-enforcement` | Technical feasibility validated, proof outcomes recorded, HoK legal gate passed |

## Cross-Role Communication
- **With Specialist**: Align on solution play, proof scope, HoK positioning, and required resources (Stages 1–3); surface cusp customers for joint leadership discussion
- **With CSA**: Receive BANT-qualified uncommitted handoff for CSU execution planning; transfer HoK context and environment details
- **With CSAM**: Coordinate task ownership transitions on committed SE-influenced milestones; ensure HoK continuity during handoff
- **With Leadership**: Engage on cusp customers where HoK positioning is uncertain; report HoK engagement status

## Escalation Triggers
- Technical proof blocked >7 days without unblock path
- Milestone dates materially diverge from delivery reality
- Capacity/region constraints require specialized routing
- **HoK legal coverage not in place** for customer environment work
- **Cusp customer** with no clear HoK path — escalate to leadership for guidance
- HoK execution blocked by environment access or customer readiness
