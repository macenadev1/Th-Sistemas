# 🚀 Instalação do Sistema de Autenticação ERP

## ✅ Step 1: Autenticação - CONCLUÍDO

O sistema de autenticação foi implementado com sucesso! Agora você precisa aplicar as mudanças no banco de dados e iniciar o servidor.

---

## 📦 Passos para Ativação

### 1. Aplicar Migração no Banco de Dados

Escolha uma das opções abaixo:

#### Opção A: Banco de Dados NOVO (Recomendado se não tem dados em produção)

```bash
mysql -u root -p@Bomboniere2025 < database/database.sql
```

Este comando irá:
- ✅ Criar todas as tabelas incluindo `usuarios` e `sessoes`
- ✅ Adicionar campo `usuario_id` nas tabelas existentes
- ✅ Criar usuário admin padrão
- ✅ Inserir dados de exemplo

#### Opção B: Banco de Dados EXISTENTE (Se já tem vendas/produtos em produção)

```bash
mysql -u root -p@Bomboniere2025 BomboniereERP < database/001_erp_auth.sql
```

Este comando irá:
- ✅ Criar apenas as tabelas `usuarios` e `sessoes`
- ✅ Adicionar campo `usuario_id` nas tabelas existentes (sem deletar dados)
- ✅ Criar usuário admin padrão
- ⚠️ **PRESERVA TODOS OS DADOS EXISTENTES**

### 2. (Opcional) Gerar Hash de Senha Customizado

Se quiser usar uma senha diferente de `@Bomboniere2025`, gere um novo hash:

```bash
node scripts/gerar-hash.js "SuaNovaSenha"
```

Depois, atualize o hash no INSERT do usuário admin em `database/database.sql` ou `database/001_erp_auth.sql`.

### 3. Iniciar o Servidor

```bash
npm start
```

Ou para desenvolvimento com auto-reload:

```bash
npm run dev
```

### 4. Acessar o Sistema

1. Abra o navegador em **http://localhost:3000**
2. Você será **automaticamente redirecionado** para `/login.html`
3. Faça login com as credenciais:
   - **Email:** `admin@bomboniere.com`
   - **Senha:** `@Bomboniere2025`
4. ✅ Após login bem-sucedido, você será redirecionado para o PDV

---

## 🔐 Credenciais Padrão

| Campo | Valor |
|-------|-------|
| Email | `admin@bomboniere.com` |
| Senha | `@Bomboniere2025` |
| Role  | `admin` |

⚠️ **IMPORTANTE:** Troque a senha após o primeiro login em produção!

---

## 🎯 O que foi Implementado

### ✅ Backend
- **Tabela `usuarios`** com roles (admin/operador)
- **Tabela `sessoes`** com suporte a tokens de 30 min e remember me (30 dias)
- **API de autenticação** em `src/routes/auth.js`:
  - `POST /api/auth/login` - Login com email/senha
  - `POST /api/auth/logout` - Logout
  - `GET /api/auth/me` - Dados do usuário logado
  - `POST /api/auth/refresh` - Renovar token
- **Middlewares:**
  - `requireAuth()` - Protege rotas que exigem autenticação
  - `requireAdmin()` - Protege rotas apenas para administradores
- **Hashing bcrypt** com 10 rounds para senhas
- **Limpeza automática** de sessões expiradas a cada hora

### ✅ Frontend
- **Tela de login** em `public/login.html` com design moderno
- **JavaScript de autenticação** em `public/js/auth.js`:
  - Verificação automática de sessão
  - Redirect para login se não autenticado
  - Logout global
  - Interceptor de fetch para adicionar token em todas as requisições
  - Logout automático em caso de 401
- **Informações do usuário** no header do PDV (nome, role, botão sair)
- **Remember me** com checkbox na tela de login

### ✅ Database
- **Campo `usuario_id`** adicionado em:
  - `vendas` (NULL para dados históricos)
  - `caixa_aberto` (mantém campo `operador` para compatibilidade)
  - `fechamentos_caixa` (mantém campo `operador` para compatibilidade)
- **Migration incremental** em `database/001_erp_auth.sql`
- **Database completo** atualizado em `database/database.sql`

---

## 🧪 Testando a Autenticação

### Teste 1: Login
1. Acesse http://localhost:3000
2. Deve redirecionar para /login.html
3. Digite email e senha
4. Clique em "Entrar"
5. Deve redirecionar para / com usuário logado no header

### Teste 2: Remember Me
1. Faça login marcando "Manter conectado por 30 dias"
2. Feche o navegador
3. Abra novamente http://localhost:3000
4. Deve permanecer logado (token válido por 30 dias)

### Teste 3: Logout
1. Clique no botão "Sair" no header
2. Deve redirecionar para /login.html
3. Tente acessar http://localhost:3000
4. Deve redirecionar para login novamente

### Teste 4: Token Expirado
1. Faça login SEM marcar "Manter conectado"
2. Aguarde 30 minutos (ou manipule o token)
3. Tente fazer uma operação no PDV
4. Deve redirecionar para login automaticamente

---

## 🔧 Troubleshooting

### Erro: "Cannot find module 'bcrypt'"
```bash
npm install bcrypt
```

### Erro: "Table 'usuarios' doesn't exist"
Execute a migration do banco de dados (ver passo 1 acima).

### Erro: "Email ou senha incorretos"
Certifique-se de que executou a migration que cria o usuário admin padrão.

### Erro: "Servidor offline"
Verifique se o MySQL está rodando e se as credenciais em `src/config/database.js` estão corretas.

---

## 📖 Próximos Passos

Com a autenticação implementada, você pode:

1. **Criar novos usuários** (próximo step: implementar CRUD de usuários)
2. **Proteger rotas** usando `requireAuth` e `requireAdmin`
3. **Adicionar logs de auditoria** rastreando ações por usuário
4. **Implementar recuperação de senha** via email
5. **Adicionar 2FA** para segurança extra

---

## 📚 Documentação Técnica

Ver arquivo [.github/copilot-instructions.md](.github/copilot-instructions.md) para detalhes completos da arquitetura.

Para mais informações sobre as migrations, ver [database/UPDATE.md](database/UPDATE.md).

---

**Step 1 CONCLUÍDO! ✅**

Pronto para prosseguir com **Step 2: Cadastros Base (Clientes, Fornecedores, Categorias)**
