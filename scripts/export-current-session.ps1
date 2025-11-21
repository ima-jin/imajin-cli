<#
.SYNOPSIS
    Quick export of the most recent Claude Code session

.DESCRIPTION
    Exports the most recent Claude Code session to a timestamped markdown file
    in the project's .claude-sessions directory
#>

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$sessionDir = "$PSScriptRoot\..\..claude-sessions"

# Create session export directory if it doesn't exist
if (-not (Test-Path $sessionDir)) {
    New-Item -ItemType Directory -Force -Path $sessionDir | Out-Null
    Write-Host "Created session directory: $sessionDir" -ForegroundColor Green
}

# Get the most recent session (excluding agent sessions)
$claudeProjectPath = "$env:USERPROFILE\.claude\projects\D--Projects-imajin-imajin-cli"
$latestSession = Get-ChildItem -Path $claudeProjectPath -Filter "*.jsonl" |
    Where-Object { $_.Name -notlike "agent-*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $latestSession) {
    Write-Error "No sessions found"
    exit 1
}

Write-Host "Found latest session: $($latestSession.BaseName)" -ForegroundColor Cyan
Write-Host "Last modified: $($latestSession.LastWriteTime)" -ForegroundColor Cyan

# Export it
$outputFile = Join-Path $sessionDir "session-$timestamp.md"
& "$PSScriptRoot\claude-session-export.ps1" -SessionId $latestSession.BaseName -OutputPath $outputFile

Write-Host "`nSession exported successfully!" -ForegroundColor Green
Write-Host "File: $outputFile" -ForegroundColor Yellow
