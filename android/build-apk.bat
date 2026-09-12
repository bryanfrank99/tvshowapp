@echo off
REM Compila el APK debug de TVShow.
setlocal
if exist "C:\Program Files\Android\Android Studio\jbr" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
) else if exist "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot" (
    set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
)
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0"
call gradlew.bat :app:assembleDebug --no-daemon --console=plain
if errorlevel 1 ( echo ERROR compilando & pause & exit /b 1 )
echo.
echo APK en: app\build\outputs\apk\debug\app-debug.apk
pause
