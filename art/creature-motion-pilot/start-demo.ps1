param([int]$Port = 8765)

$ErrorActionPreference = 'Stop'
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
    $listener.Start()
} catch {
    throw "Port $Port is already in use. Choose another with ./start-demo.ps1 -Port 8766."
} finally {
    $listener.Stop()
}

$python = (Get-Command python -ErrorAction Stop).Source
$process = Start-Process -FilePath $python -ArgumentList @('-m', 'http.server', "$Port", '--bind', '127.0.0.1') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
Start-Sleep -Milliseconds 350
if ($process.HasExited) { throw 'The local server exited before the demo could start.' }
Write-Output "Demo: http://127.0.0.1:$Port/demo/"
Write-Output "Server process: $($process.Id). Stop it with Stop-Process -Id $($process.Id)."
