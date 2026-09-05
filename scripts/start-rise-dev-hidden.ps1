param(
  [int]$Port = 5173
)

$root = Split-Path -Parent $PSScriptRoot
$next = Join-Path $root "node_modules\next\dist\bin\next"
$logDir = Join-Path $env:LOCALAPPDATA "Temp\opencode"

if (-not (Test-Path -LiteralPath $next)) { throw "Next.js was not found in this workspace." }
if (-not (Test-Path -LiteralPath $logDir)) { throw "OpenCode log directory was not found." }

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
  $isRise = $process -and $process.CommandLine.IndexOf($root, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and $process.CommandLine.IndexOf("\node_modules\next\", [StringComparison]::OrdinalIgnoreCase) -ge 0
  if ($isRise) {
    [pscustomobject]@{ reused = $true; pid = $listener.OwningProcess; port = $Port }
    return
  }
  throw "Port $Port is already used by another process."
}

$process = Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList @($next, "dev", "-H", "0.0.0.0", "-p", "$Port") -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir "rise-next-dev.stdout.log") -RedirectStandardError (Join-Path $logDir "rise-next-dev.stderr.log") -PassThru
[pscustomobject]@{ reused = $false; pid = $process.Id; port = $Port }
