param(
    [string]$Remote = "root@104.248.23.93",
    [string]$RemoteRoot = "/var/www/saramilojevic"
)

$ErrorActionPreference = "Stop"
$sshOptions = @(
    "-n",
    "-T",
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=15",
    "-o", "ServerAliveInterval=10",
    "-o", "ServerAliveCountMax=3"
)
$scpOptions = @(
    "-B",
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=15",
    "-o", "ServerAliveInterval=10",
    "-o", "ServerAliveCountMax=3"
)

function Assert-LastExitCode([string]$Step) {
    if ($LASTEXITCODE -ne 0) {
        throw "$Step failed with exit code $LASTEXITCODE."
    }
}

$deploymentId = [Guid]::NewGuid().ToString('N')
$archivePath = Join-Path ([System.IO.Path]::GetTempPath()) "saramilojevic-$deploymentId.tar.gz"
$remoteArchive = "/tmp/saramilojevic-$deploymentId.tar.gz"

Push-Location $PSScriptRoot
try {
    npm run check
    Assert-LastExitCode "Astro check"

    npm run build
    Assert-LastExitCode "Build"

    if (-not (Test-Path -LiteralPath .\dist\index.html)) {
        throw "Build output is missing dist/index.html."
    }

    tar.exe -czf $archivePath -C .\dist .
    Assert-LastExitCode "Creating deployment archive"

    scp @scpOptions $archivePath "${Remote}:${remoteArchive}"
    Assert-LastExitCode "Uploading deployment archive"

    ssh @sshOptions $Remote "mkdir -p '$RemoteRoot' && tar -xzf '$remoteArchive' -C '$RemoteRoot' && rm -f '$remoteArchive' && chmod -R a+rX '$RemoteRoot' && test -f '$RemoteRoot/index.html'"
    Assert-LastExitCode "Extracting and verifying deployment"

    Write-Host "Deployed Sara Milojevic website to ${Remote}:${RemoteRoot}"
} finally {
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    Pop-Location
}
