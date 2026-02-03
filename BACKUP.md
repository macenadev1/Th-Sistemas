# 💾 Backup e Restauração - PDV Bomboniere

## Índice
- [Por que fazer backup?](#por-que-fazer-backup)
- [O que fazer backup?](#o-que-fazer-backup)
- [Backup Manual](#backup-manual)
- [Backup Automatizado](#backup-automatizado)
- [Restauração](#restauração)
- [Estratégias de Backup](#estratégias-de-backup)

---

## Por que fazer backup?

### 🔴 Cenários de risco:

- **Falha de hardware:** HD com defeito
- **Erro humano:** Exclusão acidental de dados
- **Atualização com problemas:** Incompatibilidade
- **Ataque/malware:** Ransomware, vírus
- **Queda de energia:** Corrupção de banco

### ✅ Benefícios:

- ✅ Recuperação rápida de dados
- ✅ Continuidade do negócio
- ✅ Conformidade legal (NF-e, Sintegra)
- ✅ Tranquilidade para testar atualizações

---

## O que fazer backup?

### 📦 Essencial (OBRIGATÓRIO):

1. **Banco de dados MySQL completo**
   - Produtos, vendas, caixa, clientes
   - Configurações do sistema

2. **Arquivo `.env`**
   - Token do Telegram
   - Configurações sensíveis

### 📦 Recomendado:

3. **Código customizado**
   - Modificações em `src/`
   - Personalizações em `public/`

4. **Notas fiscais eletrônicas (se houver)**

---

## Backup Manual

### 🗃️ Backup do Banco de Dados

#### Windows (PowerShell):

```powershell
# Definir variáveis
$DATA = Get-Date -Format "yyyyMMdd_HHmmss"
$ARQUIVO = "C:\Backups\bomboniere_$DATA.sql"
$USUARIO = "root"
$SENHA = "@Bomboniere2025"

# Criar diretório se não existir
New-Item -ItemType Directory -Force -Path C:\Backups

# Fazer backup
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" `
    -u $USUARIO -p$SENHA `
    --single-transaction `
    --routines `
    --triggers `
    BomboniereERP > $ARQUIVO

# Confirmar
if ($?) {
    Write-Host "✅ Backup criado: $ARQUIVO" -ForegroundColor Green
    Get-Item $ARQUIVO | Select-Object Name, Length, LastWriteTime
} else {
    Write-Host "❌ Erro ao criar backup!" -ForegroundColor Red
}
```

#### Linux/Mac:

```bash
#!/bin/bash
DATA=$(date +%Y%m%d_%H%M%S)
ARQUIVO="/var/backups/bomboniere_$DATA.sql"
USUARIO="root"
SENHA="@Bomboniere2025"

mysqldump -u $USUARIO -p$SENHA \
    --single-transaction \
    --routines \
    --triggers \
    BomboniereERP > $ARQUIVO

echo "✅ Backup criado: $ARQUIVO"
ls -lh $ARQUIVO
```

---

### 📋 Backup Completo (Banco + Arquivos)

```powershell
# Windows PowerShell
$DATA = Get-Date -Format "yyyyMMdd_HHmmss"
$DESTINO = "C:\Backups\bomboniere_completo_$DATA"

# Criar diretório
New-Item -ItemType Directory -Force -Path $DESTINO

# 1. Backup do banco
Write-Host "📦 Fazendo backup do banco de dados..." -ForegroundColor Cyan
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" `
    -u root -p@Bomboniere2025 `
    --single-transaction `
    --routines `
    --triggers `
    BomboniereERP > "$DESTINO\database.sql"

# 2. Copiar .env
Write-Host "📦 Copiando .env..." -ForegroundColor Cyan
Copy-Item -Path "C:\Projetos\Th-Sistemas\.env" -Destination "$DESTINO\.env"

# 3. Copiar customizações (se houver)
Write-Host "📦 Copiando arquivos customizados..." -ForegroundColor Cyan
# Adicionar aqui arquivos que você modificou
# Copy-Item -Path "C:\Projetos\Th-Sistemas\src\custom\*" -Destination "$DESTINO\custom" -Recurse

# 4. Compactar tudo
Write-Host "🗜️ Compactando backup..." -ForegroundColor Cyan
Compress-Archive -Path "$DESTINO\*" -DestinationPath "$DESTINO.zip" -Force

# 5. Limpar pasta temporária
Remove-Item -Path $DESTINO -Recurse -Force

Write-Host "✅ Backup completo criado: $DESTINO.zip" -ForegroundColor Green
Get-Item "$DESTINO.zip" | Select-Object Name, @{Name="Tamanho (MB)";Expression={[math]::Round($_.Length/1MB, 2)}}, LastWriteTime
```

---

## Backup Automatizado

### 🤖 Backup Diário Automático (Windows Task Scheduler)

#### 1. Criar script de backup:

**`C:\Scripts\backup-bomboniere.ps1`:**

```powershell
# Script de Backup Automático - PDV Bomboniere
param(
    [int]$DiasRetencao = 30
)

# Configurações
$BACKUP_DIR = "C:\Backups\Bomboniere"
$LOG_FILE = "$BACKUP_DIR\backup.log"
$DATA = Get-Date -Format "yyyyMMdd_HHmmss"

# Função de log
function Write-Log {
    param($Mensagem)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogLine = "[$Timestamp] $Mensagem"
    Add-Content -Path $LOG_FILE -Value $LogLine
    Write-Host $LogLine
}

# Criar diretório se não existir
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

Write-Log "🚀 Iniciando backup automático..."

try {
    # Backup do banco
    $ARQUIVO = "$BACKUP_DIR\bomboniere_$DATA.sql"
    
    & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" `
        -u root -p@Bomboniere2025 `
        --single-transaction `
        --routines `
        --triggers `
        BomboniereERP > $ARQUIVO 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $Tamanho = (Get-Item $ARQUIVO).Length / 1MB
        Write-Log "✅ Backup criado: $ARQUIVO ($('{0:N2}' -f $Tamanho) MB)"
        
        # Compactar
        $ZIP = "$BACKUP_DIR\bomboniere_$DATA.zip"
        Compress-Archive -Path $ARQUIVO -DestinationPath $ZIP -Force
        Remove-Item $ARQUIVO
        
        Write-Log "🗜️ Backup compactado: $ZIP"
        
        # Limpar backups antigos
        $DataLimite = (Get-Date).AddDays(-$DiasRetencao)
        Get-ChildItem -Path $BACKUP_DIR -Filter "bomboniere_*.zip" | 
            Where-Object { $_.LastWriteTime -lt $DataLimite } | 
            ForEach-Object {
                Remove-Item $_.FullName
                Write-Log "🗑️ Backup antigo removido: $($_.Name)"
            }
        
        Write-Log "✅ Backup concluído com sucesso!"
        
    } else {
        Write-Log "❌ Erro ao executar mysqldump (código: $LASTEXITCODE)"
        exit 1
    }
    
} catch {
    Write-Log "❌ Erro no backup: $_"
    exit 1
}
```

#### 2. Agendar no Windows Task Scheduler:

```powershell
# Executar como Administrador
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File C:\Scripts\backup-bomboniere.ps1"

$Trigger = New-ScheduledTaskTrigger -Daily -At 23:00

$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5)

Register-ScheduledTask `
    -TaskName "Backup PDV Bomboniere" `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Backup diário automático do banco de dados do PDV" `
    -User "SYSTEM" `
    -RunLevel Highest

Write-Host "✅ Tarefa agendada criada com sucesso!" -ForegroundColor Green
Write-Host "Backup será executado todos os dias às 23:00" -ForegroundColor Cyan
```

#### 3. Testar backup manual:

```powershell
PowerShell.exe -ExecutionPolicy Bypass -File C:\Scripts\backup-bomboniere.ps1
```

---

### 🤖 Backup Diário Automático (Linux Cron)

#### 1. Criar script:

**`/usr/local/bin/backup-bomboniere.sh`:**

```bash
#!/bin/bash

# Configurações
BACKUP_DIR="/var/backups/bomboniere"
LOG_FILE="$BACKUP_DIR/backup.log"
DATA=$(date +%Y%m%d_%H%M%S)
DIAS_RETENCAO=30
USUARIO="root"
SENHA="@Bomboniere2025"

# Criar diretório
mkdir -p $BACKUP_DIR

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "🚀 Iniciando backup automático..."

# Backup do banco
ARQUIVO="$BACKUP_DIR/bomboniere_$DATA.sql"

mysqldump -u $USUARIO -p$SENHA \
    --single-transaction \
    --routines \
    --triggers \
    BomboniereERP > $ARQUIVO 2>&1

if [ $? -eq 0 ]; then
    TAMANHO=$(du -h $ARQUIVO | cut -f1)
    log "✅ Backup criado: $ARQUIVO ($TAMANHO)"
    
    # Compactar
    gzip $ARQUIVO
    log "🗜️ Backup compactado: $ARQUIVO.gz"
    
    # Limpar backups antigos
    find $BACKUP_DIR -name "bomboniere_*.sql.gz" -mtime +$DIAS_RETENCAO -delete
    log "🗑️ Backups antigos removidos (> $DIAS_RETENCAO dias)"
    
    log "✅ Backup concluído com sucesso!"
else
    log "❌ Erro ao executar mysqldump"
    exit 1
fi
```

#### 2. Dar permissão de execução:

```bash
chmod +x /usr/local/bin/backup-bomboniere.sh
```

#### 3. Agendar no cron (backup às 23:00 todo dia):

```bash
# Editar crontab
crontab -e

# Adicionar linha:
0 23 * * * /usr/local/bin/backup-bomboniere.sh >> /var/log/bomboniere-backup.log 2>&1
```

---

## Restauração

### 🔄 Restaurar Backup do Banco

#### Windows:

```powershell
# Definir arquivo de backup
$BACKUP = "C:\Backups\bomboniere_20260202_230000.sql"

# ⚠️ ATENÇÃO: Isso SUBSTITUI todos os dados!
Write-Host "⚠️ ATENÇÃO: Todos os dados atuais serão SUBSTITUÍDOS!" -ForegroundColor Yellow
$Confirmacao = Read-Host "Digite 'SIM' para confirmar"

if ($Confirmacao -eq "SIM") {
    Write-Host "🔄 Restaurando backup..." -ForegroundColor Cyan
    
    # Se for arquivo .zip, descompactar primeiro
    if ($BACKUP -like "*.zip") {
        Expand-Archive -Path $BACKUP -DestinationPath "C:\Temp\restore" -Force
        $BACKUP = (Get-ChildItem "C:\Temp\restore\*.sql")[0].FullName
    }
    
    # Restaurar banco
    Get-Content $BACKUP | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" `
        -u root -p@Bomboniere2025 BomboniereERP
    
    if ($?) {
        Write-Host "✅ Backup restaurado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao restaurar backup!" -ForegroundColor Red
    }
    
    # Limpar temporários
    if (Test-Path "C:\Temp\restore") {
        Remove-Item "C:\Temp\restore" -Recurse -Force
    }
} else {
    Write-Host "❌ Restauração cancelada." -ForegroundColor Red
}
```

#### Linux:

```bash
#!/bin/bash

BACKUP="/var/backups/bomboniere/bomboniere_20260202_230000.sql.gz"
USUARIO="root"
SENHA="@Bomboniere2025"

echo "⚠️ ATENÇÃO: Todos os dados atuais serão SUBSTITUÍDOS!"
read -p "Digite 'SIM' para confirmar: " CONFIRMACAO

if [ "$CONFIRMACAO" == "SIM" ]; then
    echo "🔄 Restaurando backup..."
    
    # Se for .gz, descompactar
    if [[ $BACKUP == *.gz ]]; then
        gunzip -c $BACKUP | mysql -u $USUARIO -p$SENHA BomboniereERP
    else
        mysql -u $USUARIO -p$SENHA BomboniereERP < $BACKUP
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup restaurado com sucesso!"
    else
        echo "❌ Erro ao restaurar backup!"
        exit 1
    fi
else
    echo "❌ Restauração cancelada."
fi
```

---

### 🔄 Restauração Parcial (Apenas uma tabela)

```powershell
# Windows - Restaurar apenas tabela de produtos
$BACKUP = "C:\Backups\bomboniere_20260202_230000.sql"

# Extrair apenas a tabela produtos
Select-String -Path $BACKUP -Pattern "CREATE TABLE.*produtos|INSERT INTO.*produtos" -Context 0,100 |
    Out-File -FilePath "C:\Temp\restore_produtos.sql"

# Aplicar
Get-Content "C:\Temp\restore_produtos.sql" | 
    & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p@Bomboniere2025 BomboniereERP

Write-Host "✅ Tabela produtos restaurada!"
```

---

## Estratégias de Backup

### 📅 Retenção Recomendada:

| Frequência | Retenção | Propósito |
|------------|----------|-----------|
| **Diário** | 30 dias | Recuperação de dados recentes |
| **Semanal** | 3 meses | Análises e auditorias |
| **Mensal** | 1 ano | Conformidade fiscal |
| **Anual** | 5 anos | Arquivo legal |

### 🎯 Regra 3-2-1:

- **3 cópias** dos dados
- **2 mídias** diferentes (HD + Nuvem)
- **1 cópia offsite** (fora do local)

### Exemplo prático:

```
📍 Local (Servidor principal):
   └─ Banco de dados em produção

📍 Local (HD Externo):
   └─ Backups diários dos últimos 30 dias

📍 Nuvem (Google Drive / OneDrive):
   └─ Backups semanais dos últimos 3 meses
```

---

## Backup para Nuvem

### ☁️ Google Drive (Windows):

```powershell
# Instalar Google Drive Desktop
# Sincronizar pasta C:\Backups\Bomboniere

# Ou usar rclone:
# 1. Instalar rclone
# 2. Configurar: rclone config
# 3. Copiar: rclone copy C:\Backups\Bomboniere gdrive:Backups/Bomboniere
```

### ☁️ OneDrive (Windows):

```powershell
# OneDrive já vem instalado no Windows
# Mover pasta de backups para:
$OneDrive = $env:OneDrive
Move-Item C:\Backups\Bomboniere "$OneDrive\Backups\Bomboniere"
```

---

## Testes de Restauração

### ⚠️ IMPORTANTE: Sempre testar seus backups!

**Rotina mensal:**

1. **Escolher backup aleatório**
2. **Restaurar em ambiente de teste**
3. **Verificar integridade dos dados:**
   - Produtos carregam?
   - Vendas aparecem?
   - Relatórios funcionam?
4. **Documentar resultado**

---

## Checklist de Backup

### ✅ Diariamente:
- [ ] Backup automático executou às 23:00
- [ ] Verificar log de backup (sem erros)
- [ ] Confirmar arquivo foi criado

### ✅ Semanalmente:
- [ ] Verificar espaço em disco
- [ ] Copiar backup para nuvem
- [ ] Limpar backups antigos

### ✅ Mensalmente:
- [ ] Testar restauração de backup
- [ ] Verificar integridade dos dados
- [ ] Atualizar documentação

---

## Links Úteis

- [README Principal](README-PDV-MYSQL.md)
- [Guia de Instalação](GUIA-INSTALACAO-LOCAL.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Guia de Atualização](ATUALIZACAO.md)

---

**💡 Lembre-se:** Um backup só é bom se puder ser restaurado! Teste regularmente seus backups.
