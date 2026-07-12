@echo off
REM ============================================================================
REM  Outpost — Restart dev server (util depois de mexer em .env.local)
REM ============================================================================

setlocal
cd /d "%~dp0"

call "%~dp0outpost-stop.bat"
timeout /t 2 >nul
call "%~dp0outpost-start.bat"

endlocal
