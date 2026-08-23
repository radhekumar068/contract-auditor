# Bootstrap Contract Auditor on Oracle Cloud VM from Windows.
# Usage: .\deploy\remote-setup.ps1 -OracleIp "YOUR_PUBLIC_IP"
param(
    [Parameter(Mandatory = $true)]
    [string]$OracleIp,

    [string]$SshUser = "ubuntu",
    [string]$SshKey = "$env:USERPROFILE\.ssh\id_ed25519"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SshKey)) {
    Write-Error "SSH key not found at $SshKey"
}

Write-Host "==> Testing SSH to ${SshUser}@${OracleIp}..."
ssh -i $SshKey -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "${SshUser}@${OracleIp}" "echo SSH_OK"
if ($LASTEXITCODE -ne 0) {
    Write-Error @"
SSH failed. Ensure:
  1. Public IP is correct (Oracle Console -> Compute -> Instances -> Public IP)
  2. Port 22 is open in Security List AND OS firewall
  3. Your public key was added when creating the VM:
     $(Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub")
"@
}

Write-Host "==> Running one-time server setup (10-20 min)..."
ssh -i $SshKey "${SshUser}@${OracleIp}" @"
set -e
git clone https://github.com/radhekumar068/contract-auditor.git ~/contract-auditor 2>/dev/null || (cd ~/contract-auditor && git pull --ff-only)
cd ~/contract-auditor
bash deploy/setup-server.sh
"@

if ($LASTEXITCODE -ne 0) {
    Write-Error "Setup failed. SSH in and check logs: ssh -i $SshKey ${SshUser}@${OracleIp}"
}

Write-Host ""
Write-Host "============================================"
Write-Host "  Deployment finished!"
Write-Host "  App:    http://${OracleIp}/"
Write-Host "  Health: http://${OracleIp}/api/health"
Write-Host "============================================"
