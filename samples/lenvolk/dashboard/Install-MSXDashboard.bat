@echo off
:: MSX Dashboard — One-click Windows Installer
:: Auto-elevates to admin, runs setup.ps1 with GUI progress bar

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

