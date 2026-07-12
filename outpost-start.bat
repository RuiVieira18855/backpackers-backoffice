@echo off
REM ============================================================================
REM  Outpost — Start dev server + open browser
REM  Duplo-clique para arrancar o backoffice em http://localhost:3000
REM ============================================================================

setlocal
cd /d "%~dp0"

REM Verifica se a porta 3000 ja esta ocupada.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do (
    echo Ja existe um servico em http://localhost:3000 ^(PID %%a^).
    echo Se e o Outpost, abre no browser. Se e outro, executa outpost-stop.bat primeiro.
    timeout /t 3 >nul
    start "" http://localhost:3000
    exit /b 0
)

REM Confirma que o Node esta instalado.
where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado no PATH.
    echo Instala em https://nodejs.org e volta a correr.
    pause
    exit /b 1
)

REM Instala dependencias se node_modules nao existir.
if not exist "node_modules" (
    echo A instalar dependencias ^(primeira execucao^)...
    call npm install
    if errorlevel 1 (
        echo [ERRO] npm install falhou. Ve o output em cima.
        pause
        exit /b 1
    )
)

echo.
echo ============================================================
echo   Outpost a arrancar em http://localhost:3000
echo   Fecha esta janela para parar o servidor.
echo ============================================================
echo.

REM Abre o browser 5 segundos depois de arrancar o server.
start "" cmd /c "timeout /t 5 >nul & start http://localhost:3000"

REM Arranca o dev server em foreground para veres logs.
call npm run dev

endlocal
