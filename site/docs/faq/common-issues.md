---
title: Common Issues
description: Detailed solutions for frequently encountered problems.
tags:
  - faq
  - troubleshooting
---

# Common Issues

Detailed solutions organized by category.

---

## Authentication

### Token Expired Mid-Session

**Symptom:** Things were working, then suddenly authentication errors.

**Cause:** Azure CLI tokens expire after ~1 hour.

**Fix:** Run `az login` again. You don't need to restart MCP servers — they'll pick up the new token automatically.

### Wrong Tenant

**Symptom:** Authenticated but CRM returns "access denied" or no data.

**Fix:**
```bash
az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
```

### CRM Token Test

Verify CRM access directly:
```bash
az account get-access-token --resource https://microsoftsales.crm.dynamics.com
```

If this fails, the problem is Azure auth, not the MCP server.

---

## MCP Servers

### Server Starts but Shows 0 Tools

**Cause:** Auth failure during tool registration.

**Fix:**
1. Verify Azure login
2. Stop and restart the server in `.vscode/mcp.json`

### WorkIQ Not Available

**Cause:** WorkIQ requires the `@microsoft/workiq` package and may not be available in all regions.

**Fix:** This is optional — everything else works without it.

### PowerBI Server Fails

**Cause:** Usually authentication or Fabric API access.

**Fix:** Verify `az login` is current and you have Power BI access in your tenant.

---

## Copilot Behavior

### Skills Don't Activate

**Cause:** The prompt doesn't match the skill's `description` keywords strongly enough.

**Fix:** Either:
- Add more trigger phrases to the skill's `description`
- Be more explicit in your prompt: _"Run the milestone health review skill"_

### Copilot Uses Generic Knowledge Instead of MCP

**Cause:** Copilot decided MCP tools weren't relevant for your prompt.

**Fix:** Be explicit about wanting CRM data:
```
Use the MSX CRM tools to show me my active opportunities.
```

### Responses Are Too Long/Short

**Fix:** Edit `.github/copilot-instructions.md` and adjust the response style section.

---

## Environment

### Node.js Version Mismatch

**Required:** Node.js 18+

```bash
node --version    # Check current
brew upgrade node # Upgrade (macOS)
```

### npm Permission Errors

```bash
sudo chown -R $(whoami) ~/.npm
```

### PowerShell Execution Policy (Windows)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
