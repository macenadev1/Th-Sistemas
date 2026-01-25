# 💰 Campo de Custo de Produto - Documentação

## 📋 Visão Geral

Esta atualização adiciona o campo **Preço de Custo** aos produtos, permitindo calcular a **margem de lucro** e o **custo de reposição** nas vendas. Com isso, você pode distinguir:

- 💵 **Receita Total**: Valor total das vendas
- 📦 **Custo de Reposição**: Quanto precisa repor em estoque
- 💰 **Lucro Real**: Receita - Custo (sua margem de lucro)

## ✅ O que foi implementado

### 1. **Banco de Dados**
- ✅ Campo `preco_custo` adicionado à tabela `produtos`
- ✅ Tipo: `DECIMAL(10, 2)` (suporta até R$ 99.999.999,99)
- ✅ Valor padrão: `0` (não afeta produtos existentes)
- ✅ Script de migração seguro: `database/add_preco_custo.sql`

### 2. **Interface de Cadastro**
- ✅ Campo "Preço de Custo (R$)" adicionado ao formulário de cadastro
- ✅ Posicionado entre "Preço de Venda" e "Estoque"
- ✅ Formatação automática estilo PDV (digita centavos primeiro)
- ✅ Texto de ajuda: *"Valor pago ao fornecedor (para cálculo de lucratividade)"*

### 3. **Interface de Edição**
- ✅ Campo "Preço de Custo (R$)" adicionado ao formulário de edição
- ✅ Carrega valor existente ao abrir edição
- ✅ Mesma formatação e validação do cadastro

### 4. **API Backend**
- ✅ **POST /api/produtos**: Aceita e salva `preco_custo`
- ✅ **PUT /api/produtos/:id**: Aceita e atualiza `preco_custo`
- ✅ Valor padrão `0` se não informado
- ✅ Validação automática de tipos numéricos

### 5. **Frontend JavaScript**
- ✅ `abrirCadastro()`: Inicializa formatação do campo de custo
- ✅ `salvarProduto()`: Envia `preco_custo` ao criar produto
- ✅ `abrirEdicaoProduto()`: Carrega e exibe custo existente
- ✅ `salvarEdicaoProduto()`: Envia `preco_custo` ao editar produto

## 📝 Como Usar

### **1. Aplicar Atualização no Banco de Dados**

Para bancos de dados existentes, execute:

```bash
mysql -u root -p@Bomboniere2025 < database/add_preco_custo.sql
```

Para novas instalações, o campo já está incluído em `database/database.sql`.

### **2. Cadastrar Produtos com Custo**

1. Abra o **Menu ERP** (F10)
2. Acesse **📦 Produtos**
3. Clique em **+ Novo Produto**
4. Preencha:
   - **Preço de Venda**: Valor que você cobra do cliente
   - **Preço de Custo**: Valor que você paga ao fornecedor
5. Salve o produto

**Exemplo:**
- Preço de Venda: R$ 10,00
- Preço de Custo: R$ 6,50
- **Margem de Lucro**: R$ 3,50 (35%)

### **3. Editar Custo de Produtos Existentes**

1. Abra a lista de produtos (F6)
2. Clique no produto que deseja editar
3. Atualize o **Preço de Custo**
4. Salve as alterações

### **4. Visualizar no Relatório** (Próxima Etapa)

Em breve, o relatório de vendas mostrará:
- Total de receita (vendas)
- Total de custos (reposição)
- **Lucro líquido** (receita - custos)
- **Margem de lucro** em %

## 🔧 Detalhes Técnicos

### **Estrutura do Campo**

```sql
preco_custo DECIMAL(10, 2) NOT NULL DEFAULT 0
```

- **Precisão**: 10 dígitos totais, 2 decimais
- **Intervalo**: R$ 0,00 até R$ 99.999.999,99
- **Obrigatório**: Sim (com valor padrão 0)
- **Posição**: Após `preco`, antes de `desconto_percentual`

### **Fluxo de Dados**

```
Frontend (cadastro-produto.html)
    ↓ (input id="custoProduto")
JavaScript (produtos.js)
    ↓ (aplicarFormatacaoMoeda)
    ↓ (getValorDecimal() → float)
API Backend (routes/produtos.js)
    ↓ (POST/PUT com preco_custo)
MySQL (tabela produtos)
    ↓ (salva DECIMAL(10,2))
Frontend (editar-produto.html)
    ↓ (carrega valor ao editar)
Relatórios (em breve)
    ↓ (calcula lucro)
```

### **Validações Aplicadas**

- ✅ Valor numérico (não aceita texto)
- ✅ Padrão R$ 0,00 se vazio
- ✅ Formatação automática ao digitar (estilo PDV)
- ✅ Não pode ser negativo (validação futura)

## 📊 Próximas Etapas

### **Fase 2: Relatórios com Margem de Lucro**

1. **Modificar relatório de vendas** (`erp-dashboard.js`):
   - JOIN com tabela `produtos` para obter `preco_custo`
   - Calcular custo total por venda: `SUM(quantidade × preco_custo)`
   - Calcular lucro: `subtotal - custo_total`

2. **Adicionar colunas no relatório**:
   - Coluna "Custo" na tabela de itens
   - Coluna "Lucro" na tabela de itens
   - Margem % por produto

3. **Totais no rodapé**:
   ```
   Total Vendas:   R$ 1.000,00  ← já existe
   Total Custos:   R$   650,00  ← novo
   ────────────────────────────
   Lucro Líquido:  R$   350,00  ← novo (verde)
   Margem:         35,0%        ← novo
   ```

4. **Indicadores visuais**:
   - 🟢 Verde para lucro
   - 🔴 Vermelho para custos
   - 📊 Barra de progresso mostrando margem

### **Fase 3: Validações e Melhorias**

- ⏳ Alertar se preço de venda < custo (venda com prejuízo)
- ⏳ Relatório de produtos por lucratividade
- ⏳ Gráfico de margem de lucro ao longo do tempo
- ⏳ Meta de margem de lucro configurável

## 🧪 Testes Recomendados

### **Teste 1: Cadastro de Novo Produto**
1. Cadastrar produto com custo
2. Verificar se salvou no banco
3. Editar e alterar custo
4. Verificar se atualizou

### **Teste 2: Produtos Existentes**
1. Abrir produto antigo (sem custo)
2. Verificar se mostra R$ 0,00
3. Editar e adicionar custo
4. Salvar e reabrir para validar

### **Teste 3: Formatação**
1. Digitar valores no campo
2. Verificar formatação automática (6,50 → R$ 6,50)
3. Testar valores grandes (999999,99)
4. Testar valores pequenos (0,01)

## 🐛 Troubleshooting

### **Campo de custo não aparece**
- ✅ Verificar se carregou `add_preco_custo.sql`
- ✅ Limpar cache do navegador (Ctrl + F5)
- ✅ Verificar console do navegador (F12) para erros

### **Valor não salva**
- ✅ Verificar se banco tem coluna `preco_custo`
  ```sql
  DESCRIBE produtos;
  ```
- ✅ Verificar logs do servidor Node.js
- ✅ Verificar se API está retornando erro

### **Valor não carrega ao editar**
- ✅ Verificar se `preco_custo` existe no JSON da API
- ✅ Verificar console do navegador
- ✅ Testar query direta no MySQL

## 📚 Referências

- **Arquivo SQL**: `database/add_preco_custo.sql`
- **Modal Cadastro**: `public/modals/cadastro-produto.html`
- **Modal Edição**: `public/modals/editar-produto.html`
- **API Backend**: `src/routes/produtos.js`
- **JavaScript**: `public/js/produtos.js`
- **Schema Completo**: `database/database.sql`

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar console do navegador (F12)
2. Verificar logs do servidor Node.js
3. Consultar `database/UPDATE.md` para instruções de migração
4. Testar queries SQL diretamente no MySQL

---

**Versão**: 1.0.0  
**Data**: Janeiro 2026  
**Status**: ✅ Implementado (Backend + Frontend) | ⏳ Relatórios (Próxima Fase)
