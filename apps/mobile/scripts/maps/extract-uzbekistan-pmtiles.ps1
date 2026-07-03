# Sellobay - Protomaps .pmtiles extract for Uzbekistan (Windows / PowerShell)
# ---------------------------------------------------------------------------
# What it does:
#   1) Downloads the go-pmtiles CLI into ./bin (if missing)
#   2) Finds the latest available planet build on build.protomaps.com
#   3) Extracts the Uzbekistan bbox into a small .pmtiles file (via HTTP range
#      requests - it does NOT download the whole planet)
#
# Run (inside this folder):
#   powershell -ExecutionPolicy Bypass -File .\extract-uzbekistan-pmtiles.ps1
#
# Optional params:
#   -MaxZoom 15         -> buildings visible (bigger file). Default 14 (streets)
#   -BBox "..."         -> other area: MIN_LON,MIN_LAT,MAX_LON,MAX_LAT
#   -OutFile ...        -> output file name
#   -BuildDate yyyyMMdd -> force a specific build date (if auto-detect fails)
#
# NOTE (ASCII only on purpose): Windows PowerShell 5.1 mis-parses UTF-8 files
# without BOM, so this script avoids non-ASCII characters.

param(
  [string]$BBox            = "55.9,37.1,73.2,45.6",
  [int]   $MaxZoom         = 14,
  [string]$OutFile         = "uzbekistan.pmtiles",
  [string]$BuildDate       = "",
  [int]   $DownloadThreads = 8,      # ko'proq parallel so'rov (sekin/uzoq ulanish uchun)
  [string]$Overfetch       = "0.2"   # so'rovlarni birlashtirish (round-trip kamayadi). String = lokal vergul muammosidan qochish
)

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"
$ver = "1.30.3"
$dir = $PSScriptRoot
$bin = Join-Path $dir "bin"
$exe = Join-Path $bin "pmtiles.exe"

Write-Host "== Sellobay: Uzbekistan .pmtiles extract ==" -ForegroundColor Cyan

# 1) go-pmtiles CLI (into ./bin so bundled files do not overwrite ours)
if (-not (Test-Path $exe)) {
  $url = "https://github.com/protomaps/go-pmtiles/releases/download/v$ver/go-pmtiles_${ver}_Windows_x86_64.zip"
  $zip = Join-Path $dir "go-pmtiles.zip"
  Write-Host "[1/3] Downloading go-pmtiles $ver ..."
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  Expand-Archive -Path $zip -DestinationPath $bin -Force
  Remove-Item $zip -Force
} else {
  Write-Host "[1/3] pmtiles.exe already present."
}

# 2) Find the latest available Protomaps build.
#    NOTE: Windows PowerShell 5.1 Invoke-WebRequest cannot set the 'Range'
#    header, so we probe with curl.exe (ships with Windows 10/11).
if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
  throw "curl.exe not found. Update Windows 10/11, or pass -BuildDate yyyyMMdd."
}
$date = $BuildDate
if ($date) {
  Write-Host "[2/3] Using provided build date: $date"
} else {
  Write-Host "[2/3] Looking for the latest Protomaps build ..."
  for ($i = 1; $i -le 20; $i++) {
    $d = (Get-Date).AddDays(-$i).ToString("yyyyMMdd")
    $code = (curl.exe -s -o NUL -w "%{http_code}" -r 0-0 "https://build.protomaps.com/$d.pmtiles")
    if ($code -eq "206" -or $code -eq "200") { $date = $d; break }
  }
}
if (-not $date) { throw "No Protomaps build found in the last 20 days. Try: -BuildDate yyyyMMdd" }
$src = "https://build.protomaps.com/$date.pmtiles"
Write-Host "      Source: $src"

# 3) Extract
$out = Join-Path $dir $OutFile
Write-Host "[3/3] Extracting: bbox=$BBox  maxzoom=$MaxZoom  threads=$DownloadThreads  overfetch=$Overfetch"
Write-Host "      (this can take a few minutes - it pulls only the Uzbekistan area)"
& $exe extract $src $out --bbox=$BBox --maxzoom=$MaxZoom --download-threads=$DownloadThreads --overfetch=$Overfetch

if (-not (Test-Path $out)) { throw "Extract failed - output file was not created." }
$sizeMB = [math]::Round((Get-Item $out).Length / 1MB, 1)

Write-Host ""
Write-Host ("DONE  {0}  ({1} MB)" -f $out, $sizeMB) -ForegroundColor Green
Write-Host ""
Write-Host "Next steps (see README.md):" -ForegroundColor Yellow
Write-Host "  1) Upload to Cloudflare R2:"
Write-Host "     npx wrangler r2 object put BUCKET/uzbekistan.pmtiles --file `"$out`" --content-type application/octet-stream"
Write-Host "  2) R2 bucket -> Settings -> CORS Policy: paste r2-cors.json"
Write-Host "  3) Get a public URL (custom domain or r2.dev)"
Write-Host "  4) Put the URL into app.json -> expo.extra.pmtilesUrl"
