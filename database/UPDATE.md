# Atualizações do Banco de Dados

## 📋 Histórico de Atualizações

### ✅ Atualização 001: Sistema de Autenticação ERP (21/01/2026)
**Descrição:** Adiciona sistema completo de autenticação com usuários, sessões e controle de acesso.

**Tabelas criadas:**
- `usuarios` - Cadastro de usuários do sistema (admin/operador)
- `sessoes` - Controle de sessões com suporte a "remember me"

**Alterações em tabelas existentes:**
- `vendas` - Campo `usuario_id INT NULL` (FK para usuarios)
- `caixa_aberto` - Campo `usuario_id INT NULL` (FK para usuarios, mantém campo `operador`)
- `fechamentos_caixa` - Campo `usuario_id INT NULL` (FK para usuarios, mantém campo `operador`)

**Como aplicar:**
```bash
# Opção 1: Migration incremental (recomendado para bancos em produção)
mysql -u root -p@Bomboniere2025 BomboniereERP < database/001_erp_auth.sql

# Opção 2: Recriar banco completo (apenas em desenvolvimento)
mysql -u root -p@Bomboniere2025 < database/database.sql
```

**Credenciais padrão:**
- Email: `admin@bomboniere.com`
- Senha: `@Bomboniere2025`
- ⚠️ **IMPORTANTE:** Troque a senha após primeiro login!

**Benefícios:**
- ✅ Autenticação segura com bcrypt
- ✅ Sessões com tokens de 30 minutos
- ✅ "Manter conectado" com tokens de 30 dias
- ✅ Controle de acesso por role (admin/operador)
- ✅ Auditoria de usuários em vendas e caixa
- ✅ Compatibilidade com dados históricos (campos NULL)

---

### ✅ Atualização 1: Tabela Caixa Aberto
**Descrição:** Adiciona a tabela `caixa_aberto` que armazena o estado atual do caixa (se está aberto ou fechado).

**Como aplicar:**
```bash
mysql -u root -p@Bomboniere2025 < database/add_caixa_aberto.sql
```

**Benefícios:**
- ✅ Estado do caixa persiste no banco de dados
- ✅ Múltiplos dispositivos veem o mesmo estado
- ✅ Mais confiável que localStorage
- ✅ Permite auditoria e controle de caixas abertos

---

### ✅ Atualização 2: Campo Desconto em Vendas
**Descrição:** Adiciona o campo `desconto` na tabela `vendas` para armazenar descontos aplicados.

**Como aplicar:**
```bash
mysql -u root -p@Bomboniere2025 < database/add_desconto.sql
```

**Benefícios:**
- ✅ Registro de descontos aplicados em cada venda
- ✅ Relatórios mais precisos
- ✅ Suporte a desconto em % ou R$
- ✅ Cupom fiscal mostra desconto aplicado

---

## 📝 Como Aplicar Todas as Atualizações

### Opção 1: Aplicar todas de uma vez (recomendado para instalações novas)
```bash
mysql -u root -p@Bomboniere2025 < database/database.sql
```

### Opção 2: Aplicar individualmente (recomendado para bancos existentes)
```bash
# Ordem das atualizações
mysql -u root -p@Bomboniere2025 < database/add_caixa_aberto.sql
mysql -u root -p@Bomboniere2025 < database/add_desconto.sql
```

---

## ⚠️ Backup Antes de Atualizar

**Sempre faça backup do banco antes de aplicar atualizações:**

```bash
# Backup completo
mysqldump -u root -p@Bomboniere2025 BomboniereERP > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup (se necessário)
mysql -u root -p@Bomboniere2025 BomboniereERP < backup_20260121_140530.sql
```
