param(
  [string]$SeedFile = "docs/v2/cli-ia/github-issues.seed.json",
  [string]$Repo = "",
  [switch]$DryRun
)

function Assert-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Resolve-RepoName {
  param([string]$ExplicitRepo)
  if ($ExplicitRepo) {
    return $ExplicitRepo
  }

  $repoName = (& gh repo view --json nameWithOwner --jq ".nameWithOwner" 2>$null)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoName)) {
    throw "Could not resolve repo from current directory. Pass -Repo owner/name."
  }
  return $repoName.Trim()
}

function Get-IssueByExactTitle {
  param(
    [string]$RepoName,
    [string]$Title
  )

  $json = (& gh issue list --repo $RepoName --state all --search $Title --json number,title,url)
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to search existing issues for title: $Title"
  }

  $items = @($json | ConvertFrom-Json)
  foreach ($item in $items) {
    if ($item.title -eq $Title) {
      return $item
    }
  }

  return $null
}
function Get-ExistingLabelSet {
  param([string]$RepoName)

  $json = (& gh label list --repo $RepoName --limit 200 --json name 2>$null)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($json)) {
    return @{}
  }

  $labels = @($json | ConvertFrom-Json)
  $set = @{}
  foreach ($label in $labels) {
    if ($label.name) {
      $set[$label.name] = $true
    }
  }
  return $set
}

function Select-ExistingLabels {
  param(
    [string[]]$Desired,
    [hashtable]$ExistingSet
  )

  if (-not $ExistingSet -or $ExistingSet.Count -eq 0) {
    return @()
  }

  $result = @()
  foreach ($label in @($Desired | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)) {
    if ($ExistingSet.ContainsKey($label)) {
      $result += $label
    }
  }
  return $result
}

function New-IssueFromSeed {
  param(
    [string]$RepoName,
    [string]$Title,
    [string]$Body,
    [string[]]$Labels,
    [hashtable]$ExistingLabelSet,
    [switch]$DryRunMode
  )

  $existing = Get-IssueByExactTitle -RepoName $RepoName -Title $Title
  if ($existing) {
    return [PSCustomObject]@{
      number   = $existing.number
      title    = $existing.title
      url      = $existing.url
      status   = "existing"
      dryRun   = $false
    }
  }

  $args = @(
    "issue", "create",
    "--repo", $RepoName,
    "--title", $Title,
    "--body", $Body
  )

  $usableLabels = Select-ExistingLabels -Desired $Labels -ExistingSet $ExistingLabelSet
  if ($usableLabels.Count -gt 0) {
    $args += @("--label", ($usableLabels -join ","))
  }

  if ($DryRunMode) {
    Write-Host ("[DRY RUN] gh " + ($args -join " ")) -ForegroundColor Yellow
    return [PSCustomObject]@{
      number   = $null
      title    = $Title
      url      = $null
      status   = "dry-run"
      dryRun   = $true
    }
  }

  $url = (& gh @args)
  if ($LASTEXITCODE -ne 0) {
    throw "Failed creating issue: $Title"
  }

  $issueNumber = $null
  if ($url -match "/issues/([0-9]+)$") {
    $issueNumber = [int]$matches[1]
  }

  return [PSCustomObject]@{
    number   = $issueNumber
    title    = $Title
    url      = ($url | Out-String).Trim()
    status   = "created"
    dryRun   = $false
  }
}

try {
  Assert-Command -Name "gh"

  if (-not (Test-Path -Path $SeedFile)) {
    throw "Seed file not found: $SeedFile"
  }

  $resolvedRepo = Resolve-RepoName -ExplicitRepo $Repo
  $existingLabelSet = Get-ExistingLabelSet -RepoName $resolvedRepo
  $seed = Get-Content -Raw -Path $SeedFile | ConvertFrom-Json

  if (-not $seed.epics -or -not $seed.issues) {
    throw "Seed file is missing required fields: epics and issues"
  }

  $epicLookup = @{}
  $createdEpics = @()
  $createdIssues = @()

  foreach ($epic in @($seed.epics)) {
    $epicBody = @(
      "Seed ID: $($epic.id)",
      "Project: $($seed.project)",
      "",
      "Generated from: $SeedFile",
      "",
      "Purpose:",
      "- Parent epic for planned CLI v2 implementation work."
    ) -join "`n"

    $result = New-IssueFromSeed -RepoName $resolvedRepo -Title $epic.title -Body $epicBody -Labels @($epic.labels) -ExistingLabelSet $existingLabelSet -DryRunMode:$DryRun
    $createdEpics += $result
    $epicLookup[$epic.id] = $result
  }

  foreach ($issue in @($seed.issues)) {
    $parent = $null
    if ($issue.epic_id -and $epicLookup.ContainsKey($issue.epic_id)) {
      $parent = $epicLookup[$issue.epic_id]
    }

    $bodyLines = @()
    if ($issue.epic_id) {
      if ($parent -and $parent.number) {
        $bodyLines += "Parent Epic: #$($parent.number)"
      } else {
        $bodyLines += "Parent Epic Seed ID: $($issue.epic_id)"
      }
    }
    if ($issue.milestone) {
      $bodyLines += "Milestone: $($issue.milestone)"
    }
    $bodyLines += ""
    $bodyLines += "Generated from: $SeedFile"
    $bodyLines += ""
    $bodyLines += "Implementation checklist:"
    $bodyLines += "- [ ] Define acceptance criteria"
    $bodyLines += "- [ ] Add implementation notes"
    $bodyLines += "- [ ] Link relevant schema/mapping artifacts"

    $labels = @($issue.labels)
    if ($issue.epic_id) {
      $labels += "epic-child"
    }

    $result = New-IssueFromSeed -RepoName $resolvedRepo -Title $issue.title -Body ($bodyLines -join "`n") -Labels $labels -ExistingLabelSet $existingLabelSet -DryRunMode:$DryRun
    $createdIssues += $result
  }

  Write-Host ""
  Write-Host "Repository: $resolvedRepo" -ForegroundColor Cyan
  Write-Host "Epics processed: $($createdEpics.Count)" -ForegroundColor Cyan
  Write-Host "Issues processed: $($createdIssues.Count)" -ForegroundColor Cyan
  Write-Host ""

  foreach ($item in $createdEpics + $createdIssues) {
    $prefix = switch ($item.status) {
      "created"  { "[CREATED]" }
      "existing" { "[EXISTS]" }
      "dry-run"  { "[DRY RUN]" }
      default    { "[INFO]" }
    }

    if ($item.url) {
      Write-Host "$prefix $($item.title) -> $($item.url)"
    } else {
      Write-Host "$prefix $($item.title)"
    }
  }
}
catch {
  Write-Error $_
  exit 1
}
