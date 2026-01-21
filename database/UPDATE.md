# Atualizações do Banco de Dados

## 📋 Histórico de Atualizações

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
