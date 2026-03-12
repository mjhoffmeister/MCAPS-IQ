# Power BI Analytics

The **Power BI Remote MCP** connects Copilot to your Power BI semantic models so you can pull ACR telemetry, incentive baselines, consumption scorecards, and pipeline analytics — all from the chat window. No DAX knowledge required.

> **Don't have Power BI access?** No problem — everything else works without it. Power BI is a read-only analytics layer that supplements CRM data.

---

## How to Enable It

1. **Start the server** — open `.vscode/mcp.json` in VS Code and click **Start** on `powerbi-remote`. It connects to the Fabric API directly — no local build needed.
2. **Sign in** — Power BI uses your Azure CLI session. Make sure `az login` is current (same as CRM auth).

---

## Creating a Power BI Prompt (The Guided Path)

Power BI workflows are packaged as **prompt files** (`.github/prompts/pbi-*.prompt.md`). Each prompt is a self-contained, repeatable workflow that pulls specific data from a semantic model and produces a formatted report.

You don't need to know DAX or the model schema — the **pbi-prompt-builder** skill walks you through it interactively:

1. **Start the builder** — ask Copilot:

   ```
   I want to build a Power BI prompt to track my gap to target across my Azure accounts.
   ```

   (Or: `Build me a PBI prompt`, `Create a Power BI report prompt`, `What data can I pull from Power BI?`)

2. **Answer a few questions** — the skill asks what questions you want answered, which semantic model to use (it can discover available models for you), and where your account list lives.

3. **Review the schema mapping** — Copilot shows you which tables and measures map to your questions, and flags anything the model can't answer.

4. **Validate with live data** — Copilot generates DAX queries, runs them against your model, and shows sample results. You iterate until the data looks right.

5. **Get a ready-to-use prompt** — the skill outputs a `pbi-*.prompt.md` file in `.github/prompts/` that you can run immediately.

---

## Using a Power BI Prompt

Once a prompt exists, there are two ways to run it:

- **Slash command (VS Code only)** — type `/` in the VS Code Copilot chat panel and select the prompt from the menu (e.g., `/pbi-azure-portfolio-review`)
- **Natural language (any client)** — just describe what you want. Copilot matches your request to the prompt's `description` keywords automatically. In Copilot CLI, you can also paste the prompt content directly from `.github/prompts/`:

  ```
  Run my Azure portfolio review.
  Which of my accounts qualify for the GHCP New Logo incentive?
  ```

The prompt handles auth pre-checks, DAX execution, business-rule application, and report formatting — you just read the output.

---

## Customizing Prompts for Your Team

Every PBI prompt has a **Configuration** table at the top with the semantic model ID, account roster path, and business rules. Managers can fork a prompt and swap these values without touching DAX or workflow logic:

```markdown
| Setting | Value | Notes |
|---|---|---|
| **Semantic Model ID** | `726c8fed-...` | Change to your team's model |
| **Account Roster** | `.docs/AccountReference.md` | Point to your account list |
```

---

## Included Prompts

Two PBI prompts ship out of the box:

| Prompt | What it does |
|---|---|
| `/pbi-azure-portfolio-review` | ACR actuals vs. budget, pipeline conversion ranking, and recommended next actions across your Azure accounts |
| `/pbi-ghcp-new-logo-incentive` | Evaluates tracked accounts against GHCP New Logo Growth Incentive eligibility and qualifying thresholds |
