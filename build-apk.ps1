param(
    [string]$Key = ""
)

$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       TVShow - Compilador de APK para Android TV       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if ([string]::IsNullOrWhiteSpace($Key)) {
    $Key = Read-Host "Introduce la Key para embeber en la APK (o ENTER para estandar sin key)"
}

$Key = $Key.Trim()
$ProjectDir = $PSScriptRoot
$AndroidDir = Join-Path $ProjectDir "android"
$AssetsDir = Join-Path $AndroidDir "app\src\main\assets"
$KeyFile = Join-Path $AssetsDir "default_key.txt"
$ApksDir = Join-Path $ProjectDir "apks"

if (-not (Test-Path $ApksDir)) { New-Item -ItemType Directory -Path $ApksDir | Out-Null }
if (-not (Test-Path $AssetsDir)) { New-Item -ItemType Directory -Path $AssetsDir | Out-Null }

try {
    if (-not [string]::IsNullOrWhiteSpace($Key)) {
        Write-Host "[INFO] Configurando Key por defecto: $Key" -ForegroundColor Yellow
        [System.IO.File]::WriteAllText($KeyFile, $Key)
        $ApkFilename = "TVShow-$Key.apk"
    } else {
        Write-Host "[INFO] Compilando APK estandar (sin key por defecto)..." -ForegroundColor Yellow
        if (Test-Path $KeyFile) { Remove-Item -Force $KeyFile }
        $ApkFilename = "TVShow-standard.apk"
    }

    if (-not $env:JAVA_HOME -and (Test-Path "C:\Program Files\Android\Android Studio\jbr")) {
        $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
    }
    if (-not $env:ANDROID_HOME -and (Test-Path "$env:LOCALAPPDATA\Android\Sdk")) {
        $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    }
    $env:Path = "$env:JAVA_HOME\bin;C:\Program Files\Git\cmd;" + $env:Path

    Write-Host "[INFO] JAVA_HOME: $env:JAVA_HOME"
    Write-Host "[INFO] ANDROID_HOME: $env:ANDROID_HOME"
    Write-Host "[INFO] Ejecutando Gradle assembleDebug..." -ForegroundColor Green

    Set-Location $AndroidDir
    cmd.exe /c "gradlew.bat :app:assembleDebug --no-daemon --console=plain"
    if ($LASTEXITCODE -ne 0) {
        throw "Error al compilar APK con Gradle (exit code $LASTEXITCODE)"
    }

    $SourceApk = Join-Path $AndroidDir "app\build\outputs\apk\debug\app-debug.apk"
    if (-not (Test-Path $SourceApk)) {
        throw "No se encontro el archivo $SourceApk"
    }

    $Dest1 = Join-Path $ApksDir $ApkFilename
    $Dest2 = Join-Path $ProjectDir $ApkFilename

    Copy-Item -Path $SourceApk -Destination $Dest1 -Force
    Copy-Item -Path $SourceApk -Destination $Dest2 -Force

    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host " [EXITO] APK compilada correctamente:" -ForegroundColor Green
    Write-Host " - $Dest2" -ForegroundColor Green
    Write-Host " - $Dest1" -ForegroundColor Green
    Write-Host "========================================================`n" -ForegroundColor Cyan
} finally {
    if (Test-Path $KeyFile) {
        Remove-Item -Force $KeyFile -ErrorAction SilentlyContinue
    }
    Set-Location $ProjectDir
}
