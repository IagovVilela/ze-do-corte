@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
for %%I in ("%~dp0.") do set "ZDC_ROOT=%%~fI"
call npx prisma db push 2>&1
if errorlevel 1 (
    echo.
    echo [AVISO] prisma db push falhou
    echo Se o erro foi P1001 ^(nao alcanca localhost:5432^):
    echo   1^) Inicie o servico PostgreSQL ^(services.msc - procure "postgresql"^).
    echo   2^) Confirme USER e PASSWORD reais no .env
    echo   3^) Crie a base ze_do_corte no Postgres
    echo   4^) Guia completo: docs\operacao.md ^(secao Erro P1001^)
    echo.
    echo BLOCK_OK
) else (
    echo SYNC_OK
)
echo ZDC_ROOT=!ZDC_ROOT!
