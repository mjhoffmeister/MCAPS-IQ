# MSX Dashboard - Windows Installer with GUI
# Installs Node.js (if needed), copies app files, creates shortcuts, registers in Add/Remove Programs

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$AppName       = 'MSX Dashboard'
$AppVersion    = '1.0.0'
$InstallDir    = Join-Path $env:ProgramFiles 'MSX Dashboard'
$DesktopLink   = Join-Path ([Environment]::GetFolderPath('Desktop')) ($AppName + '.lnk')
$StartMenuDir  = Join-Path ([Environment]::GetFolderPath('CommonStartMenu')) ('Programs\' + $AppName)
$UninstallKey  = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\MSXDashboard'
$NodeMinVer    = [version]'20.0.0'
$NodeInstallerUrl = 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi'
$Port          = 3737

$SourceDir = $PSScriptRoot
if (-not $SourceDir) { $SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path }

# ---- Generate Matrix-style Icon ----
function New-MatrixIcon {
    $bmp = New-Object System.Drawing.Bitmap(64, 64)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.FillEllipse([System.Drawing.Brushes]::Black, 0, 0, 63, 63)
    $g.DrawEllipse((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 0, 255, 0), 2)), 1, 1, 61, 61)
    $font = New-Object System.Drawing.Font('Consolas', 7)
    $chars = '01ABCDEFabcdef<>$#'
    $rng = New-Object System.Random(42)
    for ($col = 0; $col -lt 7; $col++) {
        for ($row = 0; $row -lt 7; $row++) {
            $ch = $chars[$rng.Next($chars.Length)]
            $alpha = [Math]::Max(40, 255 - ($row * 30) - ($col % 3) * 20)
            $green = [System.Drawing.Color]::FromArgb($alpha, 0, [Math]::Min(255, 180 + $rng.Next(75)), 0)
            $brush = New-Object System.Drawing.SolidBrush($green)
            $g.DrawString([string]$ch, $font, $brush, (6 + $col * 8), (4 + $row * 8))
            $brush.Dispose()
        }
    }
    $font.Dispose(); $g.Dispose()
    $icoPath = Join-Path $env:TEMP 'msx-dashboard.ico'
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $ms.ToArray(); $ms.Dispose(); $bmp.Dispose()
    $fs = [System.IO.File]::Create($icoPath)
    $bw = New-Object System.IO.BinaryWriter($fs)
    $bw.Write([int16]0); $bw.Write([int16]1); $bw.Write([int16]1)
    $bw.Write([byte]64); $bw.Write([byte]64); $bw.Write([byte]0); $bw.Write([byte]0)
    $bw.Write([int16]1); $bw.Write([int16]32)
    $bw.Write([int32]$pngBytes.Length); $bw.Write([int32]22)
    $bw.Write($pngBytes); $bw.Close(); $fs.Close()
    return $icoPath
}

# ---- GUI Setup ----
$form = New-Object System.Windows.Forms.Form
$form.Text = $AppName + ' Installer'
$form.Size = New-Object System.Drawing.Size(520, 340)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 46)
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = [char]0x2B50 + ' ' + $AppName
$titleLabel.Font = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Bold)
$titleLabel.Location = New-Object System.Drawing.Point(30, 20)
$titleLabel.Size = New-Object System.Drawing.Size(440, 40)
$form.Controls.Add($titleLabel)

$versionLabel = New-Object System.Windows.Forms.Label
$versionLabel.Text = 'Version ' + $AppVersion + ' - Portfolio Dashboard with Copilot SDK'
$versionLabel.ForeColor = [System.Drawing.Color]::FromArgb(160, 160, 180)
$versionLabel.Location = New-Object System.Drawing.Point(30, 60)
$versionLabel.Size = New-Object System.Drawing.Size(440, 22)
$form.Controls.Add($versionLabel)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = 'Ready to install'
$statusLabel.Location = New-Object System.Drawing.Point(30, 100)
$statusLabel.Size = New-Object System.Drawing.Size(440, 25)
$form.Controls.Add($statusLabel)

$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(30, 135)
$progressBar.Size = New-Object System.Drawing.Size(440, 28)
$progressBar.Maximum = 100
$form.Controls.Add($progressBar)

$detailLabel = New-Object System.Windows.Forms.Label
$detailLabel.Text = ''
$detailLabel.ForeColor = [System.Drawing.Color]::FromArgb(140, 140, 160)
$detailLabel.Font = New-Object System.Drawing.Font('Segoe UI', 8)
$detailLabel.Location = New-Object System.Drawing.Point(30, 170)
$detailLabel.Size = New-Object System.Drawing.Size(440, 20)
$form.Controls.Add($detailLabel)

$installBtn = New-Object System.Windows.Forms.Button
$installBtn.Text = 'Install'
$installBtn.Size = New-Object System.Drawing.Size(140, 42)
$installBtn.Location = New-Object System.Drawing.Point(160, 210)
$installBtn.FlatStyle = 'Flat'
$installBtn.BackColor = [System.Drawing.Color]::FromArgb(50, 120, 220)
$installBtn.ForeColor = [System.Drawing.Color]::White
$installBtn.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($installBtn)

$closeBtn = New-Object System.Windows.Forms.Button
$closeBtn.Text = 'Close'
$closeBtn.Size = New-Object System.Drawing.Size(100, 35)
$closeBtn.Location = New-Object System.Drawing.Point(310, 215)
$closeBtn.FlatStyle = 'Flat'
$closeBtn.BackColor = [System.Drawing.Color]::FromArgb(60, 60, 80)
$closeBtn.Visible = $false
$form.Controls.Add($closeBtn)
$closeBtn.Add_Click({ $form.Close() })

$installDirLabel = New-Object System.Windows.Forms.Label
$installDirLabel.Text = 'Install to: ' + $InstallDir
$installDirLabel.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 140)
$installDirLabel.Font = New-Object System.Drawing.Font('Segoe UI', 8)
$installDirLabel.Location = New-Object System.Drawing.Point(30, 268)
$installDirLabel.Size = New-Object System.Drawing.Size(440, 18)
$form.Controls.Add($installDirLabel)

# ---- Helpers ----
function Update-Progress($pct, $status, $detail) {
    $progressBar.Value = [Math]::Min($pct, 100)
    $statusLabel.Text = $status
    $detailLabel.Text = $detail
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
}

function Test-NodeInstalled {
    try {
        $ver = & node --version 2>$null
        if ($ver -match 'v(\d+\.\d+\.\d+)') {
            return [version]$Matches[1] -ge $NodeMinVer
        }
    } catch {}
    return $false
}

function New-Shortcut($path, $target, $iconPath, $workdir) {
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut($path)
    $lnk.TargetPath = $target
    $lnk.WorkingDirectory = $workdir
    if ($iconPath -and (Test-Path $iconPath)) {
        $iconStr = [string]$iconPath + ',0'
        $lnk.IconLocation = $iconStr
    }
    $lnk.Save()
}

# ---- Install Logic ----
$installBtn.Add_Click({
    $installBtn.Enabled = $false
    $installBtn.Text = 'Installing...'

    try {
        # Step 1: Check Node.js
        Update-Progress 5 'Checking Node.js...' 'Looking for Node.js v20+'
        if (-not (Test-NodeInstalled)) {
            Update-Progress 8 'Downloading Node.js v22 LTS...' $NodeInstallerUrl
            $msiPath = Join-Path $env:TEMP 'node-setup.msi'
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $NodeInstallerUrl -OutFile $msiPath -UseBasicParsing
            Update-Progress 20 'Installing Node.js...' 'This may take a minute'
            Start-Process msiexec.exe -ArgumentList ('/i "' + $msiPath + '" /qn /norestart') -Wait -NoNewWindow
            $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
            Remove-Item $msiPath -ErrorAction SilentlyContinue
            if (-not (Test-NodeInstalled)) {
                throw 'Node.js installation failed. Install manually from https://nodejs.org'
            }
            Update-Progress 30 'Node.js installed' (& node --version)
        } else {
            Update-Progress 15 'Node.js found' (& node --version)
        }

        # Step 2: Create install directory
        Update-Progress 35 'Creating install directory...' $InstallDir
        if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
        New-Item -Path $InstallDir -ItemType Directory -Force | Out-Null

        # Step 3: Copy app files
        $excludeNames = @('tests', 'test-results', 'node_modules', '.git', 'logs', 'Install-MSXDashboard.bat', 'setup.ps1', 'playwright.config.js')
        $items = Get-ChildItem -Path $SourceDir -Force | Where-Object { $_.Name -notin $excludeNames }
        $total = $items.Count; $i = 0
        foreach ($item in $items) {
            $dest = Join-Path $InstallDir $item.Name
            if ($item.PSIsContainer) { Copy-Item $item.FullName $dest -Recurse -Force }
            else { Copy-Item $item.FullName $dest -Force }
            $i++
            Update-Progress (35 + [int](20 * $i / [Math]::Max($total, 1))) 'Copying files...' $item.Name
        }

        # Step 4: Copy external dependencies
        $repoRoot = Split-Path -Parent $SourceDir

        # 4a: mcp/msx/src/auth.js (used by crm-direct.js)
        $authSrc = Join-Path $repoRoot 'mcp\msx\src\auth.js'
        if (Test-Path $authSrc) {
            $authDest = Join-Path $InstallDir '..\mcp\msx\src'
            New-Item -Path $authDest -ItemType Directory -Force | Out-Null
            Copy-Item $authSrc (Join-Path $authDest 'auth.js') -Force
            Update-Progress 56 'Copied auth dependency' 'mcp/msx/src/auth.js'
        }

        # 4b: mcp/excalidraw/ (used by drawings API for SVG rendering)
        $excalidrawSrc = Join-Path $repoRoot 'mcp\excalidraw'
        if (Test-Path $excalidrawSrc) {
            $excalidrawDest = Join-Path $InstallDir '..\mcp\excalidraw'
            Copy-Item $excalidrawSrc $excalidrawDest -Recurse -Force
            Update-Progress 58 'Copied Excalidraw renderer' 'mcp/excalidraw/'
        }

        # 4c: Create .docs skeleton folder structure (empty, no customer data)
        $docsRoot = Join-Path $InstallDir '..' | Join-Path -ChildPath '.docs'
        $docsFolders = @('_data', 'documents', 'Drawing_Excalidraw', 'Email-Templates', 'Weekly')
        foreach ($df in $docsFolders) {
            New-Item -Path (Join-Path $docsRoot $df) -ItemType Directory -Force | Out-Null
        }
        Update-Progress 59 'Created .docs database skeleton' '.docs/'

        # Step 5: npm install
        Update-Progress 60 'Installing dependencies (npm install)...' 'This may take a minute'
        Push-Location $InstallDir
        & cmd /c 'npm install --omit=dev 2>&1' | Out-Null
        Pop-Location
        Update-Progress 75 'Dependencies installed' ''

        # Step 5b: Patch vscode-jsonrpc for ESM compatibility (Copilot SDK needs this)
        Update-Progress 77 'Patching vscode-jsonrpc...' 'ESM exports fix'
        $jsonrpcPkg = Join-Path $InstallDir 'node_modules\vscode-jsonrpc\package.json'
        if (Test-Path $jsonrpcPkg) {
            $pkg = Get-Content $jsonrpcPkg -Raw | ConvertFrom-Json
            if (-not $pkg.exports) {
                $pkg | Add-Member -NotePropertyName 'exports' -NotePropertyValue @{
                    '.' = './lib/node/main.js'
                    './node' = './node.js'
                    './node.js' = './node.js'
                    './browser' = './browser.js'
                    './browser.js' = './browser.js'
                } -Force
                $pkg | ConvertTo-Json -Depth 10 | Set-Content $jsonrpcPkg -Encoding UTF8
            }
        }
        Update-Progress 80 'Patched dependencies' ''

        # Step 5: Generate Matrix icon
        Update-Progress 82 'Generating application icon...' ''
        $iconPath = New-MatrixIcon
        $iconDest = Join-Path $InstallDir 'msx-dashboard.ico'
        Copy-Item $iconPath $iconDest -Force

        # Step 6: Create launcher
        $launcherPath = Join-Path $InstallDir 'Start-MSXDashboard.bat'
        $launcherLines = @(
            '@echo off',
            'cd /d "%~dp0"',
            ('start "" http://localhost:' + $Port),
            'node server/index.js'
        )
        [System.IO.File]::WriteAllLines($launcherPath, $launcherLines)
        Update-Progress 85 'Created launcher' ''

        # Step 7: Create uninstaller bat
        $uninstallBat = Join-Path $InstallDir 'Uninstall-MSXDashboard.bat'
        $unBatLines = @(
            '@echo off',
            'net session >nul 2>&1',
            'if %errorlevel% neq 0 (',
            '    powershell -Command "Start-Process ''%~f0'' -Verb RunAs"',
            '    exit /b',
            ')',
            'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"',
            'pause'
        )
        [System.IO.File]::WriteAllLines($uninstallBat, $unBatLines)

        # Step 7b: Create uninstaller ps1
        $uninstallPs1 = Join-Path $InstallDir 'uninstall.ps1'
        $unLines = @(
            'Add-Type -AssemblyName System.Windows.Forms',
            ('$AppName = ''' + $AppName + ''''),
            ('$InstallDir = Join-Path $env:ProgramFiles $AppName'),
            ('$DesktopLink = Join-Path ([Environment]::GetFolderPath(''Desktop'')) ($AppName + ''.lnk'')'),
            ('$StartMenuDir = Join-Path ([Environment]::GetFolderPath(''CommonStartMenu'')) (''Programs\'' + $AppName)'),
            ('$UninstallKey = ''HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\MSXDashboard'''),
            '$confirm = [System.Windows.Forms.MessageBox]::Show(''Uninstall '' + $AppName + ''?'', ''Uninstall'', ''YesNo'', ''Question'')',
            'if ($confirm -ne ''Yes'') { exit 0 }',
            'try { $o = netstat -ano 2>$null | Select-String '':3737'' | Select-String ''LISTENING''; if ($o) { $o | ForEach-Object { ($_ -split ''\s+'')[-1] } | Sort-Object -Unique | Where-Object { $_ -ne ''0'' } | ForEach-Object { taskkill /F /PID $_ 2>$null | Out-Null } } } catch {}',
            'if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue }',
            '$mpcDir = Join-Path $env:ProgramFiles ''mcp''',
            'if (Test-Path $mpcDir) { Remove-Item $mpcDir -Recurse -Force -ErrorAction SilentlyContinue }',
            '$docsDir = Join-Path $env:ProgramFiles ''.docs''',
            'if (Test-Path $docsDir) { Remove-Item $docsDir -Recurse -Force -ErrorAction SilentlyContinue }',
            'if (Test-Path $DesktopLink) { Remove-Item $DesktopLink -Force }',
            'if (Test-Path $StartMenuDir) { Remove-Item $StartMenuDir -Recurse -Force }',
            'if (Test-Path $UninstallKey) { Remove-Item $UninstallKey -Force }',
            '[System.Windows.Forms.MessageBox]::Show($AppName + '' has been uninstalled.'', ''Done'', ''OK'', ''Information'') | Out-Null'
        )
        [System.IO.File]::WriteAllLines($uninstallPs1, $unLines)
        Update-Progress 87 'Created uninstaller' ''

        # Step 8: Shortcuts with Matrix icon
        Update-Progress 88 'Creating shortcuts...' 'Desktop + Start Menu'
        New-Shortcut $DesktopLink $launcherPath $iconDest $InstallDir
        if (-not (Test-Path $StartMenuDir)) { New-Item $StartMenuDir -ItemType Directory -Force | Out-Null }
        New-Shortcut (Join-Path $StartMenuDir ($AppName + '.lnk')) $launcherPath $iconDest $InstallDir
        New-Shortcut (Join-Path $StartMenuDir ('Uninstall ' + $AppName + '.lnk')) $uninstallBat '' $InstallDir

        # Step 9: Add/Remove Programs registry
        Update-Progress 92 'Registering application...' 'Add/Remove Programs'
        New-Item -Path $UninstallKey -Force | Out-Null
        Set-ItemProperty $UninstallKey -Name 'DisplayName'     -Value $AppName
        Set-ItemProperty $UninstallKey -Name 'DisplayVersion'  -Value $AppVersion
        Set-ItemProperty $UninstallKey -Name 'Publisher'        -Value 'MSX Tools'
        Set-ItemProperty $UninstallKey -Name 'InstallLocation' -Value $InstallDir
        Set-ItemProperty $UninstallKey -Name 'UninstallString' -Value ('"' + $uninstallBat + '"')
        Set-ItemProperty $UninstallKey -Name 'DisplayIcon'     -Value ($iconDest + ',0')
        Set-ItemProperty $UninstallKey -Name 'NoModify'        -Value 1 -Type DWord
        Set-ItemProperty $UninstallKey -Name 'NoRepair'        -Value 1 -Type DWord

        # Done
        Update-Progress 100 'Installation complete!' ('Open ' + $AppName + ' from Desktop or Start Menu')
        $installBtn.Visible = $false
        $closeBtn.Visible = $true
        $closeBtn.Focus()

    } catch {
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 100, 100)
        Update-Progress $progressBar.Value ('Error: ' + $_.Exception.Message) ''
        $installBtn.Text = 'Retry'
        $installBtn.Enabled = $true
    }
})

$form.ShowDialog() | Out-Null
