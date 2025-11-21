<#
.SYNOPSIS
    Export Claude Code session logs to readable formats

.DESCRIPTION
    Parses Claude Code JSONL session files and exports them to markdown,
    HTML, or generates summaries of development sessions.

.PARAMETER SessionId
    Specific session ID to export (UUID or agent ID)

.PARAMETER OutputFormat
    Output format: markdown, html, json, summary

.PARAMETER OutputPath
    Path to save the exported file

.PARAMETER ListSessions
    List all available sessions with metadata

.EXAMPLE
    .\claude-session-export.ps1 -ListSessions

.EXAMPLE
    .\claude-session-export.ps1 -SessionId "2f87f26a-457d-4d97-a74e-b76f39a5b001" -OutputFormat markdown

.EXAMPLE
    .\claude-session-export.ps1 -OutputFormat summary -OutputPath ".\session-summary.md"
#>

param(
    [string]$SessionId,
    [ValidateSet("markdown", "html", "json", "summary")]
    [string]$OutputFormat = "markdown",
    [string]$OutputPath,
    [switch]$ListSessions,
    [string]$ClaudeProjectsPath = "$env:USERPROFILE\.claude\projects"
)

$projectPath = "D--Projects-imajin-imajin-cli"
$sessionDir = Join-Path $ClaudeProjectsPath $projectPath

function Get-SessionFiles {
    Get-ChildItem -Path $sessionDir -Filter "*.jsonl" | ForEach-Object {
        $firstLine = Get-Content $_.FullName -First 1 | ConvertFrom-Json
        $lastLine = Get-Content $_.FullName -Last 5 | Where-Object { $_ -match '"timestamp"' } | Select-Object -First 1 | ConvertFrom-Json

        [PSCustomObject]@{
            SessionId = $_.BaseName
            FileName = $_.Name
            FilePath = $_.FullName
            StartTime = $firstLine.timestamp
            EndTime = $lastLine.timestamp
            LineCount = (Get-Content $_.FullName | Measure-Object -Line).Lines
            IsAgent = $_.Name -like "agent-*"
        }
    }
}

function Export-SessionToMarkdown {
    param([string]$FilePath, [string]$Output)

    $lines = Get-Content $FilePath
    $markdown = @()
    $markdown += "# Claude Code Session Export"
    $markdown += ""

    $sessionInfo = $lines[0] | ConvertFrom-Json
    if ($sessionInfo.sessionId) {
        $markdown += "**Session ID:** $($sessionInfo.sessionId)"
        $markdown += "**Start Time:** $($sessionInfo.timestamp)"
        $markdown += ""
    }

    foreach ($line in $lines) {
        $entry = $line | ConvertFrom-Json

        switch ($entry.type) {
            "user" {
                $markdown += "## User"
                $markdown += "**Time:** $($entry.timestamp)"
                $markdown += ""
                $markdown += $entry.message.content
                $markdown += ""
                $markdown += "---"
                $markdown += ""
            }
            "assistant" {
                $markdown += "## Assistant"
                $markdown += "**Time:** $($entry.timestamp)"
                if ($entry.message.usage) {
                    $markdown += "**Tokens:** Input=$($entry.message.usage.input_tokens) Output=$($entry.message.usage.output_tokens)"
                }
                $markdown += ""

                foreach ($content in $entry.message.content) {
                    if ($content.type -eq "text") {
                        $markdown += $content.text
                        $markdown += ""
                    }
                    elseif ($content.type -eq "tool_use") {
                        $markdown += "### Tool: $($content.name)"
                        $markdown += '```json'
                        $markdown += ($content.input | ConvertTo-Json -Depth 10)
                        $markdown += '```'
                        $markdown += ""
                    }
                }

                $markdown += "---"
                $markdown += ""
            }
            "tool_result" {
                $markdown += "### Tool Result"
                $markdown += '```'
                $markdown += $entry.message.content
                $markdown += '```'
                $markdown += ""
            }
        }
    }

    if ($Output) {
        $markdown | Out-File -FilePath $Output -Encoding UTF8
        Write-Host "Exported to: $Output" -ForegroundColor Green
    } else {
        $markdown | Out-String
    }
}

function Export-SessionSummary {
    param([string]$Output)

    $sessions = Get-SessionFiles | Where-Object { -not $_.IsAgent } | Sort-Object StartTime -Descending

    $summary = @()
    $summary += "# Claude Code Session Summary"
    $summary += "**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $summary += "**Project:** imajin-cli"
    $summary += ""
    $summary += "## Sessions Overview"
    $summary += ""
    $summary += "| Session ID | Start Time | Lines | Duration |"
    $summary += "|------------|------------|-------|----------|"

    foreach ($session in $sessions) {
        if ($session.StartTime -and $session.EndTime) {
            try {
                $start = [DateTime]::Parse($session.StartTime)
                $end = [DateTime]::Parse($session.EndTime)
                $duration = $end - $start
                $durationStr = "$($duration.TotalMinutes.ToString('F0'))m"
                $startStr = $start.ToString('yyyy-MM-dd HH:mm')
            } catch {
                $startStr = "N/A"
                $durationStr = "N/A"
            }
        } else {
            $startStr = "N/A"
            $durationStr = "N/A"
        }

        $summary += "| $($session.SessionId.Substring(0,8))... | $startStr | $($session.LineCount) | $durationStr |"
    }

    $summary += ""
    $summary += "## Agent Sessions"
    $summary += ""
    $agentCount = ($sessions | Where-Object IsAgent).Count
    $summary += "Total agent sessions: $agentCount"
    $summary += ""

    if ($Output) {
        $summary | Out-File -FilePath $Output -Encoding UTF8
        Write-Host "Summary exported to: $Output" -ForegroundColor Green
    } else {
        $summary | Out-String
    }
}

# Main execution
if (-not (Test-Path $sessionDir)) {
    Write-Error "Session directory not found: $sessionDir"
    exit 1
}

if ($ListSessions) {
    Get-SessionFiles | Format-Table -AutoSize SessionId, StartTime, LineCount, IsAgent
    exit 0
}

if ($SessionId) {
    $sessionFile = Get-ChildItem -Path $sessionDir -Filter "$SessionId.jsonl"
    if (-not $sessionFile) {
        Write-Error "Session not found: $SessionId"
        exit 1
    }

    $outputPath = if ($OutputPath) { $OutputPath } else { ".\session-$SessionId.md" }
    Export-SessionToMarkdown -FilePath $sessionFile.FullName -Output $outputPath
}
elseif ($OutputFormat -eq "summary") {
    $outputPath = if ($OutputPath) { $OutputPath } else { ".\claude-sessions-summary.md" }
    Export-SessionSummary -Output $outputPath
}
else {
    Write-Host "Usage examples:" -ForegroundColor Yellow
    Write-Host "  List sessions:    .\claude-session-export.ps1 -ListSessions"
    Write-Host "  Export session:   .\claude-session-export.ps1 -SessionId 'SESSION_ID'"
    Write-Host "  Create summary:   .\claude-session-export.ps1 -OutputFormat summary"
}
