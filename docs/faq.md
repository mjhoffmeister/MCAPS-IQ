# Frequently Asked Questions

**Do I need to know how to code?**
No. The primary interface is the Copilot chat window — you type in plain English and Copilot does the rest. The code in this repo powers the tools behind the scenes.

**Is it safe to use? Will it change my CRM data without asking?**
No write operation happens without your explicit approval. Every create, update, or close action shows you a confirmation prompt first. See [Write Operations & Safety](write-safety.md) for details.

**What if I don't have an Obsidian vault?**
Everything works fine without it. Obsidian integration is entirely optional. See [Obsidian Setup](obsidian-setup.md) if you want to enable it later.

**Can I use this outside VS Code?**
Yes — [GitHub Copilot CLI](https://github.com/features/copilot/cli/) is a fully supported alternative that runs the same MCP tools, agents, and skills directly in your terminal. Install with `brew install copilot-cli` and run from the repo root. See [Copilot CLI guide](copilot-cli.md) for details. The MCP servers also work with any other MCP-compatible client.

**How do I write a good skill or instruction file?**
See [skill-authoring-best-practices/SKILL.md](../.github/skills/skill-authoring-best-practices/SKILL.md) for a full checklist. The short version: keep the `description` keyword-rich so Copilot finds it, structure the body as a step-by-step workflow, and don't exceed ~150 lines per file.

**I edited a file in `.github/` but Copilot doesn't seem to use it.**
Check the `description` field in the YAML frontmatter — Copilot matches against those keywords. If the description doesn't overlap with how you phrase your request, it won't load. Try adding more trigger phrases to the description.

**What if `az login` fails or my token expires?**
Run `az login` again. The MCP server uses Azure CLI tokens, so keeping your session active is all you need.

**Something not working?**
Run the environment check from the VS Code Command Palette: `Cmd+Shift+P` → `Tasks: Run Task` → `Setup: Check Environment`. It will tell you exactly what's missing.
