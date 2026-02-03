# Atualizações do Banco de Dados

## 📋 Histórico de Atualizações

### ✅ Atualização 008: Controle de Cancelamento de Vendas (03/02/2026)
**Descrição:** Adiciona campos para marcar vendas como canceladas, permitindo auditoria e reversão de estoque.

**Alterações:**
- `vendas` - Campo `cancelado BOOLEAN DEFAULT FALSE`
- `vendas` - Campo `data_cancelamento TIMESTAMP NULL`
- `vendas` - Campo `motivo_cancelamento TEXT NULL`
- `vendas` - Campo `usuario_cancelamento_id INT NULL` (FK para usuarios)
- Índices `idx_cancelado` e `idx_data_cancelamento`

**Como aplicar:**
```bash
mysql -u root -p < database/008_cancelar_vendas.sql
```

**Benefícios:**
- ✅ Soft delete de vendas (mantém histórico para auditoria)
- ✅ Reversão automática de estoque ao cancelar
- ✅ Atualização do total_vendas do caixa (se ainda aberto)
- ✅ Rastreamento de quem e quando cancelou
- ✅ Motivo obrigatório para cancelamento
- ✅ Exclusão de vendas canceladas dos relatórios por padrão

**Funcionalidades Frontend:**
- Botão "🗑️ Excluir Venda" no histórico de vendas
- Prompt para motivo do cancelamento
- Confirmação antes de excluir
- Notificação de sucesso com detalhes
- API retorna apenas vendas válidas por padrão (use `?incluir_canceladas=true` para auditorias)

---

### ✅ Atualização 002: Campo Estoque Mínimo (25/01/2026)
**Descrição:** Adiciona campo `estoque_minimo` na tabela produtos para controle de reposição e alertas de estoque baixo.

**Alterações:**
- `produtos` - Campo `estoque_minimo INT NOT NULL DEFAULT 0` (após campo `estoque`)
- Índice `idx_estoque_alerta` para otimizar consultas de estoque baixo
- Atualização automática dos produtos existentes com sugestão de 10% do estoque atual

**Como aplicar:**
```bash
mysql -u root -p < database/add_estoque_minimo.sql
```

**Benefícios:**
- ✅ Controle de estoque mínimo por produto
- ✅ Relatório de produtos com estoque baixo/crítico
- ✅ Alertas automáticos de reposição
- ✅ Filtros por situação: crítico (=0), baixo (<mínimo), alerta (=mínimo)
- ✅ Exportação para CSV
- ✅ Integração com fornecedores e categorias

**Funcionalidades Frontend:**
- Campo "Estoque Mínimo" nos formulários de cadastro/edição de produtos
- Relatório "⚠️ Estoque Baixo" no menu ERP
- Cards com estatísticas de criticidade
- Tabela ordenada por urgência (estoque zerado primeiro)
- Cálculo automático de quantidade necessária para reposição

---

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

### ✅ Atualização 3: Campo Preço de Custo em Produtos
**Descrição:** Adiciona o campo `preco_custo` na tabela `produtos` para calcular margem de lucro e custo de reposição nos relatórios.

**Como aplicar:**
```bash
mysql -u root -p@Bomboniere2025 < database/add_preco_custo.sql
```

**Benefícios:**
- ✅ Calcula margem de lucro por produto
- ✅ Relatórios mostram custo de reposição vs receita
- ✅ Análise de lucratividade das vendas
- ✅ Permite identificar produtos mais rentáveis
- ✅ Interface atualizada para cadastro e edição de produtos
- ✅ Não afeta produtos existentes (valor padrão: R$ 0,00)

**Impacto:**
- ✅ Compatível com produtos existentes
- ✅ Formulários de cadastro e edição atualizados
- ✅ API atualizada (POST/PUT)
- ⏳ Relatórios com cálculo de lucro (próxima etapa)

---

### ✅ Atualização 4: Custo Histórico em Itens de Venda (25/01/2026) 🎯
**Descrição:** Adiciona `preco_custo_unitario` em `itens_venda` para análise precisa de lucratividade com histórico preservado.

**Como aplicar:**
```bash
mysql -u root -p@Bomboniere2025 < database/add_custo_itens_venda.sql
```

**O que muda:**
- ✅ Sistema registra custo **NO MOMENTO DA VENDA** (histórico preciso)
- ✅ Relatório mostra análise completa: Custo Unit., Custo Total, Lucro, Margem %
- ✅ Totais gerais: Receita, Custos, Lucro Líquido, Margem Média
- ✅ Cores indicativas: 🔴 margem < 10%, 🟡 10-30%, 🟢 > 30%
- ✅ Atualiza vendas antigas com custo atual dos produtos

**Por que é importante:**
- 💡 Custos mudam com o tempo → precisa guardar valor histórico
- 📊 Análise de margem de lucro por produto e por venda
- 💰 Saber quanto repor vs quanto é lucro real
- 🎯 Identificar produtos com baixa lucratividade

**Exemplo prático:**
```
Venda #123 - Coca-Cola 2L (10 unidades)
Receita:      R$ 99,90 (R$ 9,99 cada)
Custo:        R$ 65,00 (R$ 6,50 cada)
Lucro:        R$ 34,90
Margem:       35% ✅
```

**Status:**
- ✅ Migration criada e testada
- ✅ Backend atualizado (salva custo automaticamente)
- ✅ Relatório com colunas de análise
- ⚠️ **IMPORTANTE**: Execute ANTES de fazer novas vendas para histórico preciso!

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
mysql -u root -p@Bomboniere2025 < database/add_preco_custo.sql
mysql -u root -p@Bomboniere2025 < database/add_custo_itens_venda.sql  # NOVO!
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
