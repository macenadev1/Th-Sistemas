# Script para criar atalho na Área de Trabalho
# Execute UMA VEZ para facilitar o acesso ao sistema

$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = "$Desktop\PDV Bomboniere.lnk"

# Criar atalho
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "$PSScriptRoot\iniciar.bat"
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "Iniciar Sistema PDV/ERP Bomboniere"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,16"
$Shortcut.Save()

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   ATALHO CRIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Um atalho foi criado na Area de Trabalho:" -ForegroundColor White
Write-Host "  'PDV Bomboniere'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora o usuario pode:" -ForegroundColor White
Write-Host "  1. Dar DUPLO CLIQUE no atalho da Area de Trabalho" -ForegroundColor Yellow
Write-Host "  2. O sistema inicia automaticamente!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Local do atalho: $Desktop" -ForegroundColor Gray
Write-Host ""

pause
