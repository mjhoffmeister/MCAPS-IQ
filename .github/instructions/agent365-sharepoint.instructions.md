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
1. Detect URL patterns: `/sites/`, `/personal/`, `sharepoint.com`, `1drv.ms`, OneDrive paths, `/SitePages/*.aspx`
2. Report raw URLs back to AccountTracker for delegation to SharePointTracker
3. SharePointTracker resolves metadata via `getFileOrFolderMetadataByUrl`
4. If the file is `.docx`, SharePointTracker delegates to `agent365-wordserver` for content
5. Include file metadata (name, last modified, author) in the thread report

### StratTechSalesOrch (Document Search)

For strategic analysis requiring document context:
- Search for account deliverables, engagement plans, or proposals
- Get metadata to assess document freshness and authorship
- Read text files for content summarization

## Conventions

### URL Cleaning (Required Before Any Tool Call)

SharePoint/OneDrive URLs shared via Teams or email contain tracking parameters that may break Graph API calls. **Always strip query parameters** before passing URLs to any MCP tool:

- Strip from `?` onward: `?isSPOFile=`, `&xsdata=`, `&sdata=`, `&ovuser=`, `&clickparams=`, `?csf=`, `?web=`
- Keep only the canonical path: `https://<tenant>.sharepoint.com/sites/<site>/.../<filename>`

### SitePages (.aspx) Handling

SharePoint SitePages (wiki pages, news posts) are `.aspx` files stored in the `Site Pages` library. They contain **Canvas HTML/JSON** — not plain text.

**Key facts:**
- URL pattern: `https://<tenant>.sharepoint.com/<teams|sites>/<name>/SitePages/<page>.aspx`
- `readSmallTextFile` returns raw HTML/Canvas JSON markup — **not useful** as readable content
- `getFileOrFolderMetadataByUrl` works normally — returns title, author, last modified, size
- **Rendered content extraction requires Playwright** (BrowserExtractor agent) — the SharePoint MCP cannot render SitePages

**Workflow for SitePages:**
1. Clean the URL (strip tracking params)
2. Call `getFileOrFolderMetadataByUrl` for metadata only
3. Do NOT call `readSmallTextFile`
4. Report metadata + escalation recommendation: "SitePages content requires BrowserExtractor for rendered text"

### documentLibraryId Special Value

- Use `"me"` as `documentLibraryId` to target the user's personal OneDrive
- Use a site's library ID for SharePoint document libraries (discover via `listDocumentLibrariesInSite`)

### Limitations

- **File size**: Read/create/move operations limited to **< 5 MB** for text files
- **Folder children**: Returns **top 20** items only — use search for deeper discovery
- **Move scope**: Files can only be moved **within the same site**
- **Formats**: `readSmallTextFile` handles text files — for Word, use `agent365-wordserver`; for Excel/PDF/PowerPoint, metadata only (no content extraction)
- **SitePages**: `.aspx` pages (in `/SitePages/`) return raw Canvas HTML/JSON via `readSmallTextFile` — not rendered text. Use metadata only; delegate rendered content to BrowserExtractor via orchestrator
- **Permissions**: User must have explicit access to files — the MCP server respects Entra ID permissions, does not escalate
- **Frontier preview**: Requires enrollment in the Frontier preview program

### Storage Routing for Discovered Files

When SharePointTracker discovers relevant files for an account:
- Log file references (URL, name, last-modified) to `.docs/_data/<Account>/insights.md` under `## SharePoint/OneDrive References`
- Do NOT download and store file content locally — reference by URL
- Update `.docs/_data/<Account>/_manifest.md` if a new section is added
