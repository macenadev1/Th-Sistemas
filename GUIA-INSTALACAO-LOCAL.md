# 🚀 Guia de Instalação Local - Sistema PDV/ERP Bomboniere

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

1. **Node.js** (versão 14 ou superior)
   - Download: https://nodejs.org/
   - Verifique: `node --version`

2. **MySQL Server** (versão 5.7 ou superior)
   - Download: https://dev.mysql.com/downloads/mysql/
   - Verifique: `mysql --version`

3. **Git** (opcional, para controle de versão)
   - Download: https://git-scm.com/

---

## 🔧 Passo 1: Configurar o MySQL

### 1.1. Iniciar o MySQL
Certifique-se de que o serviço MySQL está rodando:

**Windows (via Serviços):**
- Pressione `Win + R`, digite `services.msc`
- Procure por "MySQL" e verifique se está "Em execução"
- Se não estiver, clique com botão direito e selecione "Iniciar"

**Ou via PowerShell (como Administrador):**
```powershell
# Verificar status
Get-Service MySQL*

# Iniciar MySQL (se necessário)
Start-Service MySQL80  # ou o nome do seu serviço MySQL
```

### 1.2. Configurar Senha do Root (se necessário)

Se você definiu uma senha diferente durante a instalação do MySQL, edite o arquivo:
```
src/config/database.js
```

E altere a senha na linha:
```javascript
password: 'SUA_SENHA_AQUI',  // Atualmente: @Bomboniere2025
```

### 1.3. Criar o Banco de Dados

**Opção A - Via MySQL Workbench:**
1. Abra o MySQL Workbench
2. Conecte-se ao servidor local
3. Clique em "File" > "Open SQL Script"
4. Selecione o arquivo: `database/database.sql`
5. Clique no ícone de raio (⚡) para executar

**Opção B - Via Linha de Comando:**
```powershell
# Navegue até a pasta do projeto
cd C:\Users\ADM\OneDrive\Documentos\Th-Sistemas

# Execute o script SQL
mysql -u root -p < database/database.sql

# Digite a senha quando solicitado: @Bomboniere2025
```

**Opção C - Via PowerShell (Comando Único):**
```powershell
Get-Content database\database.sql | mysql -u root -p@Bomboniere2025
```

---

## 📦 Passo 2: Instalar Dependências do Node.js

Abra o PowerShell na pasta do projeto e execute:

```powershell
# Navegar até a pasta do projeto (se ainda não estiver)
cd C:\Users\ADM\OneDrive\Documentos\Th-Sistemas

# Instalar todas as dependências
npm install
```

Isso irá instalar:
- express (servidor web)
- mysql2 (driver MySQL)
- cors (habilitar CORS)
- body-parser (processar JSON)
- bcrypt (criptografia de senhas)
- jsonwebtoken (autenticação JWT)
- node-cron (agendamento de tarefas)
- nodemon (dev - reinicia automaticamente)

---

## 🚀 Passo 3: Iniciar o Sistema

### Modo Desenvolvimento (com auto-reload):
```powershell
npm run dev
```

### Modo Produção:
```powershell
npm start
```

Você verá algo como:
```
🚀 Servidor rodando em http://localhost:3000
📱 Abra no navegador: http://localhost:3000

📊 Sistema PDV com MySQL pronto para uso!
⏰ Job automático agendado: Fechamento de mês todo dia 1º às 00:01
```

---

## 🌐 Passo 4: Acessar o Sistema

Abra seu navegador e acesse:

```
http://localhost:3000
```

### Credenciais de Acesso Padrão:
- **Email:** admin@bomboniere.com
- **Senha:** @Bomboniere2025

⚠️ **IMPORTANTE:** Altere a senha padrão após o primeiro login!

---

## 🎯 Verificação Rápida

### 1. Verificar se o MySQL está rodando:
```powershell
mysql -u root -p@Bomboniere2025 -e "SHOW DATABASES LIKE 'BomboniereERP';"
```

Deve mostrar: `BomboniereERP`

### 2. Verificar tabelas criadas:
```powershell
mysql -u root -p@Bomboniere2025 BomboniereERP -e "SHOW TABLES;"
```

Deve listar todas as tabelas (produtos, vendas, caixa_aberto, etc.)

### 3. Testar conexão do Node.js:
```powershell
npm start
```

Deve conectar sem erros.

---

## 📱 Estrutura de Acesso

### PDV (Ponto de Venda):
- **URL:** http://localhost:3000
- **Função:** Interface de vendas
- **Atalhos:** F1-F12 (ver F1 - Ajuda)

### ERP (Administrativo):
- **URL:** http://localhost:3000/erp.html
- **Ou pressione F10 no PDV**
- **Função:** Gestão completa (produtos, clientes, fornecedores, relatórios)

---

## 🔥 Solução de Problemas Comuns

### ❌ Erro: "Cannot connect to MySQL"
**Solução:**
1. Verifique se o MySQL está rodando
2. Confirme usuário/senha em `src/config/database.js`
3. Execute: `mysql -u root -p` para testar login manual

### ❌ Erro: "Database 'BomboniereERP' does not exist"
**Solução:**
Execute o script SQL novamente:
```powershell
Get-Content database\database.sql | mysql -u root -p@Bomboniere2025
```

### ❌ Erro: "Port 3000 already in use"
**Solução:**
Outra aplicação está usando a porta 3000. Opções:
1. Feche o outro aplicativo
2. Ou edite `src/server.js` e mude a porta:
```javascript
const PORT = 3001; // ou outra porta disponível
```

### ❌ Erro: "npm: command not found"
**Solução:**
Node.js não está instalado ou não está no PATH.
1. Baixe e instale: https://nodejs.org/
2. Reinicie o PowerShell
3. Teste: `node --version`

### ❌ Produtos não aparecem no PDV
**Solução:**
O banco pode estar vazio. Verifique:
```powershell
mysql -u root -p@Bomboniere2025 BomboniereERP -e "SELECT COUNT(*) FROM produtos;"
```

Se retornar 0, execute novamente o `database.sql` que já inclui produtos de exemplo.

---

## 🛠️ Comandos Úteis

### Parar o servidor:
- Pressione `Ctrl + C` no terminal

### Reiniciar o servidor:
```powershell
npm start
```

### Ver logs em tempo real (modo dev):
```powershell
npm run dev
```

### Backup do banco de dados:
```powershell
mysqldump -u root -p@Bomboniere2025 BomboniereERP > backup_$(Get-Date -Format 'yyyy-MM-dd').sql
```

### Restaurar backup:
```powershell
mysql -u root -p@Bomboniere2025 BomboniereERP < backup_2026-01-28.sql
```

---

## 🌐 Acessar de Outros Dispositivos na Rede Local

Se quiser acessar o PDV de outros computadores/tablets na mesma rede:

### 1. Descubra seu IP local:
```powershell
ipconfig | Select-String "IPv4"
```

Exemplo: `192.168.1.100`

### 2. Configure o firewall:
```powershell
# Permitir porta 3000 (PowerShell como Administrador)
New-NetFirewallRule -DisplayName "PDV Bomboniere" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 3. Acesse de outros dispositivos:
```
http://192.168.1.100:3000
```

---

## 📚 Próximos Passos

Depois de ter o sistema rodando:

1. **Configure o Caixa** (F7)
   - Abra o caixa antes de realizar vendas

2. **Cadastre Produtos** (F4 ou F6)
   - O sistema já vem com produtos de exemplo

3. **Configure o Sistema** (F8)
   - Ajuste alertas de caixa
   - Configure impressão de cupom

4. **Explore o ERP** (F10)
   - Gerencie produtos, clientes, fornecedores
   - Visualize relatórios
   - Controle financeiro

---

## 📞 Suporte

Para mais informações:
- Documentação completa: `README-PDV-MYSQL.md`
- Novas funcionalidades: `NOVAS-FUNCIONALIDADES.md`
- Histórico de atualizações: `database/UPDATE.md`

---

## ✅ Checklist de Instalação

- [ ] Node.js instalado e funcionando (`node --version`)
- [ ] MySQL instalado e rodando
- [ ] Banco de dados `BomboniereERP` criado
- [ ] Dependências instaladas (`npm install`)
- [ ] Servidor iniciado (`npm start`)
- [ ] Sistema acessível em http://localhost:3000
- [ ] Login funcionando (admin@bomboniere.com)
- [ ] Produtos carregados no PDV

---

**Sistema pronto! 🎉**

Boas vendas! 💰
