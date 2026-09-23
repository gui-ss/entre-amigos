@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instale o Node.js LTS em https://nodejs.org e execute novamente.
 pause
 exit /b 1
)
if not exist node_modules\electron\dist\electron.exe (
 call npm ci
 if errorlevel 1 goto erro
)
call npm start
if errorlevel 1 goto erro
exit /b 0
:erro
echo Nao foi possivel iniciar. Envie uma foto desta mensagem para suporte.
pause
