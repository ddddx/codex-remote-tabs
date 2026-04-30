@echo off
setlocal

echo Stopping Codex app-server and web controller ...

:: Kill by window title
taskkill /F /T /FI "WINDOWTITLE eq Codex AppServer 4792*" >nul 2>nul
taskkill /F /T /FI "WINDOWTITLE eq Codex Web 8787*" >nul 2>nul

:: Kill by port (fallback)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4792.*LISTENING"') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8787.*LISTENING"') do taskkill /PID %%a /F >nul 2>nul

echo Done.
endlocal
