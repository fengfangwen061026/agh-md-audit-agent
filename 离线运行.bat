@echo off
cd /d "%~dp0"
node scripts/demo.mjs
if errorlevel 1 (pause & exit /b 1)
start "" outputs\index.html
