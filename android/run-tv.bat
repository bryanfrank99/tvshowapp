@echo off
REM TVShow en emulador Android TV: compila, arranca el AVD, instala y abre la app.
setlocal
set "JAVA_HOME=C:\Java\jdk-21.0.12.1+1"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%"
cd /d "%~dp0"

echo [1/4] Compilando APK debug...
call gradlew.bat :app:assembleDebug --no-daemon --console=plain
if errorlevel 1 ( echo ERROR compilando & pause & exit /b 1 )

echo [2/4] Buscando emulador...
for /f "tokens=*" %%a in ('adb devices ^| findstr /r "emulator.*device$"') do set "DEV=%%a"
if not defined DEV (
  echo Sin emulador activo. AVDs disponibles:
  emulator -list-avds
  echo.
  set /p AVD="Nombre del AVD (Enter = primero de la lista): "
  if not defined AVD (
    for /f "tokens=*" %%a in ('emulator -list-avds') do ( set "AVD=%%a" & goto :gotavd )
  )
  :gotavd
  echo Arrancando %AVD%...
  start "TV Emulator" emulator -avd "%AVD%" -no-snapshot-load
  echo Esperando al dispositivo...
  adb wait-for-device
  timeout /t 20 /nobreak >nul
)

echo [3/4] Instalando APK...
adb install -r "app\build\outputs\apk\debug\app-debug.apk"
if errorlevel 1 ( echo ERROR instalando & pause & exit /b 1 )

echo [4/4] Abriendo TVShow...
adb shell am start -n com.tvshow.app/.MainActivity
echo Listo. Usa el mando del emulador para navegar.
pause
