@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo        TVShow - Compilador de APK para Android TV
echo ========================================================

:: 1. Obtener la Key por parametro o preguntar interactivamente
set "TARGET_KEY=%~1"
if "%TARGET_KEY%"=="" (
    set /p "TARGET_KEY=Introduce la Key para embeber en la APK o presiona ENTER para estandar sin key: "
)

:: Limpiar espacios
for /f "tokens=* delims= " %%a in ("!TARGET_KEY!") do set "TARGET_KEY=%%a"

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "ANDROID_DIR=%PROJECT_DIR%\android"
set "ASSETS_DIR=%ANDROID_DIR%\app\src\main\assets"
set "KEY_FILE=%ASSETS_DIR%\default_key.txt"
set "APKS_DIR=%PROJECT_DIR%\apks"

if not exist "%APKS_DIR%" mkdir "%APKS_DIR%"
if not exist "%ASSETS_DIR%" mkdir "%ASSETS_DIR%"

:: 2. Configurar default_key.txt
if not "!TARGET_KEY!"=="" (
    echo [INFO] Configurando Key por defecto: !TARGET_KEY!
    <nul set /p="!TARGET_KEY!"> "%KEY_FILE%"
    set "APK_FILENAME=TVShow-!TARGET_KEY!.apk"
) else (
    echo [INFO] Compilando APK estandar sin key por defecto...
    if exist "%KEY_FILE%" del /f /q "%KEY_FILE%"
    set "APK_FILENAME=TVShow-standard.apk"
)

:: 3. Variables de entorno para Java y Android SDK
if "%JAVA_HOME%"=="" (
    if exist "C:\Program Files\Android\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    )
)
if "%ANDROID_HOME%"=="" (
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    )
)

set "PATH=%JAVA_HOME%\bin;C:\Program Files\Git\cmd;%PATH%"

echo [INFO] JAVA_HOME: %JAVA_HOME%
echo [INFO] ANDROID_HOME: %ANDROID_HOME%
echo.

:: 4. Compilar con Gradle
cd /d "%ANDROID_DIR%"
echo [INFO] Ejecutando Gradle assembleDebug...
call gradlew.bat :app:assembleDebug --no-daemon --console=plain

set "BUILD_RESULT=%ERRORLEVEL%"
if %BUILD_RESULT% neq 0 (
    echo.
    echo [ERROR] La compilacion de la APK ha fallado.
    if exist "%KEY_FILE%" del /f /q "%KEY_FILE%"
    cd /d "%PROJECT_DIR%"
    exit /b %BUILD_RESULT%
)

:: 5. Copiar APK generada
set "SOURCE_APK=%ANDROID_DIR%\app\build\outputs\apk\debug\app-debug.apk"
if not exist "%SOURCE_APK%" (
    echo [ERROR] No se encontro el archivo %SOURCE_APK%
    if exist "%KEY_FILE%" del /f /q "%KEY_FILE%"
    cd /d "%PROJECT_DIR%"
    exit /b 1
)

copy /y "%SOURCE_APK%" "%APKS_DIR%\!APK_FILENAME!" >nul
copy /y "%SOURCE_APK%" "%PROJECT_DIR%\!APK_FILENAME!" >nul

:: 6. Limpieza para mantener repositorio limpio
if exist "%KEY_FILE%" del /f /q "%KEY_FILE%"
cd /d "%PROJECT_DIR%"

echo.
echo ========================================================
echo  [EXITO] APK compilada correctamente:
echo  - %PROJECT_DIR%\!APK_FILENAME!
echo  - %APKS_DIR%\!APK_FILENAME!
echo ========================================================
echo.
