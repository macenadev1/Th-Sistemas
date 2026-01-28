# 🔍 Script de Verificação - Sistema PDV/ERP
# Execute para verificar se tudo está configurado corretamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificação do Sistema PDV/ERP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# 1. Verificar Node.js
Write-Host "1. Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Node.js não encontrado!" -ForegroundColor Red
        $allOk = $false
    }
} catch {
    Write-Host "   ❌ Erro ao verificar Node.js" -ForegroundColor Red
    $allOk = $false
}

# 2. Verificar MySQL
Write-Host "2. Verificando MySQL..." -ForegroundColor Yellow
$mysqlService = Get-Service MySQL* -ErrorAction SilentlyContinue
if ($mysqlService) {
    if ($mysqlService.Status -eq 'Running') {
        Write-Host "   ✅ MySQL rodando: $($mysqlService.DisplayName)" -ForegroundColor Green
    } else {
        Write-Host "   [!] MySQL instalado mas parado (Status: $($mysqlService.Status))" -ForegroundColor Yellow
        Write-Host "   [i] Execute: Start-Service $($mysqlService.Name)" -ForegroundColor Cyan
        $allOk = $false
    }
} else {
    Write-Host "   [X] MySQL nao encontrado!" -ForegroundColor Red
    $allOk = $false
}

# 3. Verificar dependências
Write-Host "3. Verificando dependências..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $deps = $packageJson.dependencies.PSObject.Properties.Count
    Write-Host "   ✅ node_modules existe ($deps dependências)" -ForegroundColor Green
} else {
    Write-Host "   [X] node_modules nao encontrado!" -ForegroundColor Red
    Write-Host "   [i] Execute: npm install" -ForegroundColor Cyan
    $allOk = $false
}

# 4. Verificar arquivos essenciais
Write-Host "4. Verificando arquivos essenciais..." -ForegroundColor Yellow
$arquivos = @(
    "src/server.js",
    "src/config/database.js",
    "database/database.sql",
    "public/index.html",
    "public/erp.html"
)

$missing = @()
foreach ($arquivo in $arquivos) {
    if (Test-Path $arquivo) {
        Write-Host "   ✅ $arquivo" -ForegroundColor Green
    } else {
        Write-Host "   [X] $arquivo (nao encontrado)" -ForegroundColor Red
        $missing += $arquivo
        $allOk = $false
    }
}

# 5. Verificar configuração do banco
Write-Host "5. Verificando configuração do banco..." -ForegroundColor Yellow
$dbConfig = Get-Content "src/config/database.js" -Raw
if ($dbConfig -match "database:\s*'(\w+)'") {
    $dbName = $Matches[1]
    Write-Host "   ✅ Banco configurado: $dbName" -ForegroundColor Green
} else {
    Write-Host "   [!] Nao foi possivel detectar nome do banco" -ForegroundColor Yellow
}

if ($dbConfig -match "password:\s*'([^']+)'") {
    $dbPass = $Matches[1]
    if ($dbPass -eq "@Bomboniere2025") {
        Write-Host "   ✅ Senha padrão: $dbPass" -ForegroundColor Green
    } else {
        Write-Host "   [i] Senha customizada configurada" -ForegroundColor Cyan
    }
}

# 6. Verificar porta disponível
Write-Host "6. Verificando disponibilidade da porta 3000..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "   [!] Porta 3000 esta em uso!" -ForegroundColor Yellow
    Write-Host "   [i] Feche o aplicativo que esta usando ou mude a porta em src/server.js" -ForegroundColor Cyan
} else {
    Write-Host "   ✅ Porta 3000 disponível" -ForegroundColor Green
}

# 7. Verificar scripts de inicialização
Write-Host "7. Verificando scripts de inicialização..." -ForegroundColor Yellow
if (Test-Path "iniciar.ps1") {
    Write-Host "   ✅ iniciar.ps1" -ForegroundColor Green
} else {
    Write-Host "   [!] iniciar.ps1 nao encontrado" -ForegroundColor Yellow
}

if (Test-Path "iniciar.bat") {
    Write-Host "   ✅ iniciar.bat" -ForegroundColor Green
} else {
    Write-Host "   [!] iniciar.bat nao encontrado" -ForegroundColor Yellow
}

# Resumo final
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allOk) {
    Write-Host "✅ TUDO PRONTO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para iniciar o sistema, execute:" -ForegroundColor White
    Write-Host "  .\iniciar.ps1" -ForegroundColor Cyan
    Write-Host "  ou" -ForegroundColor Gray
    Write-Host "  npm start" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Acesse: http://localhost:3000" -ForegroundColor White
    Write-Host "Login: admin@bomboniere.com" -ForegroundColor White
    Write-Host "Senha: @Bomboniere2025" -ForegroundColor White
} else {
    Write-Host "[!] PROBLEMAS ENCONTRADOS!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Corrija os erros acima antes de iniciar o sistema." -ForegroundColor White
    Write-Host "Consulte: GUIA-INSTALACAO-LOCAL.md para mais detalhes." -ForegroundColor Cyan
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

pause
