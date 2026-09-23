@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instale o Node.js LTS em https://nodejs.org e execute novamente.
 pause
 exit /b 1
)
call npm ci
if errorlevel 1 goto erro
call npm run dist
if errorlevel 1 goto erro
start "" "%~dp0dist"
echo Instalador gerado na pasta dist. Envie o arquivo Setup.exe aos amigos.
pause
exit /b 0
:erro
echo Erro ao gerar. Envie uma foto desta janela para suporte.
pause
