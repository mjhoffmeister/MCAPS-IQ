<#
.SYNOPSIS
  One-line bootstrap for MCAPS IQ on Windows.
  Installs all prerequisites, clones the repo, authenticates, and opens VS Code.

.DESCRIPTION
  Paste this into any PowerShell terminal:
    irm https://raw.githubusercontent.com/JinLee794/MCAPS-IQ/main/scripts/bootstrap.ps1 | iex

  Or run locally after cloning:
    .\scripts\bootstrap.ps1

  Flags:
    -SkipClone    Skip git clone (use when already in the repo directory)
    -SkipAuth     Skip Azure + GitHub auth steps
    -CheckOnly    Only verify prerequisites, don't install anything
    -CloneDir     Where to clone the repo (default: C:\Temp\mcaps-iq)
    -WithObsidian Install Obsidian + scaffold vault (skips prompt)
    -NoObsidian   Skip Obsidian setup entirely (skips prompt)

.NOTES
  Requires: PowerShell 5.1+ to bootstrap (ships with Windows 10/11).
  The script will install PowerShell 7+ (pwsh) if not already present.
  Elevated: Not required, but winget may prompt UAC for installs
#>
[CmdletBinding()]
param(
  [switch]$SkipClone,
  [switch]$SkipAuth,
  [switch]$CheckOnly,
  [switch]$WithObsidian,
  [switch]$NoObsidian,
  [string]$CloneDir = "C:\Temp\mcaps-iq"
)

$ErrorActionPreference = "Stop"

# ── Helpers ──────────────────────────────────────────────────────────
function Write-Step  { param([string]$Msg) Write-Host "`n━━━ $Msg ━━━" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Msg) Write-Host "  ✔ $Msg" -ForegroundColor Green }
function Write-Warn  { param([string]$Msg) Write-Host "  ⚠ $Msg" -ForegroundColor Yellow }
function Write-Fail  { param([string]$Msg) Write-Host "  ✖ $Msg" -ForegroundColor Red }

function Test-Command {
  param([string]$Name)
  $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
              [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Resolve-CodeCmd {
  if (Test-Command "code-insiders") { return "code-insiders" }
  if (Test-Command "code") { return "code" }
  return $null
}

function Install-Via-Winget {
  param([string]$PackageId, [string]$Label)
  if (-not (Test-Command "winget")) {
    Write-Fail "winget not found — install $Label manually"
    return $false
  }
  Write-Host "  Installing $Label via winget..." -ForegroundColor Gray
  winget install $PackageId --silent --accept-package-agreements --accept-source-agreements 2>$null
  Refresh-Path
  return $true
}

# ── Step 1: Check / Install Prerequisites ────────────────────────────
$allGood = $true

Write-Step "Checking prerequisites"

# -- PowerShell 7 --
if (Test-Command "pwsh") {
  $pwshVer = & pwsh -NoProfile -Command '$PSVersionTable.PSVersion.ToString()' 2>$null
  $pwshMajor = [int]($pwshVer -replace '^(\d+).*', '$1')
  if ($pwshMajor -ge 7) {
    Write-Ok "PowerShell $pwshVer"
  } else {
    Write-Warn "PowerShell $pwshVer found — need 7+"
    if (-not $CheckOnly) {
      Install-Via-Winget "Microsoft.PowerShell" "PowerShell 7"
      Refresh-Path
    } else { $allGood = $false }
  }
} else {
  Write-Warn "PowerShell 7 (pwsh) not found"
  if (-not $CheckOnly) {
    Install-Via-Winget "Microsoft.PowerShell" "PowerShell 7"
    Refresh-Path
    if (Test-Command "pwsh") { Write-Ok "PowerShell 7 installed" } else { Write-Fail "PowerShell 7 install failed"; $allGood = $false }
  } else { $allGood = $false }
}

# -- VS Code (stable or Insiders) --
$codeCmd = Resolve-CodeCmd
if ($codeCmd) {
  $codeVer = & $codeCmd --version 2>$null | Select-Object -First 1
  $codeLabel = if ($codeCmd -eq "code-insiders") { "VS Code Insiders" } else { "VS Code" }
  Write-Ok "$codeLabel $codeVer"
} else {
  Write-Warn "VS Code not found"
  if (-not $CheckOnly) {
    Install-Via-Winget "Microsoft.VisualStudioCode" "VS Code"
    $codeCmd = Resolve-CodeCmd
    if ($codeCmd) { Write-Ok "VS Code installed" } else { Write-Fail "VS Code install failed"; $allGood = $false }
  } else { $allGood = $false }
}

# -- Git --
if (Test-Command "git") {
  $gitVer = git --version 2>$null
  Write-Ok $gitVer
} else {
  Write-Warn "Git not found"
  if (-not $CheckOnly) {
    Install-Via-Winget "Git.Git" "Git"
    Refresh-Path
    if (Test-Command "git") { Write-Ok "Git installed" } else { Write-Fail "Git install failed"; $allGood = $false }
  } else { $allGood = $false }
}

# -- Node.js --
if (Test-Command "node") {
  $nodeVer = node --version 2>$null
  $major = [int]($nodeVer -replace '^v(\d+).*', '$1')
  if ($major -ge 18) {
    Write-Ok "Node.js $nodeVer"
  } else {
    Write-Warn "Node.js $nodeVer found — need v18+"
    if (-not $CheckOnly) {
      Install-Via-Winget "OpenJS.NodeJS.LTS" "Node.js LTS"
      Refresh-Path
    } else { $allGood = $false }
  }
} else {
  Write-Warn "Node.js not found"
  if (-not $CheckOnly) {
    Install-Via-Winget "OpenJS.NodeJS.LTS" "Node.js LTS"
    Refresh-Path
    if (Test-Command "node") { Write-Ok "Node.js installed" } else { Write-Fail "Node.js install failed"; $allGood = $false }
  } else { $allGood = $false }
}

# -- GitHub CLI --
if (Test-Command "gh") {
  $ghVer = (gh --version 2>$null | Select-Object -First 1) -replace 'gh version ', ''
  Write-Ok "GitHub CLI $ghVer"
} else {
  Write-Warn "GitHub CLI not found"
  if (-not $CheckOnly) {
    Install-Via-Winget "GitHub.cli" "GitHub CLI"
    # winget sometimes needs explicit PATH addition
    $ghPath = "C:\Program Files\GitHub CLI"
    if (Test-Path $ghPath) { $env:Path += ";$ghPath" }
    Refresh-Path
    if (Test-Command "gh") { Write-Ok "GitHub CLI installed" } else { Write-Fail "GitHub CLI install failed"; $allGood = $false }
  } else { $allGood = $false }
}

# -- Azure CLI --
if (Test-Command "az") {
  $azVer = (az version --query '"azure-cli"' -o tsv 2>$null)
  Write-Ok "Azure CLI $azVer"
} else {
  Write-Warn "Azure CLI not found"
  if (-not $CheckOnly) {
    Install-Via-Winget "Microsoft.AzureCLI" "Azure CLI"
    Refresh-Path
    if (Test-Command "az") { Write-Ok "Azure CLI installed" } else { Write-Fail "Azure CLI install failed"; $allGood = $false }
  } else { $allGood = $false }
}

# -- Copilot extension --
$codeCmd = Resolve-CodeCmd
if ($codeCmd) {
  $extensions = & $codeCmd --list-extensions 2>$null
  if ($extensions -match "GitHub\.copilot-chat") {
    Write-Ok "GitHub Copilot Chat extension installed"
  } else {
    Write-Warn "GitHub Copilot Chat extension not found"
    if (-not $CheckOnly) {
      Write-Host "  Installing Copilot Chat extension..." -ForegroundColor Gray
      & $codeCmd --install-extension GitHub.copilot-chat 2>$null
      Write-Ok "Copilot Chat extension installed"
    } else { $allGood = $false }
  }
}

if ($CheckOnly) {
  Write-Step "Check complete"
  if ($allGood) { Write-Ok "All prerequisites satisfied" } else { Write-Fail "Some prerequisites missing — run without -CheckOnly to install" }
  exit $(if ($allGood) { 0 } else { 1 })
}

# ── Step 2: Clone the Repo ───────────────────────────────────────────
if (-not $SkipClone) {
  Write-Step "Cloning MCAPS IQ"
  if (Test-Path (Join-Path $CloneDir ".git")) {
    Write-Ok "Repo already exists at $CloneDir — pulling latest"
    Push-Location $CloneDir
    git pull --ff-only 2>$null
    Pop-Location
  } else {
    if (-not (Test-Path (Split-Path $CloneDir))) {
      New-Item -ItemType Directory -Path (Split-Path $CloneDir) -Force | Out-Null
    }
    git clone https://github.com/JinLee794/MCAPS-IQ.git $CloneDir
    Write-Ok "Cloned to $CloneDir"
  }
  Set-Location $CloneDir
} else {
  Write-Ok "Skipping clone (using current directory)"
}

# ── Step 3: Authenticate ─────────────────────────────────────────────
if (-not $SkipAuth) {
  Write-Step "Authenticating"

  # GitHub Packages auth
  Write-Host "  Setting up GitHub Packages access..." -ForegroundColor Gray
  try {
    & node scripts/github-packages-auth.js
    Write-Ok "GitHub Packages auth configured"
  } catch {
    Write-Warn "GitHub Packages auth failed — you can retry later: npm run auth:packages"
  }

  # Azure sign-in
  $azAccount = az account show --query user.name -o tsv 2>$null
  if ($azAccount) {
    Write-Ok "Already signed in to Azure as $azAccount"
  } else {
    Write-Host "  Signing in to Azure (Microsoft tenant)..." -ForegroundColor Gray
    az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47
    $azAccount = az account show --query user.name -o tsv 2>$null
    if ($azAccount) { Write-Ok "Signed in as $azAccount" } else { Write-Warn "Azure sign-in may have failed — retry: az login" }
  }
} else {
  Write-Ok "Skipping auth steps"
}

# ── Step 4: Obsidian (optional) ──────────────────────────────────────
$obsidianInstalled = (Test-Command "obsidian") -or (Test-Path "$env:LOCALAPPDATA\Obsidian\Obsidian.exe")

if ($obsidianInstalled) {
  Write-Ok "Obsidian already installed"
  if (Test-Path "scripts\setup-vault.js") {
    if (-not $NoObsidian) {
      Write-Step "Scaffolding Obsidian vault"
      & node scripts/setup-vault.js --check 2>$null
    } else {
      Write-Ok "Skipping vault scaffold"
    }
  }
} else {
  $installObsidian = $false
  if ($WithObsidian) {
    $installObsidian = $true
  } elseif ($NoObsidian) {
    Write-Ok "Skipping Obsidian setup"
  } else {
    # Interactive prompt
    Write-Host ""
    Write-Host "  Obsidian provides persistent memory for the agent (meeting history," -ForegroundColor Cyan
    Write-Host "  customer context, relationship maps). Recommended but optional." -ForegroundColor Cyan
    Write-Host ""
    $answer = Read-Host "  Install Obsidian? [y/N]"
    if ($answer -match '^[yY]') {
      $installObsidian = $true
    } else {
      Write-Ok "Skipping Obsidian — you can install later: https://obsidian.md"
    }
  }

  if ($installObsidian) {
    Write-Step "Installing Obsidian"
    Install-Via-Winget "Obsidian.Obsidian" "Obsidian"
    Refresh-Path
    $obsidianNow = (Test-Command "obsidian") -or (Test-Path "$env:LOCALAPPDATA\Obsidian\Obsidian.exe")
    if ($obsidianNow) {
      Write-Ok "Obsidian installed"
    } else {
      Write-Warn "Obsidian install may have failed — download from https://obsidian.md"
    }
    if (Test-Path "scripts\setup-vault.js") {
      Write-Step "Scaffolding Obsidian vault"
      & node scripts/setup-vault.js --check 2>$null
    }
  }
}

# ── Step 5: Open VS Code ─────────────────────────────────────────────
Write-Step "Setup complete!"

Write-Host @"

  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │   MCAPS IQ is ready!                                        │
  │                                                             │
  │   Next steps:                                               │
  │     1. VS Code will open with the workspace                 │
  │     2. Open .vscode/mcp.json and click 'Start' on msx      │
  │     3. Open Copilot Chat (Ctrl+Shift+I)                     │
  │     4. Try: "Who am I in MSX?"                              │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘

"@ -ForegroundColor Green

$codeCmd = Resolve-CodeCmd
if ($codeCmd) {
  & $codeCmd .
} else {
  Write-Warn "VS Code not on PATH — open the workspace manually"
}
