# Scenario Prompts

Copy-paste any of these into the Copilot chat window after you've started the MCP servers. Each prompt triggers one or more skills automatically — you don't need to name the skills, just describe what you need.

> **New here?** Start with `/getting-started` or `/my-role` instead. Come back to these once you're comfortable.

---

## Getting Oriented

| What you want                       | Prompt to try                                   |
| ----------------------------------- | ----------------------------------------------- |
| Check your CRM identity             | `Who am I in MSX?`                            |
| See your active pipeline            | `Show me my active opportunities.`            |
| Understand what tools are available | `What MCP tools do I have available for MSX?` |

---

## By Role

### Specialist

| Scenario                | Prompt                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Qualify a new signal    | `I got a signal from the Contoso account team about an Azure migration interest. Should I create an opportunity?` |
| Weekly pipeline review  | `It's Monday — run my weekly pipeline review. What needs cleanup across my Stage 2 and 3 opps?`                  |
| Check handoff readiness | `The Fabrikam AI Copilot deal just got customer agreement. Is it ready to hand off to CSU?`                       |
| Plan a proof            | `We need a POC plan for the Northwind opportunity. What should the proof cover and who owns what?`                |

### Solution Engineer

| Scenario           | Prompt                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Daily task hygiene | `Run my daily task hygiene check — any stale tasks or missing owners on my active milestones?`                |
| Proof scoping      | `The SE and Specialist need to align on success criteria for the Contoso pilot. Help us scope the proof plan.` |

### Cloud Solution Architect

| Scenario                 | Prompt                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Architecture feasibility | `Is the proposed architecture for the Cencora migration actually feasible? Check delivery dependencies and technical risk.`      |
| Handoff to delivery      | `The Contoso proof is complete. Create a handoff note summarizing architecture decisions, risks, and next actions for delivery.` |
| Execution sweep          | `Run my weekly execution sweep — what's at risk across my committed milestones?`                                                |
| Value realization        | `We're entering Realize Value for the Northwind deal. Are our committed milestones tracking measurable outcomes?`                |

### CSAM

| Scenario           | Prompt                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Define outcomes    | `I'm in Listen and Consult with a new engagement. Help me define measurable customer outcomes before we move to Stage 2.`                     |
| Commit gate        | `The team wants to commit the Fabrikam migration milestone. Is it actually ready? Run the commit gate check.`                                 |
| Milestone health   | `How are my committed milestones doing? I have governance this week and need a health summary.`                                               |
| Delivery ownership | `I keep getting tagged for delivery delays on the Vocera milestone but I'm not the delivery owner. Who actually owns execution here?`         |
| Adoption review    | `How is adoption going on the Contoso AI deployment? Check usage health and consumption targets.`                                             |
| Evidence pack      | `I have a QBR with Northwind next week. Prepare an evidence pack with CRM status and recent customer communications from the last 30 days.`   |
| Expansion routing  | `During the Fabrikam optimization review, the customer mentioned interest in expanding to a second region. Should this be a new opportunity?` |

### Any Role

| Scenario             | Prompt                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Stage identification | `What stage is the Contoso deal actually in? The CRM says Stage 3 but activity looks like Stage 2.`              |
| Exit criteria        | `Are we ready to advance to Stage 4 on the Northwind opportunity? Check exit criteria.`                          |
| Stage loopback       | `The proof failed — customer environment wasn't ready. Should we loop back to Stage 2?`                         |
| Risk review          | `What risks am I missing on the Cencora account? Do a full risk review.`                                         |
| Role orchestration   | `Three roles are involved on the Fabrikam deal and nobody's moving. Who should lead the next action?`            |
| Authority tie-break  | `The CSA and I are giving conflicting direction on the Vocera milestone. Who owns this decision?`                |
| Partner motion       | `The Contoso opportunity has a partner co-sell motion. How does that change ownership and delivery attribution?` |
| Unified constraints  | `The milestone depends on Unified delivery. Are there dispatch or eligibility blockers I should know about?`     |

---

## Multi-Skill Chain Prompts

These are realistic "day in the life" prompts that chain **multiple skills** in sequence. This is where the full orchestration shines:

> **Full weekly review (Specialist)**
>
> `I'm a Specialist. Run my full weekly review — pipeline hygiene, any deals ready to hand off, and flag risks across my active opps.`
>
> *Chains: pipeline-hygiene-triage → handoff-readiness-validation → risk-surfacing*

> **Pre-governance prep (CSAM)**
>
> `Before my Contoso governance meeting Thursday, tell me: what stage are we really in, what's the milestone health, and prepare a customer evidence pack for the last 30 days.`
>
> *Chains: mcem-diagnostics → milestone-health-review*

> **Commit-or-loopback decision (CSAM/CSA)**
>
> `The team wants to commit the Fabrikam milestone, but I heard the proof had issues. Check if we should commit or loop back, and tell me who owns what.`
>
> *Chains: commit-gate-enforcement → non-linear-progression → delivery-accountability-mapping*

> **End-to-end deal triage (Any role)**
>
> `The Northwind deal feels stuck. What stage is it actually in, are exit criteria met, what are the risks, and who should own the next action?`
>
> *Chains: mcem-diagnostics → risk-surfacing*

> **Post-proof handoff (CSA → CSAM)**
>
> `I'm a CSA. The Contoso proof just completed successfully. Check architecture feasibility, create the handoff note, and validate that the Specialist handoff is clean.`
>
> *Chains: architecture-review → handoff-readiness-validation*

> **Adoption + expansion review (CSAM)**
>
> `Review adoption health for Fabrikam, check if value is being realized on committed milestones, and flag any expansion signals that should go to the Specialist.`
>
> *Uses: stage-5-review skill*

> **Power BI portfolio review**
>
> `Run my Azure portfolio review — what's my gap to target and which opportunities should I focus on?`
>
> *Uses: pbi-azure-portfolio-review prompt (Power BI + CRM cross-medium)*

> **Morning standup prep (SE)**
>
> `I'm an SE. Check my task hygiene, show me any execution blockers on committed milestones, and tell me if there are Unified constraints I should flag today.`
>
> *Uses: se-execution-check skill*
