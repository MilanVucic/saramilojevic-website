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

Push-Location $PSScriptRoot
try {
    npm run check
    Assert-LastExitCode "Astro check"

    npm run build
    Assert-LastExitCode "Build"

    ssh @sshOptions $Remote "mkdir -p '$RemoteRoot'"
    Assert-LastExitCode "Creating remote web directory"

    scp @scpOptions -r .\dist\* "${Remote}:${RemoteRoot}/"
    Assert-LastExitCode "Uploading site"

    ssh @sshOptions $Remote "chmod -R a+rX '$RemoteRoot' && test -f '$RemoteRoot/index.html'"
    Assert-LastExitCode "Setting permissions and verifying deployment"

    Write-Host "Deployed Sara Milojevic website to ${Remote}:${RemoteRoot}"
} finally {
    Pop-Location
}
