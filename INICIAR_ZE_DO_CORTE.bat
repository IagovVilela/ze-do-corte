@echo off
title Zé do Corte - Iniciando...
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    INICIAR APLICACAO - Zé do Corte
echo    Next.js + Prisma + PostgreSQL
echo ========================================
echo.
echo NAO FECHE ESTA JANELA - Acompanhe o progresso abaixo.
echo.
echo Primeira vez ou erro de base de dados? Execute antes: PREPARAR_BASE.bat (Docker + Prisma)
echo.

REM --- Ir para a pasta deste script (raiz do projeto Next.js) ---
cd /d "%~dp0"
if errorlevel 1 (
    echo [ERRO] Nao foi possivel acessar a pasta do projeto.
    pause >nul
    exit /b 1
)
echo [INFO] Diretorio: %cd%
echo.

REM --- Node.js no PATH (instale Node 20+ de https://nodejs.org ) ---
where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao foi encontrado no PATH!
    echo.
    echo Instale Node.js 20 ou superior e tente novamente.
    echo.
    pause >nul
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
echo [INFO] Node: !NODE_VER!
echo.

echo [1/5] Verificando estrutura do projeto...

if not exist "package.json" (
    echo [ERRO] package.json nao encontrado!
    echo Este .bat deve ficar na raiz do projeto ze-do-corte.
    echo.
    pause >nul
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        echo [AVISO] Criando .env a partir de .env.example ...
        copy /y ".env.example" ".env" >nul
        echo [OK] Arquivo .env criado.
        echo.
        echo *** IMPORTANTE: edite o .env e preencha DATABASE_URL e as chaves Clerk ***
        echo.
        pause
    ) else (
        echo [ERRO] Arquivo .env nao encontrado e nao ha .env.example para copiar.
        echo.
        pause >nul
        exit /b 1
    )
)

echo [OK] Projeto encontrado!

echo.
echo [2/5] Verificando dependencias npm...

if not exist "node_modules\" (
    echo [AVISO] Executando npm install...
    call npm install --no-fund --no-audit
    if errorlevel 1 (
        echo [ERRO] Falha no npm install!
        pause >nul
        exit /b 1
    )
) else (
    echo [OK] node_modules presente.
)

echo.
echo [3/5] Gerando Prisma Client...

call npx prisma generate
if errorlevel 1 (
    echo [ERRO] prisma generate falhou!
    pause >nul
    exit /b 1
)

echo.
echo [4/5] Sincronizando schema com o banco (prisma db push)...
echo [INFO] Certifique-se de que o PostgreSQL esta rodando e DATABASE_URL esta correto no .env
echo.

call npx prisma db push
if errorlevel 1 (
    echo.
    echo [AVISO] prisma db push falhou - o servidor ainda pode subir, mas APIs que usam o banco podem falhar.
    echo.
    echo Se o erro foi P1001 (nao alcanca localhost:5432):
    echo   1) Inicie o servico PostgreSQL (services.msc - procure "postgresql").
    echo   2) Confirme USER e PASSWORD reais no .env - nao deixe USER:PASSWORD do exemplo.
    echo   3) Crie a base ze_do_corte no Postgres se ainda nao existir.
    echo   4) Guia completo: docs\operacao.md (secao Erro P1001)
    echo.
    echo Depois rode manualmente: npx prisma db push
    echo.
    timeout /t 6 /nobreak >nul
) else (
    echo [OK] Banco sincronizado!
)

echo.
echo [5/5] Iniciando servidor de desenvolvimento Next.js...
start "Next.js - Zé do Corte" cmd /k "cd /d %cd% && echo ========================================= && echo    ZE DO CORTE - NEXT.JS && echo ========================================= && echo. && echo Aplicacao: http://localhost:3000 && echo Admin: http://localhost:3000/admin ^(login Clerk^) && echo. && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo =========================================
echo    APLICACAO INICIADA
echo =========================================
echo.
echo Abra no navegador:
echo   http://localhost:3000
echo.
echo Painel admin ^(apos login Clerk^):
echo   http://localhost:3000/admin
echo.
echo Para parar: feche a janela do Next.js ou Ctrl+C nela.
echo.
echo Dados iniciais de servicos ^(opcional^):
echo   npm run db:seed
echo.
echo ========================================
echo Pressione qualquer tecla para FECHAR esta janela.
echo ========================================
pause >nul
