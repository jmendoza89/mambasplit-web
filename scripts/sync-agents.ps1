param(
    [string]$TemplateAgentsPath
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
if (-not $TemplateAgentsPath) {
    $TemplateAgentsPath = Join-Path $repoRoot '..\agent-templates\agents'
}

$templatePath = Resolve-Path $TemplateAgentsPath
$templateRoot = Split-Path -Parent $templatePath
$targetPath = Join-Path $repoRoot '.github\agents'
$templateAgentsFile = Join-Path $templateRoot 'AGENTS.md'
$targetAgentsFile = Join-Path $repoRoot 'AGENTS.md'
$overrideAgentsFile = Join-Path $repoRoot 'AGENTS.repo.md'

New-Item -ItemType Directory -Path $targetPath -Force | Out-Null

Get-ChildItem -Path $targetPath -Filter '*.agent.md' -File | Remove-Item -Force
Copy-Item -Path (Join-Path $templatePath '*.agent.md') -Destination $targetPath -Force

if (-not (Test-Path $templateAgentsFile)) {
    throw "Shared AGENTS base file not found: $templateAgentsFile"
}

$baseContent = Get-Content $templateAgentsFile -Raw
$generatedContent = $baseContent.TrimEnd()

if (Test-Path $overrideAgentsFile) {
    $overrideContent = Get-Content $overrideAgentsFile -Raw
    if (-not [string]::IsNullOrWhiteSpace($overrideContent)) {
        $generatedContent += "`r`n`r`n## Repository-Specific Overrides`r`n"
        $generatedContent += $overrideContent.Trim()
    }
}

$generatedContent += "`r`n"
Set-Content -Path $targetAgentsFile -Value $generatedContent

Write-Host "Synced agent files from '$templatePath' to '$targetPath'."
Write-Host "Rebuilt '$targetAgentsFile' from '$templateAgentsFile' and optional '$overrideAgentsFile'."
