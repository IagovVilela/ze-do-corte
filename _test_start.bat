@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
for %%I in ("%~dp0.") do set "ZDC_ROOT=%%~fI"
echo Testing start line...
start "TEST-ZDC" cmd /k cd /d "!ZDC_ROOT!" ^&^& echo START_LINE_OK ^&^& timeout /t 3
