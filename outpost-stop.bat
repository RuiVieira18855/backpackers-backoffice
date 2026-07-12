@echo off
REM ============================================================================
REM  Outpost — Stop dev server
REM  Duplo-clique para matar qualquer processo a ocupar a porta 3000.
REM ============================================================================

setlocal

echo A procurar processo em http://localhost:3000...

set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do (
    echo A parar PID %%a...
    taskkill /PID %%a /F >nul 2>&1
    set "FOUND=1"
)

if "%FOUND%"=="0" (
    echo Nenhum servico a correr em 3000.
) else (
    echo Servico parado.
)

timeout /t 2 >nul
endlocal
