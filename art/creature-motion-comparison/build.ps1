param(
    [Parameter(Mandatory = $true)][string]$GodotPath,
    [string]$PythonPath = 'python'
)

$ErrorActionPreference = 'Stop'
$study = Split-Path -Parent $MyInvocation.MyCommand.Path
$pilot = Join-Path (Split-Path -Parent $study) 'creature-motion-pilot'
$pilotProject = Join-Path $pilot 'godot'
$modelProject = Join-Path $study 'godot3d'

if (-not (Test-Path -LiteralPath $GodotPath -PathType Leaf)) { throw "Godot executable not found: $GodotPath" }

if (-not (Test-Path -LiteralPath (Join-Path $pilot 'exports/avilily/action/000.png'))) {
    & (Join-Path $pilot 'build.ps1') -GodotPath $GodotPath -PythonPath $PythonPath
}

function Invoke-Render {
    param([string]$Project, [string]$Script, [string]$Log)
    $run = Start-Process -FilePath $GodotPath -WorkingDirectory $Project -ArgumentList @('--path', $Project, '--script', $Script, '--log-file', $Log) -WindowStyle Hidden -PassThru -Wait
    if ($run.ExitCode -ne 0) { throw "Godot render failed: $Script ($($run.ExitCode))" }
    if (Select-String -LiteralPath (Join-Path $Project $Log) -Pattern 'ERROR:' -Quiet) { throw "Godot logged a render error: $Log" }
}

Invoke-Render -Project $pilotProject -Script 'res://render_hybrid_base.gd' -Log 'hybrid-render.log'
Invoke-Render -Project $modelProject -Script 'res://render.gd' -Log 'render.log'
& $PythonPath (Join-Path $study 'build.py')
if ($LASTEXITCODE -ne 0) { throw 'Comparison packaging failed.' }
Write-Output "Built Avilily motion study at $study"
