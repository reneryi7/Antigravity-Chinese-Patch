@echo off
setlocal
chcp 65001 >nul 2>&1
pushd "%~dp0"

set "CLI_SCRIPT=%~dp0src\cli.js"
set "AG_HOST_EXE="

if exist "%LOCALAPPDATA%\Programs\Antigravity\Antigravity.exe" set "AG_HOST_EXE=%LOCALAPPDATA%\Programs\Antigravity\Antigravity.exe"
if not defined AG_HOST_EXE if exist "%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe" set "AG_HOST_EXE=%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe"
if not defined AG_HOST_EXE if exist "%ProgramFiles%\Antigravity\Antigravity.exe" set "AG_HOST_EXE=%ProgramFiles%\Antigravity\Antigravity.exe"

if not defined AG_HOST_EXE (
  where node.exe >nul 2>&1
  if not errorlevel 1 (
    node.exe "%CLI_SCRIPT%" uninstall %*
    set "PATCH_EXIT=%ERRORLEVEL%"
    goto :check_elevate
  )
)

if not defined AG_HOST_EXE (
  for /f "usebackq delims=" %%P in (`powershell -NoProfile -NonInteractive -Command "$r = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match '^Antigravity(\s|$)' -and $_.InstallLocation } | Select-Object -First 1; if ($r) { Join-Path $r.InstallLocation 'Antigravity.exe' }"`) do (
    if exist "%%~fP" set "AG_HOST_EXE=%%~fP"
  )
)

if defined AG_HOST_EXE (
  set "ELECTRON_RUN_AS_NODE=1"
  "%AG_HOST_EXE%" "%CLI_SCRIPT%" uninstall %*
  set "PATCH_EXIT=%ERRORLEVEL%"
  set "ELECTRON_RUN_AS_NODE="
) else (
  echo [ERROR] Could not find Google Antigravity or Node.js runtime.
  set "PATCH_EXIT=1"
  goto :finish
)

:check_elevate
if "%PATCH_EXIT%"=="77" (
  echo %* | findstr /i "\-\-elevated" >nul
  if errorlevel 1 (
    echo Requesting Administrator privileges to restore system-wide installation...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '%* --elevated' -Verb RunAs -Wait"
    set "PATCH_EXIT=%ERRORLEVEL%"
  )
)

:finish
popd
echo.
if not defined ANTIGRAVITY_PATCH_NO_PAUSE pause
endlocal & exit /b %PATCH_EXIT%
