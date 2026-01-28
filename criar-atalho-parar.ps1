# ==========================================
# CRIAR ATALHO PARA PARAR SERVIDOR
# ==========================================
# Cria atalho na área de trabalho para parar o servidor com segurança
# Data: 28/01/2026
# ==========================================

Write-Host ""
Write-Host "========================================"
Write-Host "  CRIAR ATALHO - PARAR SERVIDOR"
Write-Host "========================================"
Write-Host ""

# Obter caminho da área de trabalho
$desktopPath = [System.Environment]::GetFolderPath('Desktop')

# Caminho do iniciar.bat
$targetPath = Join-Path $PSScriptRoot "parar-servidor.bat"

# Caminho do atalho
$shortcutPath = Join-Path $desktopPath "Parar Servidor PDV.lnk"

# Criar objeto de atalho
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($shortcutPath)

# Configurar atalho
$Shortcut.TargetPath = $targetPath
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "Parar Servidor PDV/ERP Bomboniere"
$Shortcut.IconLocation = "shell32.dll,131"  # Ícone de "parar" vermelho

# Salvar atalho
$Shortcut.Save()

Write-Host "========================================"
Write-Host "   ATALHO CRIADO COM SUCESSO!"
Write-Host "========================================"
Write-Host ""
Write-Host "Um atalho foi criado na Area de Trabalho:"
Write-Host "  'Parar Servidor PDV'"
Write-Host ""
Write-Host "Agora o usuario pode:"
Write-Host "  1. Dar DUPLO CLIQUE neste atalho"
Write-Host "  2. Confirmar que deseja parar o servidor"
Write-Host "  3. O servidor sera parado com seguranca!"
Write-Host ""
Write-Host "Local do atalho: $desktopPath"
Write-Host ""
Write-Host "Pressione Enter para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
