#!/usr/bin/env pwsh

# Clear any existing Firebase authentication state
$configPath = "$env:USERPROFILE\.config\configstore\firebase-tokens.json"
if (Test-Path $configPath) {
    Remove-Item $configPath -Force -ErrorAction SilentlyContinue
}

Write-Host "Firebase configuration cleared. Attempting fresh login..." -ForegroundColor Green

# Try to login with CI token and provide the authorization code
Write-Host "Starting Firebase CI login..." -ForegroundColor Cyan

$authCode = "4/0AfrIepCjtjlrEDkysW8D9MMcONTLzbkQkYGpoNMVl31obRGiU_ZBAF0cyU6wFkZZwmMy9A"

# Use echo to pipe the auth code to the firebase command
Write-Host "Authenticating with Firebase..." -ForegroundColor Yellow
$result = $authCode | & firebase login:ci --no-localhost 2>&1
Write-Host $result

if ($LASTEXITCODE -eq 0) {
    Write-Host "Authentication successful!" -ForegroundColor Green
    Write-Host "Now deploying Firestore rules..." -ForegroundColor Cyan
    firebase deploy --only firestore:rules
} else {
    Write-Host "Authentication failed. Exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Output: $result" -ForegroundColor Red
}
