@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
for %%I in ("%~dp0.") do set "ZDC_ROOT=%%~fI"
start /wait "TEST" cmd /c "cd /d ""!ZDC_ROOT!"" && echo CHAIN_OK && npm -v"
echo PARENT_LINE
