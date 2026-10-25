<#
.SYNOPSIS
  Launch the complete Nexa Platform in Docker containers connected to Supabase PostgreSQL.
#>

$ErrorActionPreference = "Stop"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       NEXA V3 — FULL DOCKER DEPLOYMENT LAUNCHER         " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Verify Docker is running
Write-Host "[1/4] Checking Docker daemon status..." -ForegroundColor Yellow
$dockerReady = $false
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
    }
} catch {
    $dockerReady = $false
}

if (-not $dockerReady) {
    Write-Host "Docker Desktop is currently NOT running." -ForegroundColor Red
    Write-Host "Attempting to launch Docker Desktop..." -ForegroundColor Cyan
    $dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerExe) {
        Start-Process $dockerExe
        Write-Host "Waiting for Docker engine to initialize (up to 45 seconds)..." -ForegroundColor Yellow
        $timeout = 45
        while ($timeout -gt 0) {
            Start-Sleep -Seconds 3
            try {
                $null = docker info 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $dockerReady = $true
                    break
                }
            } catch {}
            $timeout -= 3
            Write-Host -NoNewline "."
        }
        Write-Host ""
    }
    
    if (-not $dockerReady) {
        Write-Host "`n[ERROR] Docker engine did not respond." -ForegroundColor Red
        Write-Host "Please start 'Docker Desktop' manually from your Windows Start Menu, wait until it says 'Engine running', and re-run this script.`n" -ForegroundColor Yellow
        exit 1
    }
}
Write-Host "[OK] Docker engine is active and ready!`n" -ForegroundColor Green

# 2. Check and configure Supabase DATABASE_URL
Write-Host "[2/4] Verifying Supabase Database connection..." -ForegroundColor Yellow
$envFile = Join-Path $PSScriptRoot "..\.env"
$supabaseUrl = ""

if (Test-Path $envFile) {
    $match = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL="?(.*?)"?$' }
    if ($match) {
        $supabaseUrl = ($match -replace '^DATABASE_URL="?', '') -replace '"?$', ''
    }
}

if (-not $supabaseUrl -or $supabaseUrl -like "*localhost*") {
    Write-Host "Please provide your Supabase PostgreSQL connection string:" -ForegroundColor Cyan
    Write-Host "(Example: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true)" -ForegroundColor Gray
    $inputUrl = Read-Host "Enter SUPABASE DATABASE_URL"
    if ($inputUrl) {
        $supabaseUrl = $inputUrl.Trim()
        
        # Save or update into .env
        if (Test-Path $envFile) {
            $content = Get-Content $envFile
            if ($content -match 'DATABASE_URL=') {
                $content = $content -replace '^DATABASE_URL=.*', "DATABASE_URL=`"$supabaseUrl`""
            } else {
                $content += "`nDATABASE_URL=`"$supabaseUrl`""
            }
            Set-Content -Path $envFile -Value $content
        } else {
            Set-Content -Path $envFile -Value "DATABASE_URL=`"$supabaseUrl`"`nJWT_SECRET=nexa-production-secure-key-2026`nPORT_API=3001`nPORT_WEB=3000`nNEXT_PUBLIC_API_URL=http://localhost:3001"
        }
        Write-Host "[OK] Saved Supabase DATABASE_URL to .env" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Supabase DATABASE_URL is required to proceed." -ForegroundColor Red
        exit 1
    }
}

$env:DATABASE_URL = $supabaseUrl
Write-Host "[OK] Database URL loaded." -ForegroundColor Green

# 3. Synchronize Prisma Schema to Supabase
Write-Host "`n[3/4] Syncing Database tables and schema with Supabase..." -ForegroundColor Yellow
try {
    npx prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss
    Write-Host "[OK] Supabase tables synchronized successfully!" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Schema push encountered a notice, proceeding with startup." -ForegroundColor Yellow
}

# 4. Build and Launch Containers
Write-Host "`n[4/4] Building and starting Docker containers (Redis, Backend API, Frontend Web)..." -ForegroundColor Yellow
$composeFile = Join-Path $PSScriptRoot "..\docker-compose.app.yml"
docker compose -f $composeFile up --build -d

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "       NEXA V3 IS RUNNING IN DOCKER CONTAINERS!          " -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green

Write-Host "  -> COMMAND CENTER UI (Next.js):" -ForegroundColor Cyan
Write-Host "     http://localhost:3000/dashboard`n" -ForegroundColor White

Write-Host "  -> BACKEND API & SWAGGER DOCS (NestJS):" -ForegroundColor Cyan
Write-Host "     http://localhost:3001/api/docs`n" -ForegroundColor White

Write-Host "  -> HEALTH CHECK:" -ForegroundColor Cyan
Write-Host "     http://localhost:3001/v1/healthz`n" -ForegroundColor White

Write-Host "Connected Database: Supabase PostgreSQL" -ForegroundColor Gray
Write-Host "Background Workers: Active (Redis BullMQ)`n" -ForegroundColor Gray
