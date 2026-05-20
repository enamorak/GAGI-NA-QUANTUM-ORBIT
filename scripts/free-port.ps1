# Free port for GAGI NA QUANTUM ORBIT API
param([int]$Port = 3001)

$procIds = @()
netstat -ano | Select-String ":$Port\s" | ForEach-Object {
  if ($_ -match '\s+(\d+)\s*$') { $procIds += [int]$Matches[1] }
}
$procIds = $procIds | Select-Object -Unique | Where-Object { $_ -gt 0 }

if (-not $procIds) {
  Write-Host "Port $Port is free."
  exit 0
}

foreach ($procId in $procIds) {
  Write-Host "Stopping PID $procId on port $Port..."
  taskkill /PID $procId /F 2>$null
}
Write-Host "Port $Port cleared. Run: cd backend; npm run dev"
