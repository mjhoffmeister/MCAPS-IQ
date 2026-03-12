---
title: "Day 1: Hello MCAPS IQ"
description: Verify everything works and understand what you're talking to.
tags:
  - guided
  - day-1
  - beginner
---

# Day 1: Hello MCAPS IQ

<div class="step-indicator" markdown>
<span class="step active">Day 1</span>
<span class="step">Day 2</span>
<span class="step">Day 3</span>
<span class="step">Day 5</span>
</div>

**Goal:** Verify your setup works and build an intuition for how Copilot interacts with CRM.

**Time:** ~10 minutes

**What you'll learn:**

- How to talk to Copilot about MSX data
- What happens behind the scenes when you ask a question
- How to spot when Copilot is using MCP tools vs. its general knowledge

---

## Exercise 1: Who Are You?

Open Copilot Chat (++cmd+shift+i++) and type:

```
Who am I in MSX?
```

**What to watch for:**

- [x] Copilot should call the `crm_whoami` tool (you'll see it mentioned in the response or tool call indicator)
- [x] It should return your name, alias, role, and business unit
- [x] The data should match your actual MSX profile

!!! success "Checkpoint"
    If you see your name and role, authentication is working. You're connected to real MSX data.

??? question "What if it gets my role wrong?"
    CRM role detection depends on your Dynamics 365 assignments. You can always tell Copilot your role explicitly:
    ```
    I'm a Specialist. Remember that for this session.
    ```

---

## Exercise 2: What Tools Do You Have?

```
What MCP tools do you have available for MSX?
```

**What to watch for:**

- [x] You should see a list of ~23 tools (if `msx-crm` is running)
- [x] Tools include `crm_whoami`, `crm_query`, `list_opportunities`, `get_milestones`, etc.
- [x] If `workiq` is running, you'll also see `ask_work_iq`

!!! info "Why this matters"
    Understanding the available tools helps you understand what Copilot _can_ do. Each tool is a capability — and Copilot automatically selects the right ones based on your prompt.

---

## Exercise 3: A Simple Read

```
Show me my active opportunities.
```

**What to watch for:**

- [x] Copilot calls `list_opportunities` (not `crm_query` — it knows the right tool)
- [x] Returns a structured list with opportunity names, stages, and values
- [x] The data matches what you'd see in MSX

??? tip "Try variations"
    These all work — Copilot understands intent, not exact phrasing:
    
    - `What's in my pipeline?`
    - `List my open deals.`
    - `Any active opps assigned to me?`

---

## Exercise 4: Ask a Follow-Up

After seeing your opportunities, try:

```
Tell me more about the first one.
```

**What to watch for:**

- [x] Copilot maintains **context** from the previous response
- [x] It should call `crm_get_record` to fetch the full opportunity details
- [x] You'll see fields like estimated close date, revenue, stage, and deal team info

---

## Exercise 5: Peek Behind the Curtain

```
How did you know which CRM queries to run for that?
```

This isn't about CRM data — it's about understanding the system. Copilot will explain:

- Which instruction files guided its behavior
- Which skill (if any) it activated
- Which MCP tool calls it made

!!! quote "The 'aha' moment"
    Most users have their first "wait, really?" moment here. Copilot isn't guessing — it's following a structured playbook defined in the `.github/skills/` and `.github/instructions/` files. The quality of the output directly reflects the quality of the instructions.

---

## What You Learned Today

| Concept | What It Means |
|---------|--------------|
| **MCP Tools** | The bridge between Copilot and your CRM data |
| **Natural language routing** | Copilot picks the right tool based on your intent |
| **Context persistence** | Follow-up questions build on previous answers |
| **Instruction-driven** | Copilot's behavior is shaped by `.github/` files you can edit |

---

## Troubleshooting Day 1

??? failure "Copilot says it can't access CRM"
    1. Is `msx-crm` running? (check `.vscode/mcp.json`)
    2. Is `az login` current? (run it again if unsure)
    3. Are you on VPN?

??? failure "Results look empty or wrong"
    Your CRM data depends on your role assignments in MSX. If you don't have active opportunities, that's normal — try:
    ```
    Show opportunities for the Contoso account.
    ```

??? failure "Copilot doesn't seem to use MCP tools"
    Try being explicit:
    ```
    Use the MSX CRM tools to check who I am.
    ```

---

[:octicons-arrow-right-16: Continue to Day 2: Read Your Pipeline](day-2-pipeline.md){ .md-button .md-button--primary }
