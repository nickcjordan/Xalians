param(
    [string[]]$Species = @('avilily', 'bioflim', 'dromeus', 'akinza'),
    [switch]$Pass1,
    [switch]$Verify,
    [string]$Distribution = 'Ubuntu',
    [string]$BlenderPath = '/home/njord/.local/opt/blender-5.2.2-linux-x64/blender',
    [ValidateSet('auto', 'windows', 'wsl')][string]$Packager = 'auto',
    [string]$PythonPath = 'python',
    [string]$WslPackagerSite = '/home/njord/.local/lib/xalians-art-py'
)

# Renders species studies from their specs (blender/species/<name>.json) through the
# shared rig library in WSL Blender, then packs every comparison atlas.
#   ./build-blender.ps1                       # all four specs, then pack
#   ./build-blender.ps1 -Species dromeus      # one spec
#   ./build-blender.ps1 -Verify               # render each spec a second time to a scratch
#                                             # folder and require byte-identical frames
#   ./build-blender.ps1 -Pass1                # also rerun the first Avilily pass script,
#                                             # which replaces avilily_motion.blend
# Packaging needs Pillow and CairoSVG. If the Windows Python cannot load cairo, the packer
# runs on Blender's bundled Python inside WSL, installing the two packages into
# $WslPackagerSite on first use (no system Python is touched).

$ErrorActionPreference = 'Stop'
$study = Split-Path -Parent $MyInvocation.MyCommand.Path

function ConvertTo-LinuxPath([string]$WindowsPath) {
    $drive = $WindowsPath.Substring(0, 1).ToLowerInvariant()
    return "/mnt/$drive/" + ($WindowsPath.Substring(3) -replace '\\', '/')
}

$linuxStudy = ConvertTo-LinuxPath $study
$entry = "$linuxStudy/blender/build_species.py"

if ($Pass1) {
    $started = Get-Date
    & wsl.exe -d $Distribution -- $BlenderPath -b --factory-startup --python "$linuxStudy/blender/build_avilily.py" -- --render
    if ($LASTEXITCODE -ne 0) { throw 'Blender render failed for the first Avilily pass.' }
    Write-Output ("Rendered pass 1 in {0:n1} s" -f ((Get-Date) - $started).TotalSeconds)
}

foreach ($name in $Species) {
    $started = Get-Date
    & wsl.exe -d $Distribution -- $BlenderPath -b --factory-startup --python $entry -- "--species=species/$name.json" --render
    if ($LASTEXITCODE -ne 0) { throw "Blender render failed for $name." }
    Write-Output ("Rendered {0} in {1:n1} s" -f $name, ((Get-Date) - $started).TotalSeconds)
    if ($Verify) {
        $check = "set -e; out=`$(python3 -c `"import json;print(json.load(open('$linuxStudy/blender/species/$name.json'))['output'])`"); " +
            "tmp=`$HOME/xalians-verify/$name; rm -rf `$tmp; mkdir -p `$tmp; " +
            "$BlenderPath -b --factory-startup --python $entry -- --species=species/$name.json --render --out=`$tmp >/dev/null 2>&1; " +
            "bad=0; for f in `$(cd `$tmp && find . -name '*.png' -o -name meta.json); do cmp -s `$tmp/`$f $linuxStudy/`$out/`$f || { echo DIFF `$f; bad=1; }; done; " +
            "test `$bad -eq 0 && echo '$name reproduces byte for byte' || { echo '$name is NOT reproducible'; exit 1; }"
        & wsl.exe -d $Distribution -- bash -c $check
        if ($LASTEXITCODE -ne 0) { throw "Reproducibility check failed for $name." }
    }
}

$useWindows = $false
if ($Packager -ne 'wsl') {
    & $PythonPath -c 'import cairosvg, PIL' 2>$null
    $useWindows = ($LASTEXITCODE -eq 0)
    if (-not $useWindows -and $Packager -eq 'windows') { throw 'The Windows Python cannot import cairosvg and PIL.' }
}

$started = Get-Date
if ($useWindows) {
    & $PythonPath (Join-Path $study 'build.py')
} else {
    $blenderPython = (Split-Path -Parent $BlenderPath) + '/5.2/python/bin/python3.13'
    $command = "set -e; export PYTHONPATH=$WslPackagerSite; " +
        "$blenderPython -c 'import cairosvg, PIL' 2>/dev/null || $blenderPython -m pip install --quiet --target $WslPackagerSite 'Pillow>=11,<13' 'CairoSVG>=2.7,<3'; " +
        "cd $linuxStudy && $blenderPython build.py"
    & wsl.exe -d $Distribution -- bash -c $command
}
if ($LASTEXITCODE -ne 0) { throw 'Comparison packaging failed.' }
Write-Output ("Packed the comparison atlases in {0:n1} s ({1})" -f ((Get-Date) - $started).TotalSeconds, $(if ($useWindows) { 'Windows Python' } else { 'WSL Blender Python' }))
Write-Output "Built Blender animation and comparison atlases at $study"
