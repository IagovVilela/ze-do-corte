#Requires -Version 5.1
<#
  Sobe PostgreSQL em Docker, ajusta DATABASE_URL no .env e executa prisma db push (+ seed opcional).
  Executar na raiz do projeto:  powershell -ExecutionPolicy Bypass -File scripts\preparar-postgres.ps1
#>
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$DbUrlLine = 'DATABASE_URL="postgresql://postgres:ze_docorte_dev@localhost:5432/ze_do_corte?schema=public"'

Write-Host ""
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "  Zé do Corte - Preparar PostgreSQL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Docker
try {
  docker version | Out-Null
} catch {
  Write-Host "[ERRO] Docker nao encontrado. Instale Docker Desktop e tente de novo." -ForegroundColor Red
  exit 1
}

Write-Host "[1/5] A subir o container PostgreSQL (docker compose)..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
  Write-Host "[ERRO] docker compose falhou. Se a porta 5432 estiver ocupada por outro Postgres, pare esse servico ou altere a porta em docker-compose.yml." -ForegroundColor Red
  exit 1
}

Write-Host "[2/5] A aguardar a base ficar pronta..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  docker compose exec -T postgres pg_isready -U postgres -d ze_do_corte 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 1
}
if (-not $ready) {
  Write-Host "[ERRO] Timeout a aguardar PostgreSQL. Veja: docker compose logs postgres" -ForegroundColor Red
  exit 1
}
Write-Host "      PostgreSQL OK." -ForegroundColor Green

$envFile = Join-Path $ProjectRoot ".env"
$exampleFile = Join-Path $ProjectRoot ".env.example"

Write-Host "[3/5] A configurar .env (DATABASE_URL)..." -ForegroundColor Yellow
if (-not (Test-Path $envFile)) {
  if (Test-Path $exampleFile) {
    Copy-Item $exampleFile $envFile
    Write-Host "      Criado .env a partir de .env.example" -ForegroundColor Green
  } else {
    Set-Content -Path $envFile -Value @(
      $DbUrlLine,
      "",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=",
      "CLERK_SECRET_KEY=",
      "NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in",
      "NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-in",
      "ADMIN_EMAILS="
    ) -Encoding UTF8
    Write-Host "      Criado .env minimo" -ForegroundColor Green
  }
}

$lines = Get-Content $envFile -ErrorAction Stop
$out = New-Object System.Collections.Generic.List[string]
$replaced = $false
foreach ($line in $lines) {
  if ($line -match '^\s*DATABASE_URL\s*=') {
    [void]$out.Add($DbUrlLine)
    $replaced = $true
  } else {
    [void]$out.Add($line)
  }
}
if (-not $replaced) {
  [void]$out.Add($DbUrlLine)
}
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($envFile, $out.ToArray(), $utf8NoBom)
Write-Host "      DATABASE_URL aponta para o container local." -ForegroundColor Green

Write-Host "[4/5] prisma generate + db push..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit 1 }
npx prisma db push
if ($LASTEXITCODE -ne 0) {
  Write-Host "[ERRO] prisma db push falhou." -ForegroundColor Red
  exit 1
}

Write-Host "[5/5] Seed de servicos (opcional)..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
  Write-Host "[AVISO] db:seed falhou - pode executar depois: npm run db:seed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================"  -ForegroundColor Green
Write-Host "  Concluido." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Postgres Docker: localhost:5432" -ForegroundColor White
Write-Host "  User / pass: postgres / ze_docorte_dev" -ForegroundColor White
Write-Host "  Base: ze_do_corte" -ForegroundColor White
Write-Host ""
Write-Host "  Proximo passo: npm run dev" -ForegroundColor Cyan
Write-Host ""
