param([int]$Port = 8766)

$ErrorActionPreference = 'Stop'
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
    $listener.Start()
} catch {
    throw "Port $Port is already in use. Choose another with ./start-comparison.ps1 -Port 8767."
} finally {
    $listener.Stop()
}

$python = (Get-Command python -ErrorAction Stop).Source
$artRoot = Split-Path -Parent $PSScriptRoot
$process = Start-Process -FilePath $python -ArgumentList @('-m', 'http.server', "$Port", '--bind', '127.0.0.1') -WorkingDirectory $artRoot -WindowStyle Hidden -PassThru
Start-Sleep -Milliseconds 350
if ($process.HasExited) { throw 'The local comparison server exited before startup.' }
Write-Output "Comparison: http://127.0.0.1:$Port/creature-motion-comparison/"
Write-Output "Server process: $($process.Id). Stop it with Stop-Process -Id $($process.Id)."
