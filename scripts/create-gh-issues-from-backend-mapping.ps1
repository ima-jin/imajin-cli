param(
  [string]$MappingFile = "docs/v2/cli-ia/backend-mapping.top40.json",
  [string]$Repo = "",
  [switch]$DryRun,
  [ValidateSet("sprint_tier", "readiness", "namespace")]
  [string]$GroupBy = "sprint_tier"
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

function New-Issue {
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
      number = $existing.number
      title  = $existing.title
      url    = $existing.url
      status = "existing"
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
      number = $null
      title  = $Title
      url    = $null
      status = "dry-run"
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
    number = $issueNumber
    title  = $Title
    url    = ($url | Out-String).Trim()
    status = "created"
  }
}

function Get-GroupValue {
  param(
    [pscustomobject]$Command,
    [string]$Grouping
  )

  switch ($Grouping) {
    "sprint_tier" { return $Command.sprint_tier }
    "readiness" { return $Command.readiness }
    "namespace" {
      if ($Command.command -and ($Command.command -match "^([^.]+)\.")) {
        return $matches[1]
      }
      return "misc"
    }
    default { return "ungrouped" }
  }
}

function Get-OrderedGroups {
  param(
    [string[]]$Keys,
    [string]$Grouping
  )

  $order = switch ($Grouping) {
    "sprint_tier" { @("top3", "top10", "top40") }
    "readiness" { @("available_now", "available_with_adapter", "requires_new_backend") }
    default { @() }
  }

  if ($order.Count -eq 0) {
    return @($Keys | Sort-Object)
  }

  $known = @()
  foreach ($item in $order) {
    if ($Keys -contains $item) {
      $known += $item
    }
  }
  $unknown = @($Keys | Where-Object { $order -notcontains $_ } | Sort-Object)
  return @($known + $unknown)
}

function Get-BackendSummary {
  param([pscustomobject]$Command)

  if (-not $Command.backend) {
    return "No backend mapping provided."
  }

  switch ($Command.backend.kind) {
    "http" {
      $method = if ($Command.backend.method) { $Command.backend.method } else { "?" }
      $path = if ($Command.backend.path) { $Command.backend.path } else { "?" }
      $service = if ($Command.backend.service) { $Command.backend.service } else { "unknown-service" }
      $spec = if ($Command.backend.spec) { $Command.backend.spec } else { "unknown-spec" }
      return "HTTP $method $path (service: $service, spec: $spec)"
    }
    "agent_tool" {
      return "Agent tool: $($Command.backend.tool)"
    }
    "adapter" {
      $base = @($Command.backend.tooling_base)
      if ($base.Count -gt 0) {
        return "Adapter over: $($base -join ", ")"
      }
      return "Adapter implementation required."
    }
    "new_backend_contract" {
      return "Requires new backend contract: $($Command.backend.proposed_api)"
    }
    default {
      return "Backend kind: $($Command.backend.kind)"
    }
  }
}

try {
  Assert-Command -Name "gh"

  if (-not (Test-Path -Path $MappingFile)) {
    throw "Mapping file not found: $MappingFile"
  }

  $resolvedRepo = Resolve-RepoName -ExplicitRepo $Repo
  $existingLabelSet = Get-ExistingLabelSet -RepoName $resolvedRepo
  $mapping = Get-Content -Raw -Path $MappingFile | ConvertFrom-Json
  $commands = @($mapping.commands | Sort-Object rank)

  if ($commands.Count -eq 0) {
    throw "No commands found in mapping file: $MappingFile"
  }

  $commandsByGroup = @{}
  foreach ($cmd in $commands) {
    $group = Get-GroupValue -Command $cmd -Grouping $GroupBy
    if (-not $commandsByGroup.ContainsKey($group)) {
      $commandsByGroup[$group] = @()
    }
    $commandsByGroup[$group] += $cmd
  }

  $orderedGroups = Get-OrderedGroups -Keys @($commandsByGroup.Keys) -Grouping $GroupBy

  $epicLookup = @{}
  $createdEpics = @()
  foreach ($group in $orderedGroups) {
    $groupCommands = @($commandsByGroup[$group] | Sort-Object rank)
    $epicTitle = "[CLI v2][Map][${GroupBy}:$group] Command Delivery"
    $epicBody = @(
      "Generated from mapping: $MappingFile",
      "Grouping strategy: $GroupBy",
      "Group: $group",
      "Command count: $($groupCommands.Count)",
      "",
      "Scope summary:",
      ($groupCommands | ForEach-Object { "- [$($_.rank)] $($_.command)" })
    ) -join "`n"

    $epicLabels = @("cli-v2", "epic", "mapping-generated")
    $epicResult = New-Issue -RepoName $resolvedRepo -Title $epicTitle -Body $epicBody -Labels $epicLabels -ExistingLabelSet $existingLabelSet -DryRunMode:$DryRun
    $createdEpics += $epicResult
    $epicLookup[$group] = $epicResult
  }

  $createdIssues = @()
  foreach ($cmd in $commands) {
    $group = Get-GroupValue -Command $cmd -Grouping $GroupBy
    $parent = $epicLookup[$group]

    $title = "[CLI v2][Cmd][#$($cmd.rank)] $($cmd.command)"
    $namespace = if ($cmd.command -and ($cmd.command -match "^([^.]+)\.")) { $matches[1] } else { "misc" }
    $backendSummary = Get-BackendSummary -Command $cmd
    $bodyLines = @(
      "Parent Epic: " + $(if ($parent -and $parent.number) { "#$($parent.number)" } else { "${GroupBy}:$group" }),
      "Generated from mapping: $MappingFile",
      "",
      "Command: $($cmd.command)",
      "Signature: $($cmd.signature)",
      "Rank: $($cmd.rank)",
      "Sprint tier: $($cmd.sprint_tier)",
      "Readiness: $($cmd.readiness)",
      "Backend: $backendSummary",
      "",
      "Implementation checklist:",
      "- [ ] Confirm CLI arg parsing and validation behavior",
      "- [ ] Implement command handler and transport wiring",
      "- [ ] Add tests and JSON output fixtures",
      "- [ ] Document examples and edge cases"
    )
    if ($cmd.backend -and $cmd.backend.kind -eq "http" -and $cmd.backend.alternate_path) {
      $bodyLines += "Alternate path: $($cmd.backend.alternate_path)"
    }
    $body = $bodyLines -join "`n"

    $issueLabels = @(
      "cli-v2",
      "command",
      "mapping-generated",
      "sprint-$($cmd.sprint_tier)",
      "readiness-$($cmd.readiness)",
      "ns-$namespace",
      "epic-child"
    )
    $result = New-Issue -RepoName $resolvedRepo -Title $title -Body $body -Labels $issueLabels -ExistingLabelSet $existingLabelSet -DryRunMode:$DryRun
    $createdIssues += $result
  }

  Write-Host ""
  Write-Host "Repository: $resolvedRepo" -ForegroundColor Cyan
  Write-Host "Grouping: $GroupBy" -ForegroundColor Cyan
  Write-Host "Epics processed: $($createdEpics.Count)" -ForegroundColor Cyan
  Write-Host "Issues processed: $($createdIssues.Count)" -ForegroundColor Cyan
  Write-Host ""

  foreach ($item in $createdEpics + $createdIssues) {
    $prefix = switch ($item.status) {
      "created" { "[CREATED]" }
      "existing" { "[EXISTS]" }
      "dry-run" { "[DRY RUN]" }
      default { "[INFO]" }
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
