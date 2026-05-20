# Start backend + frontend for local demo
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting API on http://localhost:3001 ..."
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$root\backend'; npm run dev"
)

Start-Sleep -Seconds 3

Write-Host "Starting Vite on http://localhost:5173 ..."
Set-Location "$root\frontend"
npm run dev
