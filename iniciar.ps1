# 🚀 Script de Inicialização - Sistema PDV/ERP Bomboniere
# Execute este script para iniciar o sistema rapidamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sistema PDV/ERP Bomboniere" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js não encontrado! Instale em https://nodejs.org/" -ForegroundColor Red
    pause
    exit
}

# Verificar MySQL
Write-Host "Verificando MySQL..." -ForegroundColor Yellow
$mysqlService = Get-Service MySQL* -ErrorAction SilentlyContinue
if ($mysqlService) {
    if ($mysqlService.Status -eq 'Running') {
        Write-Host "✅ MySQL rodando: $($mysqlService.DisplayName)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MySQL instalado mas parado. Tentando iniciar..." -ForegroundColor Yellow
        Start-Service $mysqlService.Name
        Write-Host "✅ MySQL iniciado!" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  MySQL não detectado. Certifique-se de que está instalado." -ForegroundColor Yellow
    Write-Host "   Download: https://dev.mysql.com/downloads/mysql/" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Verificar se as dependências estão instaladas
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
        pause
        exit
    }
    Write-Host "✅ Dependências instaladas!" -ForegroundColor Green
} else {
    Write-Host "✅ Dependências já instaladas" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Yellow
Write-Host ""
Write-Host "📱 O sistema abrirá em: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Credenciais padrão:" -ForegroundColor White
Write-Host "  Email: admin@bomboniere.com" -ForegroundColor White
Write-Host "  Senha: @Bomboniere2025" -ForegroundColor White
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Aguardar 2 segundos antes de abrir o navegador
Start-Sleep -Seconds 2

# Abrir navegador
Start-Process "http://localhost:3000"

# Iniciar servidor
npm start
