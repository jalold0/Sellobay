# Sellobay - Download MapLibre lib + Protomaps fonts/sprite for self-hosting on R2
# ---------------------------------------------------------------------------
# Downloads everything the map needs (except tiles) into ./assets so you can
# upload it to your R2 bucket -> fully self-hosted map, no external CDNs.
#
# Run:
#   powershell -ExecutionPolicy Bypass -File .\fetch-map-assets.ps1
#
# Then upload the 3 folders (maplibre, sprites, fonts) inside ./assets to your
# R2 bucket root, and set app.json -> expo.extra.mapAssetsBaseUrl to your r2.dev URL.
#
# ASCII only (Windows PS 5.1 UTF-8-no-BOM parser safety).

param(
  [string]$Dest = (Join-Path $PSScriptRoot "assets")
)

$ErrorActionPreference = "Stop"
$ml = "5.24.0"
$pm = "4.4.1"

function Get-File($url, $out) {
  $dir = Split-Path $out
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  curl.exe -s --ssl-no-revoke -L -o $out $url
  if (-not (Test-Path $out) -or (Get-Item $out).Length -eq 0) { throw "Download failed: $url" }
}

Write-Host "== Downloading map assets to $Dest ==" -ForegroundColor Cyan

# 1) MapLibre + pmtiles libraries
Write-Host "[1/3] libraries (maplibre-gl, pmtiles) ..."
Get-File "https://cdn.jsdelivr.net/npm/maplibre-gl@$ml/dist/maplibre-gl.js"  (Join-Path $Dest "maplibre\maplibre-gl.js")
Get-File "https://cdn.jsdelivr.net/npm/maplibre-gl@$ml/dist/maplibre-gl.css" (Join-Path $Dest "maplibre\maplibre-gl.css")
Get-File "https://cdn.jsdelivr.net/npm/pmtiles@$pm/dist/pmtiles.js"          (Join-Path $Dest "maplibre\pmtiles.js")

# 2) Sprite (icons) - light flavor
Write-Host "[2/3] sprite (light) ..."
foreach ($f in @("light.json", "light.png", "light@2x.json", "light@2x.png")) {
  Get-File "https://protomaps.github.io/basemaps-assets/sprites/v4/$f" (Join-Path $Dest "sprites\$f")
}

# 3) Fonts (glyphs) - Noto Sans stacks, Latin + Cyrillic ranges (UZ uz/ru/en)
Write-Host "[3/3] fonts (glyphs) ..."
$stacks = @("Noto Sans Regular", "Noto Sans Medium", "Noto Sans Italic")
$ranges = @("0-255", "256-511", "512-767", "768-1023", "1024-1279")
foreach ($s in $stacks) {
  $enc = $s -replace " ", "%20"
  foreach ($r in $ranges) {
    Get-File "https://protomaps.github.io/basemaps-assets/fonts/$enc/$r.pbf" (Join-Path $Dest "fonts\$s\$r.pbf")
  }
}

$count = (Get-ChildItem -Path $Dest -Recurse -File).Count
Write-Host ""
Write-Host ("DONE  {0} files in {1}" -f $count, $Dest) -ForegroundColor Green
Write-Host ""
Write-Host "Next: upload the 'maplibre', 'sprites', 'fonts' folders (inside assets\) to your R2 bucket root," -ForegroundColor Yellow
Write-Host "then set app.json -> expo.extra.mapAssetsBaseUrl to your r2.dev base URL (see README.md)."
