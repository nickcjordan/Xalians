param(
    [Parameter(Mandatory = $true)][string]$GodotPath,
    [string]$PythonPath = 'python',
    [switch]$RebuildScenes
)

$ErrorActionPreference = 'Stop'
$pilot = Split-Path -Parent $MyInvocation.MyCommand.Path
$project = Join-Path $pilot 'godot'
$catalog = Get-Content (Join-Path $project 'catalog.json') -Raw | ConvertFrom-Json

function Invoke-Godot {
    param([string[]]$GodotArgs)
    $run = Start-Process -FilePath $GodotPath -WorkingDirectory $project -ArgumentList $GodotArgs -WindowStyle Hidden -PassThru -Wait
    return $run.ExitCode
}

function Test-ImportedPartsCurrent {
    foreach ($png in Get-ChildItem -LiteralPath (Join-Path $project 'assets') -Recurse -Filter '*.png' -File) {
        $importFile = "$($png.FullName).import"
        if (-not (Test-Path -LiteralPath $importFile)) { $script:importFailure = $importFile; return $false }
        $remap = Get-Content -LiteralPath $importFile | Where-Object { $_ -match '^path="res://' } | Select-Object -First 1
        if ($remap -notmatch '^path="res://([^"]+)"$') { $script:importFailure = $importFile; return $false }
        $md5File = [System.IO.Path]::ChangeExtension((Join-Path $project $Matches[1]), '.md5')
        if (-not (Test-Path -LiteralPath $md5File)) { $script:importFailure = $md5File; return $false }
        $md5Line = Get-Content -LiteralPath $md5File -TotalCount 1
        if ($md5Line -notmatch '^source_md5="([0-9a-f]+)"$') { $script:importFailure = $md5File; return $false }
        $expected = $Matches[1]
        $actual = (Get-FileHash -LiteralPath $png.FullName -Algorithm MD5).Hash.ToLowerInvariant()
        if ($actual -ne $expected) { $script:importFailure = $png.FullName; return $false }
    }
    return $true
}

if (-not (Test-Path -LiteralPath $GodotPath -PathType Leaf)) {
    throw "Godot executable not found: $GodotPath"
}

& $PythonPath (Join-Path $pilot 'tools/export_parts.py')
if ($LASTEXITCODE -ne 0) { throw 'SVG part export failed.' }

for ($attempt = 1; $attempt -le 5; $attempt++) {
    if ((Invoke-Godot -GodotArgs @('--headless', '--path', '.', '--import')) -ne 0) { throw 'Godot asset import failed.' }
    if (Test-ImportedPartsCurrent) { break }
    if ($attempt -eq 5) { throw "Godot did not finish importing the current raster parts. Check $script:importFailure" }
}

$missingScenes = @($catalog.species.PSObject.Properties.Name | Where-Object { -not (Test-Path (Join-Path $project "scenes/$_.tscn")) })
if ($RebuildScenes -or $missingScenes.Count -gt 0) {
    if ((Invoke-Godot -GodotArgs @('--headless', '--path', '.', '--script', 'res://build_scenes.gd')) -ne 0) {
        if ((Invoke-Godot -GodotArgs @('--headless', '--path', '.', '--import')) -ne 0) { throw 'Godot asset import retry failed.' }
        if ((Invoke-Godot -GodotArgs @('--headless', '--path', '.', '--script', 'res://build_scenes.gd')) -ne 0) { throw 'Godot scene build failed.' }
    }
}
$missingScenes = @($catalog.species.PSObject.Properties.Name | Where-Object { -not (Test-Path (Join-Path $project "scenes/$_.tscn")) })
if ($missingScenes.Count -gt 0) { throw "Rig scenes are missing for: $($missingScenes -join ', ')" }

foreach ($species in $catalog.species.PSObject.Properties.Name) {
    foreach ($clip in $catalog.species.$species.clips.PSObject.Properties.Name) {
        $info = Join-Path $pilot "exports/$species/$clip/render-info.json"
        if (Test-Path -LiteralPath $info) { Remove-Item -LiteralPath $info }
    }
}

$renderExit = Invoke-Godot -GodotArgs @('--path', '.', '--script', 'res://render_frames.gd', '--log-file', 'render.log')
if ($renderExit -ne 0) { throw "Godot frame render failed with exit code $renderExit." }
if (Select-String -LiteralPath (Join-Path $project 'render.log') -Pattern 'ERROR:' -Quiet) { throw 'Godot reported a render error. See godot/render.log.' }

& $PythonPath (Join-Path $pilot 'tools/package_frames.py')
if ($LASTEXITCODE -ne 0) { throw 'Frame packaging failed.' }

Write-Output "Built creature exports and previews in $pilot"
