# 🚀 Início Rápido - Sistema PDV/ERP

## ⚡ Forma Mais Rápida de Iniciar

### Opção 1: PowerShell (Recomendado)
Clique duplo no arquivo:
```
iniciar.ps1
```

Ou execute no PowerShell:
```powershell
.\iniciar.ps1
```

### Opção 2: Prompt de Comando
Clique duplo no arquivo:
```
iniciar.bat
```

### Opção 3: Manual
```powershell
npm start
```

---

## 📱 Acessar o Sistema

Após iniciar, o navegador abrirá automaticamente em:
```
http://localhost:3000
```

### 🔑 Login Padrão:
- **Email:** admin@bomboniere.com
- **Senha:** @Bomboniere2025

---

## 📚 Documentação Completa

Para guia de instalação detalhado, veja:
- **[GUIA-INSTALACAO-LOCAL.md](GUIA-INSTALACAO-LOCAL.md)** - Instruções completas
- **[README-PDV-MYSQL.md](README-PDV-MYSQL.md)** - Documentação do sistema
- **[NOVAS-FUNCIONALIDADES.md](NOVAS-FUNCIONALIDADES.md)** - Recursos disponíveis

---

## ⚙️ Requisitos

- **Node.js** v14+ (Instalado ✅: v24.13.0)
- **MySQL** 5.7+ (Rodando ✅: MySQL80)
- **Navegador** Moderno (Chrome, Firefox, Edge)

---

## 🛠️ Comandos Úteis

```powershell
# Iniciar (produção)
npm start

# Iniciar (desenvolvimento com auto-reload)
npm run dev

# Instalar dependências
npm install

# Parar servidor
Ctrl + C
```

---

## 🔧 Solução Rápida de Problemas

### ❌ Erro de Conexão MySQL
1. Verifique se MySQL está rodando:
   ```powershell
   Get-Service MySQL*
   ```
2. Se estiver parado, inicie:
   ```powershell
   Start-Service MySQL80
   ```

### ❌ Porta 3000 em uso
Outro aplicativo está usando a porta. Feche-o ou edite `src/server.js` para usar outra porta.

### ❌ Banco de dados não existe
Execute o script SQL:
```powershell
Get-Content database\database.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

---

## 📊 Estrutura do Sistema

```
http://localhost:3000/          → PDV (Ponto de Venda)
http://localhost:3000/erp.html  → ERP (Administrativo)
http://localhost:3000/login.html → Login
```

---

## 🎯 Próximos Passos

1. ✅ Faça login no sistema
2. 🔓 Abra o caixa (F7)
3. 📦 Cadastre produtos (F4 ou F6)
4. 💰 Realize sua primeira venda!
5. 📊 Explore o ERP (F10)

---

## 📞 Suporte

- Documentação: [README-PDV-MYSQL.md](README-PDV-MYSQL.md)
- Instalação: [GUIA-INSTALACAO-LOCAL.md](GUIA-INSTALACAO-LOCAL.md)
- Atualizações: [database/UPDATE.md](database/UPDATE.md)

---

**Boas vendas! 💰**
