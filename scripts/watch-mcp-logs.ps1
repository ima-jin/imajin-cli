#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Watch MCP server logs in real-time

.DESCRIPTION
    Monitors MCP server logs from Claude Desktop and/or custom log file.
    Shows tool executions, errors, and protocol interactions in real-time.

.PARAMETER Source
    Log source: 'desktop' (Claude Desktop logs), 'file' (custom log file), or 'both'

.PARAMETER LogFile
    Path to custom log file (only used when Source is 'file' or 'both')

.PARAMETER Lines
    Number of lines to show initially (default: 20)

.EXAMPLE
    .\scripts\watch-mcp-logs.ps1 -Source desktop
    Watch Claude Desktop's MCP server logs

.EXAMPLE
    .\scripts\watch-mcp-logs.ps1 -Source file -LogFile "mcp-debug.log"
    Watch custom log file

.EXAMPLE
    .\scripts\watch-mcp-logs.ps1 -Source both
    Watch both Claude Desktop logs and custom file
#>

param(
    [ValidateSet('desktop', 'file', 'both')]
    [string]$Source = 'desktop',

    [string]$LogFile = "$PSScriptRoot\..\mcp-debug.log",

    [int]$Lines = 20
)

$ErrorActionPreference = 'Stop'

# Colors for different log levels
$Colors = @{
    'INFO'  = 'Cyan'
    'WARN'  = 'Yellow'
    'ERROR' = 'Red'
    'DEBUG' = 'Gray'
}

function Get-DesktopLogPath {
    $claudeLogsDir = "$env:APPDATA\Claude\logs"

    if (-not (Test-Path $claudeLogsDir)) {
        Write-Warning "Claude Desktop logs directory not found: $claudeLogsDir"
        return $null
    }

    # Find the most recent mcp-server log file
    $logFiles = Get-ChildItem -Path $claudeLogsDir -Filter "mcp-server-imajin-cli*.log" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($logFiles) {
        return $logFiles.FullName
    }

    # If specific file not found, try any mcp-server log
    $logFiles = Get-ChildItem -Path $claudeLogsDir -Filter "mcp-server*.log" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($logFiles) {
        Write-Warning "Using generic MCP server log: $($logFiles.Name)"
        return $logFiles.FullName
    }

    return $null
}

function Format-LogLine {
    param([string]$Line)

    # Extract log level and colorize
    if ($Line -match '\[(INFO|WARN|ERROR|DEBUG)\]') {
        $level = $Matches[1]
        $color = $Colors[$level]

        # Add emoji indicators
        $Line = $Line -replace '\[INFO\]', '[INFO] ℹ️'
        $Line = $Line -replace '\[WARN\]', '[WARN] ⚠️'
        $Line = $Line -replace '\[ERROR\]', '[ERROR] ❌'
        $Line = $Line -replace '\[DEBUG\]', '[DEBUG] 🔍'

        Write-Host $Line -ForegroundColor $color
    } else {
        Write-Host $Line
    }
}

function Watch-LogFile {
    param([string]$Path, [string]$Name)

    Write-Host "`n=== Watching $Name ===" -ForegroundColor Green
    Write-Host "Log file: $Path`n" -ForegroundColor Gray

    if (-not (Test-Path $Path)) {
        Write-Warning "Log file not found, waiting for it to be created..."

        # Wait for file to be created
        while (-not (Test-Path $Path)) {
            Start-Sleep -Milliseconds 500
        }

        Write-Host "Log file created!" -ForegroundColor Green
    }

    # Show initial lines
    Get-Content $Path -Tail $Lines -ErrorAction SilentlyContinue | ForEach-Object {
        Format-LogLine $_
    }

    # Watch for new lines
    Get-Content $Path -Wait -Tail 0 -ErrorAction SilentlyContinue | ForEach-Object {
        Format-LogLine $_
    }
}

function Watch-MultipleLogs {
    param([string[]]$Paths, [string[]]$Names)

    Write-Host "`n=== Watching Multiple Log Sources ===" -ForegroundColor Green
    for ($i = 0; $i -lt $Paths.Length; $i++) {
        Write-Host "$($Names[$i]): $($Paths[$i])" -ForegroundColor Gray
    }
    Write-Host ""

    # Create jobs for each log file
    $jobs = @()
    for ($i = 0; $i -lt $Paths.Length; $i++) {
        $path = $Paths[$i]
        $name = $Names[$i]

        $job = Start-Job -ScriptBlock {
            param($Path, $Name, $Lines)

            # Wait for file if it doesn't exist
            while (-not (Test-Path $Path)) {
                Start-Sleep -Milliseconds 500
            }

            # Tail the file
            Get-Content $Path -Wait -Tail $Lines -ErrorAction SilentlyContinue | ForEach-Object {
                "[$Name] $_"
            }
        } -ArgumentList $path, $name, $Lines

        $jobs += $job
    }

    # Receive output from all jobs
    try {
        while ($true) {
            foreach ($job in $jobs) {
                $output = Receive-Job -Job $job
                if ($output) {
                    $output | ForEach-Object {
                        Format-LogLine $_
                    }
                }
            }
            Start-Sleep -Milliseconds 100
        }
    } finally {
        # Clean up jobs
        $jobs | Stop-Job
        $jobs | Remove-Job
    }
}

# Main logic
Write-Host @"

╔══════════════════════════════════════╗
║   MCP Server Log Monitor             ║
║   Press Ctrl+C to stop               ║
╚══════════════════════════════════════╝

"@ -ForegroundColor Cyan

try {
    switch ($Source) {
        'desktop' {
            $desktopLog = Get-DesktopLogPath
            if ($desktopLog) {
                Watch-LogFile -Path $desktopLog -Name "Claude Desktop MCP Log"
            } else {
                Write-Error "Claude Desktop log file not found. Make sure Claude Desktop is running with the MCP server configured."
            }
        }

        'file' {
            if (-not (Test-Path $LogFile)) {
                Write-Host "Custom log file not found at: $LogFile" -ForegroundColor Yellow
                Write-Host "Make sure MCP_LOG_FILE is set in your Claude Desktop config." -ForegroundColor Yellow
                Write-Host "Waiting for log file to be created...`n" -ForegroundColor Yellow
            }
            Watch-LogFile -Path $LogFile -Name "Custom MCP Log"
        }

        'both' {
            $paths = @()
            $names = @()

            $desktopLog = Get-DesktopLogPath
            if ($desktopLog) {
                $paths += $desktopLog
                $names += "Claude Desktop"
            }

            $paths += $LogFile
            $names += "Custom Log"

            Watch-MultipleLogs -Paths $paths -Names $names
        }
    }
} catch {
    Write-Error "Error monitoring logs: $_"
    exit 1
}
