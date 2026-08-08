# Nuke and Rebuild Script - Complete clean and rebuild from git
# This script performs a nuclear clean and rebuild of the project

param(
    [switch]$Force,
    [switch]$SkipGitClean,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "🚨 NUCLEAR REBUILD INITIATED 🚨" -ForegroundColor Red
Write-Host "This will completely clean and rebuild the project from scratch." -ForegroundColor Yellow

if (-not $Force) {
    $confirmation = Read-Host "Are you sure you want to continue? (y/N)"
    if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
        Write-Host "❌ Operation cancelled." -ForegroundColor Red
        exit 0
    }
}

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

Write-Host "📁 Working directory: $rootDir" -ForegroundColor Cyan

try {
    # Step 1: Git clean (unless skipped)
    if (-not $SkipGitClean) {
        Write-Host "🧹 Step 1: Git clean..." -ForegroundColor Yellow
        
        # Check if we're in a git repository
        if (Test-Path ".git") {
            Write-Host "   - Resetting to HEAD..." -ForegroundColor Gray
            git reset --hard HEAD
            
            Write-Host "   - Cleaning untracked files and directories..." -ForegroundColor Gray
            git clean -fdx
            
            Write-Host "   ✅ Git clean completed" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Not a git repository, skipping git clean" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⏭️  Skipping git clean" -ForegroundColor Yellow
    }

    # Step 2: Remove node modules and lock files
    Write-Host "🗑️  Step 2: Removing node_modules and lock files..." -ForegroundColor Yellow
    
    if (Test-Path "node_modules") {
        Write-Host "   - Removing node_modules..." -ForegroundColor Gray
        Remove-Item "node_modules" -Recurse -Force
    }
    
    if (Test-Path "yarn.lock") {
        Write-Host "   - Removing yarn.lock..." -ForegroundColor Gray
        Remove-Item "yarn.lock" -Force
    }
    
    Write-Host "   ✅ Cleanup completed" -ForegroundColor Green

    # Step 3: Remove dist folder
    Write-Host "📦 Step 3: Removing dist folder..." -ForegroundColor Yellow
    
    if (Test-Path "dist") {
        Write-Host "   - Removing dist..." -ForegroundColor Gray
        Remove-Item "dist" -Recurse -Force
    }
    
    Write-Host "   ✅ Dist folder removed" -ForegroundColor Green

    # Step 4: Clear pnpm store cache
    Write-Host "💾 Step 4: Clearing pnpm store cache..." -ForegroundColor Yellow
    pnpm store prune
    Write-Host "   ✅ pnpm store cache cleared" -ForegroundColor Green

    # Step 5: Fresh install
    Write-Host "📥 Step 5: Fresh pnpm install..." -ForegroundColor Yellow
    pnpm install
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green

    # Step 6: Build project
    Write-Host "🔨 Step 6: Building project..." -ForegroundColor Yellow
    pnpm run build
    Write-Host "   ✅ Project built successfully" -ForegroundColor Green

    # Step 7: Test the CLI
    Write-Host "🧪 Step 7: Testing CLI..." -ForegroundColor Yellow
    $version = & "imajin" --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ CLI test successful - Version: $version" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  CLI test failed, but build completed" -ForegroundColor Yellow
        if ($Verbose) {
            Write-Host "   Error output: $version" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "🎉 NUCLEAR REBUILD COMPLETED SUCCESSFULLY! 🎉" -ForegroundColor Green
    Write-Host "The project has been completely cleaned and rebuilt from scratch." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  • Run 'imajin --help' to see available commands" -ForegroundColor Gray
    Write-Host "  • Run 'pnpm test' to run tests" -ForegroundColor Gray
    Write-Host "  • Run 'pnpm run dev' for development mode" -ForegroundColor Gray

} catch {
    Write-Host ""
    Write-Host "💥 REBUILD FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to manually clean up and investigate the issue." -ForegroundColor Yellow
    exit 1
}
