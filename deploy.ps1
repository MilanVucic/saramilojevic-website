param(
    [string]$Remote = "root@77.237.241.199",
    [string]$RemoteRoot = "/var/www/saramilojevic"
)

$ErrorActionPreference = "Stop"
if ($RemoteRoot -notmatch '^/var/www/[A-Za-z0-9._/-]+$' -or $RemoteRoot.Split('/') -contains '..') {
    throw 'RemoteRoot must be a site-specific path below /var/www.'
}
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
$releaseId = (Get-Date -Format 'yyyyMMdd-HHmmss') + "-$deploymentId"
$remoteRelease = "$RemoteRoot/releases/$releaseId"

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

    ssh @sshOptions $Remote "mkdir -p '$remoteRelease' && tar -xzf '$remoteArchive' -C '$remoteRelease' && test -f '$remoteRelease/index.html' && chmod -R a+rX,go-w '$remoteRelease' && ln -sfn '$remoteRelease' '$RemoteRoot/.current-next' && mv -Tf '$RemoteRoot/.current-next' '$RemoteRoot/current' && rm -f '$remoteArchive'"
    Assert-LastExitCode "Extracting and activating release"

    Write-Host "Deployed Sara Milojevic release $releaseId to ${Remote}:$RemoteRoot/current"
} finally {
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    Pop-Location
}
