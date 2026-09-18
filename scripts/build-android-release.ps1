param(
    [string]$KeystorePath = (Join-Path $PSScriptRoot '..\private\dynamic-pilates-release.jks'),
    [string]$KeyAlias = 'dynamic-pilates'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$androidDir = Join-Path $projectRoot 'client\android'
$productionEnvPath = Join-Path $projectRoot 'client\.env.production'
$apkPath = Join-Path $androidDir 'app\build\outputs\apk\release\app-release.apk'
$defaultJavaHome = 'C:\Program Files\Android\Android Studio\jbr'
$defaultSdkRoot = 'C:\Users\fabio\AppData\Local\Android\Sdk'

if (-not $env:JAVA_HOME -and (Test-Path (Join-Path $defaultJavaHome 'bin\java.exe'))) {
    $env:JAVA_HOME = $defaultJavaHome
}
if (-not $env:ANDROID_SDK_ROOT -and (Test-Path $defaultSdkRoot)) {
    $env:ANDROID_SDK_ROOT = $defaultSdkRoot
}

if (-not (Test-Path -LiteralPath $env:JAVA_HOME -PathType Container)) {
    throw 'JDK não encontrado. Instale o Android Studio ou defina JAVA_HOME para um JDK 17 ou 21.'
}
if (-not (Test-Path -LiteralPath $env:ANDROID_SDK_ROOT -PathType Container)) {
    throw 'Android SDK não encontrado. Instale o SDK pelo Android Studio ou defina ANDROID_SDK_ROOT.'
}
$apiLine = if (Test-Path -LiteralPath $productionEnvPath -PathType Leaf) {
    Select-String -LiteralPath $productionEnvPath -Pattern '^\s*VITE_CLOUD_API_URL\s*=\s*([^#\s]+)' | Select-Object -First 1
}
if (-not $apiLine -or $apiLine.Matches[0].Groups[1].Value -notmatch '^https://') {
    throw "Configure client/.env.production com VITE_CLOUD_API_URL apontando para uma API HTTPS antes de gerar o APK."
}
$javaExecutable = Join-Path $env:JAVA_HOME 'bin\java.exe'
$javaVersionFile = Join-Path ([IO.Path]::GetTempPath()) ("zello-java-version-$([guid]::NewGuid()).txt")
try {
    Start-Process -FilePath $javaExecutable -ArgumentList '-version' -Wait -NoNewWindow -RedirectStandardError $javaVersionFile | Out-Null
    $javaVersionOutput = Get-Content -LiteralPath $javaVersionFile -Raw
} finally {
    Remove-Item -LiteralPath $javaVersionFile -Force -ErrorAction SilentlyContinue
}
if ($javaVersionOutput -notmatch 'version "(?:17|21)(?:\.\d+)*') {
    throw "JDK incompatível para este Gradle. Use JDK 17 ou 21; encontrado: $($javaVersionOutput.Trim())"
}
if (-not (Test-Path -LiteralPath $KeystorePath -PathType Leaf)) {
    throw "Keystore não encontrado em '$KeystorePath'. Crie o arquivo de produção antes de assinar o APK."
}

$storePassword = Read-Host 'Password do Key Store' -AsSecureString
$keyPassword = Read-Host 'Password da Key (Enter para reutilizar a do Key Store)' -AsSecureString
if ($keyPassword.Length -eq 0) { $keyPassword = $storePassword }

function ConvertTo-PlainText([Security.SecureString]$Value) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$env:ZELLO_KEYSTORE_PATH = (Resolve-Path -LiteralPath $KeystorePath).Path
$env:ZELLO_KEYSTORE_PASSWORD = ConvertTo-PlainText $storePassword
$env:ZELLO_KEY_ALIAS = $KeyAlias
$env:ZELLO_KEY_PASSWORD = ConvertTo-PlainText $keyPassword

try {
    Push-Location $projectRoot
    npm run android:sync
    Push-Location $androidDir
    .\gradlew.bat assembleRelease --no-daemon
    Pop-Location
} finally {
    Pop-Location
    Remove-Item Env:ZELLO_KEYSTORE_PATH, Env:ZELLO_KEYSTORE_PASSWORD, Env:ZELLO_KEY_ALIAS, Env:ZELLO_KEY_PASSWORD -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $apkPath -PathType Leaf)) {
    throw "O Gradle terminou sem gerar o APK esperado em '$apkPath'."
}

Write-Host "APK de release gerado: $apkPath"
Get-Item -LiteralPath $apkPath | Select-Object FullName, Length, LastWriteTime
Get-FileHash -Algorithm SHA256 -LiteralPath $apkPath
