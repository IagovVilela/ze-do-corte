@echo off
title Zé do Corte - Preparar PostgreSQL (Docker)
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo.
echo A executar preparacao automatica (Docker + Prisma)...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\preparar-postgres.ps1"
set "EXITCODE=%ERRORLEVEL%"

echo.
if %EXITCODE% neq 0 (
  echo [ERRO] Script terminou com codigo %EXITCODE%.
  pause
  exit /b %EXITCODE%
)

pause
