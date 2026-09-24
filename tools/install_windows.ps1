# Adds Iepen Fryske Stavering to Word for Windows (or removes it with -Uninstall).
# Downloads the add-in file into your own AppData folder and registers it with Word
# through the registry key Word reads developer add-ins from. No admin rights needed.
#
# Install:    powershell -ExecutionPolicy Bypass -File tools\install_windows.ps1
# Remove:     powershell -ExecutionPolicy Bypass -File tools\install_windows.ps1 -Uninstall
# Own copy:   ... -File tools\install_windows.ps1 -Url https://YOURNAME.github.io/iepen-fryske-stavering/
param(
  [string]$Url = 'https://iappyx.github.io/iepen-fryske-stavering/',
  [switch]$Uninstall
)
$ErrorActionPreference = 'Stop'

$Id   = '4cfd603f-3059-46d8-b1a7-99f9185f910e'          # <Id> in manifest.template.xml
$Key  = 'HKCU:\SOFTWARE\Microsoft\Office\16.0\Wef\Developer'
$Dir  = Join-Path $env:APPDATA 'IepenFryskeStavering'
$File = Join-Path $Dir 'iepen-fryske-stavering.xml'

if ($Uninstall) {
  if (Test-Path $Key) { Remove-ItemProperty -Path $Key -Name $Id -ErrorAction SilentlyContinue }
  if (Test-Path $Dir) { Remove-Item -Path $Dir -Recurse -Force }
  Write-Host 'Removed. Restart Word.'
  return
}

if ($Url -notmatch '^https://') { throw 'The address must start with https://' }
if (-not $Url.EndsWith('/')) { $Url += '/' }
$Origin = ([Uri]$Url).GetLeftPart([UriPartial]::Authority)

# Windows PowerShell 5.1 may not use TLS 1.2 by default
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# Download as a file and read it as UTF-8: the server sends no charset, and
# PowerShell 5.1 would otherwise garble the Frisian letters (ê, û).
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
$tmp = Join-Path $Dir 'template.tmp'
Invoke-WebRequest -Uri ($Url + 'manifest.template.xml') -OutFile $tmp -UseBasicParsing
$xml = [IO.File]::ReadAllText($tmp, [Text.Encoding]::UTF8)
Remove-Item $tmp
$xml = $xml.Replace('{{BASE_URL}}', $Url).Replace('{{ORIGIN}}', $Origin)
if ($xml -notmatch [regex]::Escape($Id)) { throw "Unexpected add-in file: it doesn't contain the add-in ID $Id." }
[IO.File]::WriteAllText($File, $xml, (New-Object Text.UTF8Encoding $false))

if (-not (Test-Path $Key)) { New-Item -Path $Key -Force | Out-Null }
New-ItemProperty -Path $Key -Name $Id -Value $File -PropertyType String -Force | Out-Null

Write-Host "Installed: $File"
Write-Host 'Quit Word completely and open it again, then choose Home > Iepen Fryske Stavering'
Write-Host '(or Home > Add-ins). To remove it, run this script again with -Uninstall.'
