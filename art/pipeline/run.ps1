# Whole chain from PowerShell: Blender (WSL) -> meshopt + manifest (node) -> contract validator.
#   powershell -ExecutionPolicy Bypass -File art\pipeline\run.ps1
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$full = (Resolve-Path $here).Path
$wslHere = '/mnt/' + $full.Substring(0, 1).ToLower() + $full.Substring(2).Replace('\', '/')
if (-not (Test-Path (Join-Path $here 'node_modules'))) { Push-Location $here; npm install --no-audit --no-fund; Pop-Location }
$sw = [Diagnostics.Stopwatch]::StartNew()
Write-Host '== 1. Blender build and export (WSL)'
Remove-Item -Recurse -Force (Join-Path $here 'out\standin.build') -ErrorAction SilentlyContinue
wsl -d Ubuntu -- bash "$wslHere/blender/blender_stage.sh" "$wslHere/out/standin.build" 2>&1 | Select-String -Pattern 'XALIANS_FACTS|Error|Traceback'
if (-not (Test-Path (Join-Path $here 'out\standin.build\standin.raw.glb'))) { throw 'Blender stage produced no glb' }
Write-Host '== 2. meshopt compression and manifest'
node (Join-Path $here 'contract\write_manifest.mjs') (Join-Path $here 'out\standin.build') (Join-Path $here 'out\standin')
if ($LASTEXITCODE -ne 0) { throw 'manifest stage failed' }
Write-Host '== 3. contract validator'
node (Join-Path $here 'contract\validate.mjs') (Join-Path $here 'out\standin')
$code = $LASTEXITCODE
Write-Host ("chain done in {0:N1} s" -f $sw.Elapsed.TotalSeconds)
exit $code
