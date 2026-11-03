@echo off
rem Opens Professional Twin: installs dependencies the first time, starts the local server and opens the browser.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies for the first time...
  call npm install || goto :error
)
node scripts\open-twin.mjs || goto :error
goto :eof

:error
echo Something went wrong. Make sure Node.js 20 or later is installed: https://nodejs.org
pause
