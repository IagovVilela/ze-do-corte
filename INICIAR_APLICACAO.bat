@echo off
title Reviews Platform - Iniciando...
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    INICIAR APLICACAO - Reviews Platform
echo ========================================
echo.
echo NAO FECHE ESTA JANELA - Acompanhe o progresso abaixo.
echo.

REM --- Usar PHP do Laragon quando existir ---
set "LARAGON_PHP="
if defined LARAGON_ROOT (
    for /d %%d in ("%LARAGON_ROOT%\bin\php\php-*") do (
        set "LARAGON_PHP=%%d"
        goto :laragon_path_done
    )
)
REM Tentar C:\laragon - qualquer versao php-8.x
if not defined LARAGON_PHP if exist "C:\laragon\bin\php\" (
    for /d %%d in ("C:\laragon\bin\php\php-*") do (
        set "LARAGON_PHP=%%d"
        goto :laragon_path_done
    )
)
REM Tentar D:\laragon
if not defined LARAGON_PHP if exist "D:\laragon\bin\php\" (
    for /d %%d in ("D:\laragon\bin\php\php-*") do (
        set "LARAGON_PHP=%%d"
        goto :laragon_path_done
    )
)
REM Fallback: versoes fixas comuns
if not defined LARAGON_PHP if exist "C:\laragon\bin\php\php-8.2.0" set "LARAGON_PHP=C:\laragon\bin\php\php-8.2.0"
if not defined LARAGON_PHP if exist "C:\laragon\bin\php\php-8.1.0" set "LARAGON_PHP=C:\laragon\bin\php\php-8.1.0"
if not defined LARAGON_PHP if exist "C:\laragon\bin\php\php-8.3.0" set "LARAGON_PHP=C:\laragon\bin\php\php-8.3.0"
if not defined LARAGON_PHP if exist "C:\laragon\bin\php\php-8.4.0" set "LARAGON_PHP=C:\laragon\bin\php\php-8.4.0"
:laragon_path_done
if defined LARAGON_PHP (
    set "PATH=%LARAGON_PHP%;%PATH%"
    if defined LARAGON_ROOT set "PATH=%LARAGON_ROOT%\bin;%PATH%"
    echo [INFO] PHP do Laragon: !LARAGON_PHP!
) else (
    echo [INFO] Usando PHP do PATH do sistema.
)
echo.

REM Verificar se PHP esta disponivel antes de continuar
php -v >nul 2>&1
if errorlevel 1 (
    echo [ERRO] PHP nao foi encontrado!
    echo.
    echo Se voce usa Laragon: abra o Laragon e clique em "Start All" antes de rodar este script.
    echo Ou verifique se a pasta do Laragon existe em C:\laragon ou D:\laragon
    echo.
    echo Pressione qualquer tecla para fechar.
    pause >nul
    exit /b 1
)
echo.

cd /d "%~dp0reviews-platform"
if errorlevel 1 (
    echo [ERRO] Nao foi possivel acessar a pasta reviews-platform.
    echo Caminho tentado: %~dp0reviews-platform
    echo.
    echo Pressione qualquer tecla para fechar.
    pause >nul
    exit /b 1
)
echo [INFO] Diretorio: %cd%
echo.

echo [1/7] Verificando estrutura do projeto...

if not exist "app" (
    echo [ERRO] Projeto nao encontrado!
    echo Diretorio atual: %cd%
    echo.
    echo Pressione qualquer tecla para fechar.
    pause >nul
    exit /b 1
)

if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado!
    echo.
    echo Pressione qualquer tecla para fechar.
    pause >nul
    exit /b 1
)

echo [OK] Projeto encontrado!

echo.
echo [2/7] Verificando dependencias...

if not exist "vendor\autoload.php" (
    echo [AVISO] Instalando dependencias do Composer...
    composer install --no-interaction --ignore-platform-reqs
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias!
        echo.
        echo Pressione qualquer tecla para fechar.
        pause >nul
        exit /b 1
    )
)

echo [OK] Dependencias verificadas!

echo.
echo [3/7] Verificando chave da aplicacao...
php -v 2>&1
php artisan key:generate --no-interaction 2>&1
echo [OK] Chave da aplicacao verificada!

echo.
echo [4/7] Verificando conexao com MySQL...

php test_mysql_connection.php 2>&1
if errorlevel 1 (
    echo [ERRO] Falha na conexao com MySQL!
    echo Verifique se o Laragon esta com o MySQL ativo: Menu Laragon - MySQL - Start
    echo.
    echo Pressione qualquer tecla para fechar.
    pause >nul
    exit /b 1
)

echo [OK] Conexao com MySQL OK!

echo.
echo [5/7] Configurando banco de dados...

REM Executar migrations
php artisan migrate --force >nul 2>&1
if errorlevel 1 (
    echo [AVISO] Verificando migrations...
    php artisan migrate --force
) else (
    echo [OK] Migrations executadas!
)

REM Criar usuario admin se nao existir
php artisan db:seed --class=AdminUserSeeder >nul 2>&1

echo [OK] Banco de dados configurado!

echo.
echo [6/7] Configurando storage...

if not exist "public\storage" (
    php artisan storage:link >nul 2>&1
)

php artisan config:clear >nul 2>&1
php artisan cache:clear >nul 2>&1
php artisan view:clear >nul 2>&1

echo [OK] Storage configurado!

echo.
echo [7/7] Iniciando servidor Laravel...
start "Laravel Backend - Reviews Platform" cmd /k "cd /d %cd% && echo ========================================= && echo    REVIEWS PLATFORM - LARAVEL && echo ========================================= && echo. && echo Servidor iniciando... && echo. && php artisan serve && echo. && echo Acesse: http://localhost:8000 && pause"

timeout /t 2 /nobreak >nul

echo.
echo =========================================
echo    APLICACAO INICIADA COM SUCESSO!
echo =========================================
echo.
echo Acesse a aplicacao em:
echo.
echo   http://localhost:8000
echo.
echo Credenciais de acesso:
echo   Email: admin@reviewsplatform.com
echo   Senha: admin123
echo.
echo Para parar o servidor:
echo   - Feche a janela que abriu
echo   - Ou pressione Ctrl+C na janela
echo.
echo Esta janela pode ser fechada agora.
echo.
echo ========================================
echo Pressione qualquer tecla para FECHAR esta janela.
echo ========================================
pause >nul
