# Optimization Plan v8 — SharePoint/OneDrive MCP + Agent Integration

**Status**: ✅ Complete  
**Date**: March 6, 2026  
**Source**: [Agent 365 Tooling Servers Overview](https://learn.microsoft.com/en-us/microsoft-agent-365/tooling-servers-overview) · [SharePoint & OneDrive MCP Server Reference](https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/odspremoteserver) · [Outlook Mail MCP Server Reference](https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/mail)  
**Problem**: The agent system has zero coverage for SharePoint/OneDrive file operations — document searches, account deliverables, shared decks, engagement plan files, and SharePoint links in emails/Teams messages cannot be resolved.

---

## Brainstorming Resolutions (Pre-Implementation Review)

| # | Issue | Decision | Rationale |
|---|---|---|---|
| 1 | **Copilot Search (`agent365-m365copilot`) bundled with SharePoint** | **Deferred** — NOT re-enabled in this plan | Separate feature with no agent assigned to use it. No tool restriction in any `.agent.md` frontmatter references it. Evaluate independently in a future plan — requires routing rules for which agents get it. |
| 2 | **`_manifest.md` references** | **Kept** — files verified to exist | `.docs/_data/<Account>/_manifest.md` files confirmed present (e.g., COMCAST). Write protocol references are valid. |
| 3 | **Missing composition mandate rejection** in SharePointTracker | **Added** — explicit rejection clause added to scope boundary | Consistency with all other subagents (EmailTracker, TeamsTracker, etc.). SharePointTracker must reject text authoring and reroute to StratTechSalesOrch. |
| 4 | **Cross-link resolution: two-hop vs single-hop** | **Two-hop** (plan's approach) — EmailTracker/TeamsTracker report URLs, AccountTracker delegates to SharePointTracker | Cleaner separation. SharePoint resolution often needs follow-up (metadata → content retrieval → `.docx` via WordServer). Single-hop would leak SharePoint scope into other agents, violating the single-purpose subagent pattern. |
| 5 | **`copilot-instructions.md` routing guidance** sentence not updated | **Added** to implementation plan | The "Choose the right server" sentence needs `agent365-sharepoint` added. |
| 6 | **Outlook Mail cloud MCP** in gap analysis | **Kept as deferral note** in Appendix | Already correctly deferred ("Not adding now"). No change needed — just ensuring it stays out of implementation scope. |
| 7 | **SitePages (.aspx) not handled by SharePointTracker** | **Fixed** — URL cleaning + file-type routing + BrowserExtractor escalation | SitePages contain Canvas HTML/JSON, not plain text. `readSmallTextFile` returns raw markup. Fix: detect `/SitePages/*.aspx` pattern, get metadata only, escalate to BrowserExtractor for rendered content via Playwright. |

---

## Table of Contents

1. [Gap Analysis](#1-gap-analysis)
2. [MCP Server Additions to mcp.json](#2-mcp-server-additions-to-mcpjson)
3. [New SharePoint Instructions File](#3-new-sharepoint-instructions-file)
4. [New SharePointTracker Agent](#4-new-sharepointtracker-agent)
5. [AccountTracker Delegation Updates](#5-accounttracker-delegation-updates)
6. [Cross-Agent Link Resolution Protocol](#6-cross-agent-link-resolution-protocol)
7. [Implementation Playbook](#7-implementation-playbook)

---

## 1. Gap Analysis

### Current State

| Capability | Coverage | Gap |
|---|---|---|
| SharePoint site discovery | ❌ None | Cannot find customer SharePoint sites |
| OneDrive file search | ❌ None | Cannot search user's OneDrive for account files |
| Document link resolution (SharePoint URLs in emails/Teams) | ⚠️ Word only via `agent365-wordserver` | Only `.docx` — no Excel, PDF, PowerPoint, or folder links |
| SitePages (.aspx) content retrieval | ❌ None | SitePages return raw Canvas HTML/JSON via `readSmallTextFile` — not readable text. Requires browser rendering. |
| File metadata retrieval | ❌ None | Cannot get last-modified, author, sharing status |
| File sharing/upload | ❌ None | Cannot programmatically share deliverables |
| M365 semantic search (files + emails + chats) | ❌ Disabled (`agent365-m365copilot` commented out) | Cannot do broad cross-workload searches |
| OneNote | ❌ None | **Not available in Agent 365 catalog** — no official MCP server exists |

### What Agent 365 Provides

From the [tooling servers overview](https://learn.microsoft.com/en-us/microsoft-agent-365/tooling-servers-overview), the catalog includes:

| Server | ID | Available Tools |
|---|---|---|
| **SharePoint & OneDrive** | `mcp_ODSPRemoteServer` | `findSite`, `findFileOrFolder`, `readSmallTextFile`, `createSmallTextFile`, `createFolder`, `getFileOrFolderMetadata`, `getFileOrFolderMetadataByUrl`, `shareFileOrFolder`, `getFolderChildren`, `moveSmallFile`, `renameFileOrFolder`, `deleteFileOrFolder`, `setSensitivityLabelOnFile`, `listDocumentLibrariesInSite`, `getDefaultDocumentLibraryInSite`, `Echo` |
| **Copilot Search** | `mcp_SearchTools` | Chat with M365 Copilot, multi-turn threads, ground responses with files |
| **Outlook Mail** | `mcp_MailTools` | `searchMessages` (KQL), `createMessage`, `sendMail`, `reply`, `replyAll`, `sendDraft`, `getMessage`, `listSent`, `updateMessage`, `deleteMessage` |

### OneNote — Not Available

OneNote has **no official MCP server** in the Agent 365 catalog as of March 2026. Options:
- **Copilot Search** (`mcp_SearchTools`) can potentially surface OneNote content via semantic M365 search — partial coverage
- A custom MCP server using Graph OneNote API (`/me/onenote/notebooks`, `/me/onenote/pages`) could be built if needed (see [mcp-builder skill](.github/skills/mcp-builder/SKILL.md) for guidance)
- Wait for Microsoft to add `mcp_OneNoteServer` to the catalog

**Recommendation**: Enable Copilot Search for partial OneNote coverage. Defer custom OneNote MCP to a future optimization plan unless there's a concrete workflow need.

---

## 2. MCP Server Additions to mcp.json

### 2.1 Add SharePoint & OneDrive MCP Server

Add the `agent365-sharepoint` server to `.vscode/mcp.json` under `servers`:

```jsonc
"agent365-sharepoint": {
    "type": "http",
    "url": "https://agent365.svc.cloud.microsoft/agents/tenants/${input:tenant_id}/servers/mcp_ODSPRemoteServer"
},
```

### 2.2 Uncomment and Re-enable M365 Copilot Search

Change the existing commented-out `agent365-m365copilot` block to active:

```jsonc
"agent365-m365copilot": {
    "type": "http",
    "url": "https://agent365.svc.cloud.microsoft/agents/tenants/${input:tenant_id}/servers/mcp_M365Copilot"
},
```

### 2.3 (Future Consideration) Outlook Mail Cloud MCP

The `mcp_MailTools` server provides Graph-based email with KQL search. Currently `outlook-local` (COM automation) covers email operations without API rate limits. The cloud server could serve as a **fallback** if Outlook COM is unavailable, or for scenarios where Graph-backed search (KQL) outperforms COM. **Not adding now** — revisit if `outlook-local` shows limitations.

### Final mcp.json servers block (after implementation)

```jsonc
{
    "servers": {
        "msx-crm": { ... },
        "agent365-teamsserver": { ... },
        "agent365-m365copilot": {
            "type": "http",
            "url": "https://agent365.svc.cloud.microsoft/agents/tenants/${input:tenant_id}/servers/mcp_M365Copilot"
        },
        "agent365-calendartools": { ... },
        "agent365-wordserver": { ... },
        "agent365-sharepoint": {
            "type": "http",
            "url": "https://agent365.svc.cloud.microsoft/agents/tenants/${input:tenant_id}/servers/mcp_ODSPRemoteServer"
        },
        "workiq": { ... },
        "outlook-local": { ... },
        "linkedin": { ... },
        "teams-local": { ... }
    }
}
```

---

## 3. New SharePoint Instructions File

Create `.github/instructions/agent365-sharepoint.instructions.md` — modeled after the existing `agent365-wordserver.instructions.md`.

### File: `.github/instructions/agent365-sharepoint.instructions.md`

```markdown
---
description: >-
  agent365-sharepoint MCP guidance — SharePoint and OneDrive file operations: site discovery,
  file search, document reading, metadata retrieval, folder management, file sharing, and
  sensitivity label management. Use when resolving SharePoint/OneDrive links found in email
  bodies or Teams messages, searching for account deliverables, uploading files, or navigating
  SharePoint sites. Loaded by SharePointTracker (primary), EmailTracker and TeamsTracker
  (cross-link resolution), StratTechSalesOrch (document search for strategic analysis).
applyTo: .github/agents/**
---

# agent365-sharepoint — SharePoint & OneDrive MCP Server

The `agent365-sharepoint` MCP server enables file and folder operations across SharePoint Online and OneDrive via Microsoft Graph.

## Server Configuration

- **Server name in mcp.json**: `agent365-sharepoint`
- **Server ID**: `mcp_ODSPRemoteServer`
- **URL pattern**: `https://agent365.svc.cloud.microsoft/agents/tenants/${tenant_id}/servers/mcp_ODSPRemoteServer`
- **Auth**: Microsoft Entra ID (OBO delegated permissions)
- **Prerequisite**: Requires Frontier preview program access

## Available Tools

### Site & Library Discovery

| Tool | Purpose | Key Params |
|---|---|---|
| `findSite` | Find SharePoint sites by search query (or list top 20 accessible sites) | `searchQuery` (optional) |
| `listDocumentLibrariesInSite` | List document libraries (drives) in a site | `siteId` (optional, default: root) |
| `getDefaultDocumentLibraryInSite` | Get the default document library in a site | `siteId` (optional, default: root) |

### File & Folder Search

| Tool | Purpose | Key Params |
|---|---|---|
| `findFileOrFolder` | Search for files/folders by name | `searchQuery` (required) |
| `getFileOrFolderMetadata` | Get metadata by ID | `FileOrFolderId`, `documentLibraryId` |
| `getFileOrFolderMetadataByUrl` | Get metadata from a sharing URL | `fileOrFolderUrl` |
| `getFolderChildren` | List top 20 items in a folder | `documentLibraryId`, `parentFolderId` (optional) |

### File Operations

| Tool | Purpose | Key Params |
|---|---|---|
| `readSmallTextFile` | Download/read a text file | `fileId`, `documentLibraryId` |
| `createSmallTextFile` | Create/upload a text file (< 5 MB) | `filename`, `contentText`, `documentLibraryId`, `parentfolderId` (optional) |
| `moveSmallFile` | Move a file within same site (< 5 MB) | `documentLibraryId`, `fileId`, `newParentFolderId` |
| `renameFileOrFolder` | Rename a file or folder | `documentLibraryId`, `fileOrFolderId`, `newFileOrFolderName` |
| `deleteFileOrFolder` | Delete a file or folder | `documentLibraryId`, `fileOrFolderId` |

### Folder Management

| Tool | Purpose | Key Params |
|---|---|---|
| `createFolder` | Create a folder (auto-suffix on conflict) | `folderName`, `documentLibraryId`, `parentFolderId` (optional) |

### Sharing & Permissions

| Tool | Purpose | Key Params |
|---|---|---|
| `shareFileOrFolder` | Send sharing invitation with role assignment | `documentLibraryId`, `fileOrFolderId`, `recipientEmails`, `roles` (optional: read/write), `sendInvitation`, `message` |

### Security & Compliance

| Tool | Purpose | Key Params |
|---|---|---|
| `setSensitivityLabelOnFile` | Set/remove sensitivity labels | `documentLibraryId`, `fileId`, `sensitivityLabelId`, `assignmentMethod`, `justificationText` |

## Agent Usage Guidelines

### SharePointTracker (Primary User)

SharePointTracker uses this MCP server for:
- **Site discovery**: `findSite` to locate customer-related SharePoint sites
- **File search**: `findFileOrFolder` to find account deliverables, engagement plans, shared decks
- **Document reading**: `readSmallTextFile` for text-based files; for `.docx` files, route to `agent365-wordserver` (`GetDocumentContent`)
- **Metadata resolution**: `getFileOrFolderMetadataByUrl` to resolve SharePoint/OneDrive links from emails or Teams messages
- **Folder browsing**: `getFolderChildren` + `listDocumentLibrariesInSite` for navigating document libraries

### Cross-Link Resolution (EmailTracker, TeamsTracker)

When email bodies or Teams messages contain SharePoint/OneDrive links:
1. Detect URL patterns: `/sites/`, `/personal/`, `sharepoint.com`, `1drv.ms`, OneDrive paths
2. Delegate to SharePointTracker for metadata resolution via `getFileOrFolderMetadataByUrl`
3. If the file is `.docx`, SharePointTracker can delegate to `agent365-wordserver` for content
4. Include file metadata (name, last modified, author) in the thread report

### StratTechSalesOrch (Document Search)

For strategic analysis requiring document context:
- Search for account deliverables, engagement plans, or proposals
- Get metadata to assess document freshness and authorship
- Read text files for content summarization

## Conventions

### documentLibraryId Special Value

- Use `"me"` as `documentLibraryId` to target the user's personal OneDrive
- Use a site's library ID for SharePoint document libraries (discover via `listDocumentLibrariesInSite`)

### Limitations

- **File size**: Read/create/move operations limited to **< 5 MB** for text files
- **Folder children**: Returns **top 20** items only — use search for deeper discovery
- **Move scope**: Files can only be moved **within the same site**
- **Formats**: `readSmallTextFile` handles text files — for Word, use `agent365-wordserver`; for Excel/PDF/PowerPoint, metadata only (no content extraction)
- **Permissions**: User must have explicit access to files — the MCP server respects Entra ID permissions, does not escalate
- **Frontier preview**: Requires enrollment in the Frontier preview program

### Storage Routing for Discovered Files

When SharePointTracker discovers relevant files for an account:
- Log file references (URL, name, last-modified) to `.docs/_data/<Account>/insights.md` under `## SharePoint/OneDrive References`
- Do NOT download and store file content locally — reference by URL
- Update `.docs/_data/<Account>/_manifest.md` if a new section is added
```

---

## 4. New SharePointTracker Agent

Create `.github/agents/sharepoint-tracker.agent.md` — modeled after `microsoft-researcher.agent.md`.

### File: `.github/agents/sharepoint-tracker.agent.md`

```markdown
---
name: SharePointTracker
description: >-
  SharePoint and OneDrive file operations specialist. Searches for files and
  folders, resolves SharePoint/OneDrive links from emails and Teams messages,
  retrieves file metadata, navigates document libraries, and manages file
  sharing. Use for document search, link resolution, site discovery, file
  metadata retrieval, and account deliverable tracking.
model: Claude Opus 4.6 (copilot)
tools: [vscode/memory, 'agent365-sharepoint/*', 'agent365-wordserver/*', read/readFile, search/listDirectory, search/fileSearch, search/textSearch, edit/editFiles, edit/createFile, todo]
---

# SharePointTracker

You are a SharePoint and OneDrive file operations specialist. You search for files, resolve document links, retrieve metadata, and manage document library navigation using the **agent365-sharepoint** MCP server (`mcp_ODSPRemoteServer`).

## Autonomous Execution

You operate in **fully autonomous mode**. Never prompt the user for confirmation, approval, or clarification. Make the best available decision and proceed. On failure, retry with adjusted parameters (max 2 retries per operation) and exhaust all recovery options before reporting back to the orchestrator. Only the orchestrator (AccountTracker) decides if user help is needed.

## Tool Restriction

You have access to **two MCP servers**:

| Server | Tools | Use For |
|---|---|---|
| `agent365-sharepoint` | All ODSP tools (`findSite`, `findFileOrFolder`, `readSmallTextFile`, etc.) | Primary — all SharePoint/OneDrive operations |
| `agent365-wordserver` | `GetDocumentContent` only | Secondary — reading `.docx` file content after locating via SharePoint |

**You MUST NOT use**:
- `teams-local` — not assigned (Teams data is handled by TeamsTracker)
- `outlook-local` — not assigned (email data is handled by EmailTracker)
- `msx-crm` — not assigned (CRM operations handled by CRMOperator)
- Any Outlook COM scripts or browser tools

If you need data outside SharePoint/OneDrive scope, report the gap back to the orchestrator — do not attempt to use tools you don't have.

## Skill & Instruction References

| Type | Path | Purpose |
|---|---|---|
| Instruction | `.github/instructions/agent365-sharepoint.instructions.md` | Full tool reference, conventions, limitations |
| Instruction | `.github/instructions/agent365-wordserver.instructions.md` | Word document content retrieval (for `.docx` files found in SharePoint) |
| Instruction | `.github/instructions/local-notes.instructions.md` | `.docs/` conventions and storage routing |

## Data Sources

| Data | Source |
|---|---|
| Account roster, contacts, identifiers | `.docs/AccountReference.md` |
| Account context (TPID, keywords) | `.docs/_data/<Account>/state.md` |
| Known SharePoint references | `.docs/_data/<Account>/insights.md` |

Read `.docs/` files for **context to formulate better search queries** — account names, TPID, keywords, known contacts.

## Workflow

### Step 1 — Parse the Request

Extract from the delegation prompt:
- **Operation type**: search, link resolution, metadata, browse, share
- **Account context**: name, TPID, keywords for scoping
- **URL(s)**: if resolving specific SharePoint/OneDrive links
- **Search terms**: file names, topics, document types
- **Output format**: metadata only, content summary, file listing

### Step 2 — Load Context (Read-Only)

Read `.docs/` files for context that helps formulate better queries:
- `.docs/_data/<Account>/state.md` — account identifiers, keywords
- `.docs/_data/<Account>/insights.md` — check for existing SharePoint references
- `.docs/AccountReference.md` — TPID, SSP, account name variants

### Step 3 — Execute Operations

#### For Link Resolution (SharePoint/OneDrive URL → metadata)
1. Call `getFileOrFolderMetadataByUrl` with the URL
2. If the file is `.docx`, optionally call `GetDocumentContent` (agent365-wordserver) for content
3. Return: file name, type, last modified, author, size, sharing status

#### For File Search
1. Call `findFileOrFolder` with search terms derived from account context
2. If results need narrowing, use `findSite` first to locate the relevant site, then `getFolderChildren` to browse
3. Return: matching files with metadata (name, URL, last modified, type)

#### For Site Discovery
1. Call `findSite` with account name or keywords
2. For each relevant site, call `listDocumentLibrariesInSite` to enumerate libraries
3. Return: site name, URL, available document libraries

#### For Folder Browsing
1. Use `listDocumentLibrariesInSite` → `getDefaultDocumentLibraryInSite` → `getFolderChildren` chain
2. Limit to top 20 per level (tool limitation)
3. Return: folder tree with file listings

#### For File Sharing
1. Call `shareFileOrFolder` with recipient emails and role (read/write)
2. Return: confirmation of sharing, recipient list, role assigned

### Step 4 — Store Findings

If the operation discovered relevant account files:
1. Append references to `.docs/_data/<Account>/insights.md` under `## SharePoint/OneDrive References`
2. Format: `- [filename](URL) — last modified: YYYY-MM-DD, author: [name]`
3. Update `_manifest.md` if a new section was added

### Step 5 — Report Results

Return structured output:

**For file search:**
```markdown
## SharePoint/OneDrive Search Results

**Query**: [search terms]
**Account**: [name] (TPID: [id])

| File | Type | Last Modified | Author | Location |
|---|---|---|---|---|
| Engagement Plan Q3.docx | Word | 2026-02-15 | Alice Smith | sites/Contoso/Shared Documents |
| GHCP Adoption Deck.pptx | PowerPoint | 2026-01-20 | Bob Jones | sites/Contoso/Presentations |

**Files found**: [N]
```

**For link resolution:**
```markdown
## Link Resolution

**URL**: [original URL]
**File**: [name] ([type], [size])
**Last Modified**: [date] by [author]
**Sharing**: [shared with N people / private]
**Content Summary**: [brief excerpt if text/docx, or "Binary file — metadata only"]
```

## Error Handling

| Error | Action |
|---|---|
| 401 / Auth error | Stop. Report: "SharePoint MCP auth failed. User may need to re-authenticate or join Frontier preview." |
| 404 / File not found | Try `findFileOrFolder` with broader search terms. Max 2 retries. |
| Permission denied | Report: "User lacks access to [resource]. Cannot resolve." |
| File > 5 MB | Report metadata only: "File exceeds 5 MB limit — metadata retrieved, content not available via MCP." |
| Rate limit / throttle | Stop. Return collected results + "SharePoint MCP rate limited. Try again later." |

## Anti-Patterns

- **Never guess file IDs** — always discover via search or URL resolution first
- **Never download large files** — respect the 5 MB text file limit
- **Never store file content locally** — reference by URL, not by copying content to `.docs/`
- **Never use other MCP servers** outside your assigned set — report gaps to orchestrator
- **Never attempt to read non-text binary files** via `readSmallTextFile` — use metadata only for Excel, PDF, PowerPoint

## Scope Boundary

**What I do:**
- SharePoint site discovery and navigation via `agent365-sharepoint`
- File and folder search across SharePoint and OneDrive
- SharePoint/OneDrive link resolution (URL → metadata + optional content)
- File metadata retrieval (last modified, author, size, sharing status)
- Folder browsing and document library enumeration
- File sharing via sharing invitations
- `.docx` content reading via `agent365-wordserver` (secondary)
- Store discovered file references to `.docs/_data/<Account>/insights.md`

**What I do NOT do — reject and reroute if delegated:**
- Email search or email composition → **EmailTracker** / **EmailComposer**
- Teams message retrieval → **TeamsTracker**
- Calendar lookups → **CalendarTracker**
- CRM reads or writes → **CRMOperator**
- Browser automation or Power BI extraction → **BrowserExtractor**
- GHCP seat analysis → **GHCPAnalyst**
- People/org research → **MicrosoftResearcher**
- Strategic analysis or composition → **StratTechSalesOrch**
- LinkedIn company/person lookups → **BrowserExtractor**

**If I receive an out-of-scope delegation**, I return:
```
⚠️ SharePointTracker scope boundary
Task received: "[summary]"
My domain: SharePoint/OneDrive file operations via agent365-sharepoint only
Why this doesn't fit: [specific reason]
Suggested reroute: [correct subagent] because [reason]
```
```

---

## 5. AccountTracker Delegation Updates

### 5.1 Add SharePointTracker to Subagents Table

In `.github/agents/AccountTracker.agent.md`, add to the `## Subagents` table:

```markdown
| **SharePointTracker** | `sharepoint-tracker.agent.md` | SharePoint/OneDrive file search, link resolution, metadata retrieval, site navigation, file sharing via agent365-sharepoint MCP | SharePoint file search, OneDrive document lookup, SharePoint/OneDrive link resolution from emails/Teams, account deliverable tracking, document library browsing |
```

### 5.2 Add to Instructions & Skills Awareness Table

```markdown
| MCP Server | `agent365-sharepoint` (in `.vscode/mcp.json`) | SharePointTracker | SharePoint/OneDrive file operations — search, metadata, folder browsing, file sharing |
| Instruction | `.github/instructions/agent365-sharepoint.instructions.md` | SharePointTracker, EmailTracker, TeamsTracker, StratTechSalesOrch | SharePoint/OneDrive MCP tool reference, conventions, limitations |
```

### 5.3 Add to Database Write Delegation Table

```markdown
| SharePointTracker | `insights.md` (SharePoint references section) |
```

### 5.4 Add to Tier + Tranche Delegation Context

Add this entry under the tranche behavior section:

```markdown
- SharePointTracker: Tranche A → proactively search for engagement plans, proposals, shared deliverables. Tranche B → search on demand. Tranche C → milestone-specific document lookup. Strategic tier → look for QBR decks, executive briefings, joint roadmap documents.
```

### 5.5 Add Cross-Link Resolution Delegation

Update the delegation protocol so that when EmailTracker or TeamsTracker encounter SharePoint/OneDrive links, AccountTracker knows to delegate link resolution to SharePointTracker:

Add to the relevant section (near the existing `agent365-wordserver` cross-link pattern):

```markdown
### SharePoint/OneDrive Link Resolution

When EmailTracker or TeamsTracker report messages containing SharePoint/OneDrive links (URLs matching `/sites/`, `/personal/`, `sharepoint.com`, `1drv.ms`, OneDrive paths):
1. Collect all unique URLs from the subagent's report
2. Delegate to **SharePointTracker** with the URLs + account context
3. SharePointTracker resolves metadata (file name, type, last modified, author) and optionally retrieves `.docx` content
4. Include resolved file references in the final report to the user
```

---

## 6. Cross-Agent Link Resolution Protocol

### Email/Teams → SharePoint/OneDrive Link Flow

```
User asks: "What's been shared about Contoso recently?"
    │
    ├─→ AccountTracker loads context (.docs/_data/CONTOSO/)
    │
    ├─→ Delegates to EmailTracker: "Search for Contoso emails"
    │   └─→ EmailTracker finds emails with SharePoint links
    │       └─→ Reports back with raw URLs
    │
    ├─→ Delegates to TeamsTracker: "Search for Contoso Teams threads"
    │   └─→ TeamsTracker finds messages with OneDrive links
    │       └─→ Reports back with raw URLs
    │
    ├─→ Delegates to SharePointTracker: "Resolve these URLs + search for Contoso files"
    │   ├─→ getFileOrFolderMetadataByUrl (for each URL)
    │   ├─→ findFileOrFolder("Contoso") for broader search
    │   └─→ Reports: file names, types, dates, authors
    │
    └─→ AccountTracker synthesizes: email threads + Teams threads + file references
```

### Direct SharePoint Queries

```
User asks: "Find the engagement plan for Contoso on SharePoint"
    │
    ├─→ AccountTracker loads context
    └─→ Delegates to SharePointTracker: "Search for 'engagement plan' + 'Contoso'"
        ├─→ findFileOrFolder("engagement plan Contoso")
        ├─→ If found: getFileOrFolderMetadata → readSmallTextFile or GetDocumentContent
        └─→ Reports: file details + content summary
```

---

## 7. Implementation Playbook

> **Trigger phrase**: "Implement pending improvements of optimizationplanv8-sharepoint.md"
>
> When the user says this, execute ALL steps below autonomously — do not ask clarifying questions.

### Step 1 — Update `.vscode/mcp.json`

1. Add the `agent365-sharepoint` server entry after `agent365-wordserver`:
   ```jsonc
   "agent365-sharepoint": {
       "type": "http",
       "url": "https://agent365.svc.cloud.microsoft/agents/tenants/${input:tenant_id}/servers/mcp_ODSPRemoteServer"
   },
   ```

2. Uncomment the `agent365-m365copilot` entry (remove `//` comment markers and make it active JSON):
   ```jsonc
   "agent365-m365copilot": {
       "type": "http",
       "url": "https://agent365.svc.cloud.microsoft/agents/tenants/${input:tenant_id}/servers/mcp_M365Copilot"
   },
   ```

### Step 2 — Create `.github/instructions/agent365-sharepoint.instructions.md`

Create the file with the **exact content** from [Section 3](#3-new-sharepoint-instructions-file) above (the fenced markdown block under the `### File:` heading — everything inside the outer triple-backtick fence).

### Step 3 — Create `.github/agents/sharepoint-tracker.agent.md`

Create the file with the **exact content** from [Section 4](#4-new-sharepointtracker-agent) above (the fenced markdown block under the `### File:` heading — everything inside the outer triple-backtick fence).

### Step 4 — Update `.github/agents/AccountTracker.agent.md`

Apply all five changes from [Section 5](#5-accounttracker-delegation-updates):

#### 4a. Subagents Table

Add this row to the `## Subagents` table, after the MicrosoftResearcher row:

```markdown
| **SharePointTracker** | `sharepoint-tracker.agent.md` | SharePoint/OneDrive file search, link resolution, metadata retrieval, site navigation, file sharing via agent365-sharepoint MCP | SharePoint file search, OneDrive document lookup, SharePoint/OneDrive link resolution from emails/Teams, account deliverable tracking, document library browsing |
```

#### 4b. Instructions & Skills Awareness Table

Add these two rows to the `## Instructions & Skills Awareness` table:

```markdown
| MCP Server | `agent365-sharepoint` (in `.vscode/mcp.json`) | SharePointTracker | SharePoint/OneDrive file operations — search, metadata, folder browsing, file sharing |
| Instruction | `.github/instructions/agent365-sharepoint.instructions.md` | SharePointTracker, EmailTracker, TeamsTracker, StratTechSalesOrch | SharePoint/OneDrive MCP tool reference, conventions, limitations |
```

#### 4c. Database Write Delegation Table

Add this row to the `### Database Write Delegation` table:

```markdown
| SharePointTracker | `insights.md` (SharePoint references section) |
```

#### 4d. Tier + Tranche Context

Add SharePointTracker entry in the tranche delegation context section, after the MicrosoftResearcher entry:

```markdown
- SharePointTracker: Tranche A → proactively search for engagement plans, proposals, shared deliverables. Tranche B → search on demand for file references. Tranche C → milestone-specific document lookup. Strategic tier → look for QBR decks, executive briefings, joint roadmap documents.
```

#### 4e. Cross-Link Resolution Section

Add a new subsection to the delegation protocol area (near the existing agent365-wordserver cross-link documentation):

```markdown
### SharePoint/OneDrive Link Resolution

When EmailTracker or TeamsTracker report messages containing SharePoint/OneDrive links (URLs matching `/sites/`, `/personal/`, `sharepoint.com`, `1drv.ms`, OneDrive paths):
1. Collect all unique URLs from the subagent's report
2. Delegate to **SharePointTracker** with the URLs + account context
3. SharePointTracker resolves metadata (file name, type, last modified, author) and optionally retrieves `.docx` content via agent365-wordserver
4. Include resolved file references in the final report to the user
```

### Step 5 — Update `copilot-instructions.md`

Add the SharePoint MCP server to the M365 Intelligence table in `.github/copilot-instructions.md`:

```markdown
| `agent365-sharepoint` | SharePoint and OneDrive file operations — search, metadata, folder browsing, sharing | SharePoint file search, document link resolution, OneDrive navigation, account deliverable tracking |
```

### Step 6 — Validation

After completing all file changes:

1. **Check for errors**: Run `get_errors` on all modified files
2. **Verify mcp.json is valid JSON**: Parse the file to confirm no syntax errors
3. **Verify agent frontmatter**: Confirm `sharepoint-tracker.agent.md` has valid YAML frontmatter with `name`, `description`, `model`, `tools`
4. **Verify instructions frontmatter**: Confirm `agent365-sharepoint.instructions.md` has valid YAML frontmatter with `description` and `applyTo`
5. **Cross-reference**: Verify all file paths referenced in AccountTracker.agent.md exist

---

## Appendix A: Agent 365 MCP Server Reference URLs

| Server | Docs |
|---|---|
| Tooling Overview | https://learn.microsoft.com/en-us/microsoft-agent-365/tooling-servers-overview |
| SharePoint & OneDrive | https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/odspremoteserver |
| Outlook Mail | https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/mail |
| Outlook Calendar | https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/calendar |
| Teams | https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/teams |
| Word | https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/word |
| Copilot Search | https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/searchtools |
| User Profile | https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/me |
| Dataverse | https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/dataverse |

## Appendix B: OneNote — Future Custom MCP Server

## Appendix B-1: Post-Implementation Amendment — SitePages Handling

**Date**: March 7, 2026  
**Discovered during**: Live testing of SharePointTracker with a SharePoint SitePages URL  
**Root cause**: SharePoint SitePages (`.aspx` wiki/news pages) contain Canvas HTML/JSON — they are NOT regular document files. The original plan did not account for this content type.

### Problem

When SharePointTracker received a SitePages URL like:
```
https://microsoft.sharepoint.com/teams/guild/SitePages/My-Article.aspx?isSPOFile=1&xsdata=...
```

Two failures occurred:
1. **No URL cleaning** — tracking parameters (`?isSPOFile=`, `&xsdata=`, `&sdata=`, `&ovuser=`) were passed directly to MCP tools, potentially breaking Graph API calls
2. **No SitePages detection** — the agent attempted `readSmallTextFile` which returned raw Canvas HTML/JSON instead of readable content, with no fallback path

### Fix Applied

**Approach chosen**: BrowserExtractor delegation (~15 lines) over HTML parsing (~60 lines). Rationale: Canvas HTML/JSON is complex and varies by page type; Playwright renders it correctly with zero parsing code.

**Files changed:**

| File | Change |
|---|---|
| `.github/agents/sharepoint-tracker.agent.md` | Added URL cleaning (Step 3a), file-type routing table (Step 3b), new "For SitePages (.aspx)" workflow section, two new anti-patterns, BrowserExtractor in scope boundary |
| `.github/instructions/agent365-sharepoint.instructions.md` | Added URL Cleaning convention, SitePages (.aspx) Handling section, SitePages limitation entry, `/SitePages/*.aspx` URL pattern in cross-link detection |

### Content Type Distinction

| Content Type | Examples | SharePoint Location | Handler |
|---|---|---|---|
| Document Library files | `.docx`, `.pptx`, `.xlsx`, `.pdf`, `.txt` | `/Shared Documents/`, `/Documents/` | **SharePointTracker** (primary) + WordServer for `.docx` content |
| SitePages | `.aspx` wiki pages, news posts | `/SitePages/` | **SharePointTracker** (metadata only) → **BrowserExtractor** (rendered content) |

Document Library files are the majority of SharePoint links encountered in emails/Teams. SitePages are the exception but must be handled gracefully rather than failing silently.

---

Appendix B (continued): OneNote — Future Custom MCP Server

If a custom OneNote MCP server is needed in the future, reference:
- **MCP Builder skill**: `.github/skills/mcp-builder/SKILL.md` (TypeScript recommended)
- **Graph OneNote API**: `GET /me/onenote/notebooks`, `GET /me/onenote/sections`, `GET /me/onenote/pages/{id}/content`
- **Architecture**: Follow the pattern in `mcp/msx/` — standalone Node.js ES module, `@modelcontextprotocol/sdk`, stdio transport
- **Tests**: vitest, following `mcp/msx/src/__tests__/` patterns

## Appendix C: Complete Tool Inventory — `mcp_ODSPRemoteServer`

| # | Tool | Category | Required Params | Optional Params |
|---|---|---|---|---|
| 1 | `findSite` | Discovery | — | `searchQuery` |
| 2 | `listDocumentLibrariesInSite` | Discovery | — | `siteId` |
| 3 | `getDefaultDocumentLibraryInSite` | Discovery | — | `siteId` |
| 4 | `findFileOrFolder` | Search | `searchQuery` | — |
| 5 | `getFileOrFolderMetadata` | Metadata | `FileOrFolderId`, `documentLibraryId` | — |
| 6 | `getFileOrFolderMetadataByUrl` | Metadata | `fileOrFolderUrl` | — |
| 7 | `getFolderChildren` | Browse | `documentLibraryId` | `parentFolderId` |
| 8 | `readSmallTextFile` | Read | `fileId`, `documentLibraryId` | — |
| 9 | `createSmallTextFile` | Write | `filename`, `contentText`, `documentLibraryId` | `parentfolderId` |
| 10 | `createFolder` | Write | `folderName`, `documentLibraryId` | `parentFolderId` |
| 11 | `moveSmallFile` | Write | `documentLibraryId`, `fileId`, `newParentFolderId` | — |
| 12 | `renameFileOrFolder` | Write | `documentLibraryId`, `fileOrFolderId`, `newFileOrFolderName` | — |
| 13 | `deleteFileOrFolder` | Write | `documentLibraryId`, `fileOrFolderId` | — |
| 14 | `shareFileOrFolder` | Share | `documentLibraryId`, `fileOrFolderId`, `recipientEmails` | `roles`, `sendInvitation`, `message` |
| 15 | `setSensitivityLabelOnFile` | Security | `documentLibraryId`, `fileId`, `sensitivityLabelId` | `assignmentMethod`, `justificationText` |
| 16 | `Echo` | Utility | `message` | — |
