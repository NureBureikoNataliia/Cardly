# Copy SRS modules into Edge Function _shared (run after changing src/lib/spacedRepetition).
# from repo root: powershell -File scripts/sync-srs-to-edge.ps1
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root "supabase\functions\_shared\spaced-repetition"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$files = @(
  "ankiScheduler.ts",
  "globalSettings.ts",
  "cardScheduling.ts",
  "dbTypes.ts",
  "dbMapping.ts"
)
foreach ($f in $files) {
  Copy-Item -Force (Join-Path $root "src\lib\spacedRepetition\$f") (Join-Path $dest $f)
}
Write-Host "Synced to $dest"
