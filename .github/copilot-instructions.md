# PDV Bomboniere - AI Coding Agent Instructions

## Visão Geral do Sistema
Sistema PDV (Ponto de Venda) com gestão completa de caixa, operável via teclado e leitor de código de barras. Stack: Node.js/Express backend com frontend vanilla JS, MySQL para persistência. Foco em operação rápida por teclado/barcode scanner.

## Arquitetura e Componentes

### Backend (Express/MySQL)
- **[src/server.js](../src/server.js)**: Entry point, configura middleware e rotas (porta 3000)
- **[src/config/database.js](../src/config/database.js)**: Pool MySQL2/promise (sempre use `getPool()` para obter conexão)
- **[src/routes/](../src/routes/)**: RESTful API separada por domínio (produtos, vendas, caixa, configuracoes)
  - `produtos.js`: CRUD + busca por nome/código (endpoint `/buscar` para autocomplete)
  - `vendas.js`: Finalização com pagamentos múltiplos e atualização automática de estoque
  - `caixa.js`: Operações de caixa com validação singleton
  - `configuracoes.js`: Alertas de caixa e comportamento de cupom
- **Database**: BomboniereERP (credenciais hardcoded em database.js - projeto interno, sem .env)

### Frontend (Vanilla JS)
- **Modal-based UI**: [public/js/modal-loader.js](../public/js/modal-loader.js) carrega todos HTMLs de [public/modals/](../public/modals/) no boot via fetch (27 modais)
- **[public/js/pdv.js](../public/js/pdv.js)**: Core do PDV - carrinho, vendas, pagamentos múltiplos, atalhos F1-F12
- **[public/js/erp.js](../public/js/erp.js)**: Menu ERP (F12) - centraliza acesso às funções administrativas
- **[public/js/erp-dashboard.js](../public/js/erp-dashboard.js)**: Dashboard ERP com seções inline (Produtos, Clientes, Fornecedores, Vendas) e sistema de relatórios completo
- **[public/js/caixa.js](../public/js/caixa.js)**: Ciclo completo de caixa (abertura → movimentações → fechamento)
- **[public/js/produtos.js](../public/js/produtos.js)**: CRUD de produtos, gerenciamento de estoque, busca paginada
- **[public/js/clientes.js](../public/js/clientes.js)**: CRUD de clientes com listagem paginada e filtros
- **[public/js/fornecedores.js](../public/js/fornecedores.js)**: CRUD de fornecedores com listagem paginada e filtros
- **[public/js/configuracoes.js](../public/js/configuracoes.js)**: Alertas de caixa aberto e configuração de impressão de cupom
- **[public/js/utils.js](../public/js/utils.js)**: Funções compartilhadas (notificações, modais, formatação de moeda PDV-style)
- **[public/js/modal-handler.js](../public/js/modal-handler.js)**: Gerencia fechamento de modais por ESC ou clique no backdrop (hierarquia level-2 → nested → main)
- **Estado global**: Variáveis `carrinho`, `caixaAberto`, `caixaData`, `pagamentos`, `configuracoes` compartilhadas entre módulos

## Convenções Críticas

### Gestão de Transações (Backend)
```javascript
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
    // operações...
    await connection.commit();
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    connection.release();
}
```
**Sempre use este padrão em operações que modificam múltiplas tabelas** (vendas, caixa).

### Datas MySQL (Timezone Local)
Use `formatarDataMySQL()` em [src/routes/caixa.js](../src/routes/caixa.js#L6-L13) para converter ISO → MySQL preservando horário local (não UTC).

### Modais
- Novos modais: adicionar nome ao array `modals` em [modal-loader.js](../public/js/modal-loader.js#L11-L29)
- Fechar modal: sempre use `closeModal()` de [modal-handler.js](../public/js/modal-handler.js) (ESC já mapeado globalmente)
- IDs únicos por modal (evitar conflitos entre modais reutilizáveis)
- **Responsividade**: Usar `max-width: 95%; max-height: 90vh; overflow-y: auto` para modais grandes
- **Footer fixo**: Usar `position: sticky; bottom: 0` nos botões de ação para sempre ficarem visíveis

#### **Modais Aninhadas (Padrão para Sub-Telas)**
**SEMPRE** use modais aninhadas quando criar sub-telas ou modais que abrem sobre outras:

```html
<!-- Modal Principal -->
<div id="menuPrincipalModal" class="modal">
    <div class="modal-content" onclick="event.stopPropagation()">
        <!-- conteúdo -->
    </div>
</div>

<!-- Modal Secundária (Aninhada) -->
<div id="subTelaModal" class="modal modal-nested">
    <div class="modal-content" onclick="event.stopPropagation()">
        <!-- conteúdo -->
        <button onclick="fecharModalAninhado(event, 'subTelaModal')">Voltar</button>
    </div>
</div>
```

**Regras:**
1. Modal secundária: adicionar classe `modal-nested`
2. Ambas devem ter `onclick="event.stopPropagation()"` no `.modal-content`
3. **NÃO fechar** modal principal ao abrir a secundária (manter cascata)
4. Botão "Voltar" usa `fecharModalAninhado(event, 'modalId')` (não `fecharModal`)
5. Após salvar/confirmar na secundária: fechar apenas ela com `fecharModal('modalId')` e atualizar dados da principal

**Exemplo real**: Sistema de Caixa ([menu-caixa.html](../public/modals/menu-caixa.html) + [abertura-caixa.html](../public/modals/abertura-caixa.html))

Para modais de terceiro nível: usar classe `modal-nested-level-2`

### Atalhos de Teclado (já implementados)

#### **PDV - Operação de Vendas**
- `F1`: Ajuda | `F2`: Finalizar venda | `F3`: Cancelar venda | `F4`: Novo produto (rápido)
- `F5`: Histórico de vendas | `F7`: Menu caixa | `F9`: Buscar produto por nome
- `+/-`: Ajustar quantidade no input | `Enter`: Adicionar produto | `Delete`: Remover último item do carrinho
- `ESC`: Fecha modal mais recente (respeita hierarquia de modais aninhadas)

#### **Menu ERP - Administrativo (F10)**
- `F10`: Abre Menu ERP com acesso visual a todas funções administrativas
- `F6`: Gerenciar produtos | `F8`: Configurações
- **Separação clara**: PDV focado em vendas, ERP focado em gestão
- **Clientes e Fornecedores**: Acessar via Menu ERP (removido F10/F11 do PDV)

#### **Outros**
- Leitores de código de barras: buffer de 100ms para input ≥8 chars ([pdv.js](../public/js/pdv.js#L75-L82))
- **ESC key**: Fecha modais respeitando hierarquia (nível 2 → aninhado → principal) - implementado globalmente em [modal-handler.js](../public/js/modal-handler.js)

## Fluxos Complexos

### Venda com Pagamentos Múltiplos
1. Produtos → carrinho (validação estoque/caixa aberto)
2. `finalizarVenda()` → modal forma pagamento
3. Array `pagamentos[]` acumula múltiplas formas (dinheiro, PIX, crédito)
4. `confirmarVenda()` → POST `/api/vendas` (insere venda + itens + formas de pagamento em transação)
5. Atualiza estoque e `caixa_aberto.total_vendas` automaticamente

### Ciclo de Caixa (Singleton)
- Tabela `caixa_aberto`: **máximo 1 registro** (validação em `/api/caixa/abrir`)
- Movimentações: JSON serializado em `caixa_aberto.movimentacoes`
- Fechamento: move registro para `fechamentos_caixa` + extrai movimentações para `movimentacoes_caixa`

### Sistema de Relatórios ERP
- **Modal responsivo**: [relatorio-vendas-periodo.html](../public/modals/relatorio-vendas-periodo.html) com max-width 95% e max-height 90vh
- **Filtros de período**: Hoje, Ontem, Esta Semana, Este Mês, Este Ano + range customizado
- **Geração de relatório** via `gerarRelatorioVendas()` em [erp-dashboard.js](../public/js/erp-dashboard.js):
  1. Fetch todas vendas → filtra por período
  2. Calcula estatísticas: total vendas, valor total, ticket médio, total itens
  3. Agrupa vendas por dia (objeto `vendasPorDia`)
  4. Renderiza 4 cards de estatísticas com gradientes (roxo, rosa, azul, verde)
  5. Tabela de breakdown diário com totais no rodapé
  6. Detalhamento completo via `carregarItensVendasRelatorio(vendas)`:
     - Busca itens de todas vendas em paralelo (`Promise.all`)
     - Renderiza cards expandidos para cada venda
     - Mostra tabela de produtos (nome, código, qtd, preço unit., subtotal)
     - Exibe formas de pagamento com ícones e valores
- **Impressão**: CSS `@media print` oculta botões e ajusta layout
- **Performance**: Usa `Promise.all()` para buscar detalhes de múltiplas vendas simultaneamente

## Comandos de Desenvolvimento

```bash
npm start           # Produção
npm run dev         # Dev com nodemon
mysql -u root -p < database/database.sql  # Setup inicial
```

## Padrões de Código

### API Responses (sempre consistentes)
```javascript
res.json({ success: true, data: resultado });
res.status(400).json({ success: false, message: 'Erro descritivo' });
```

### Frontend API Calls
```javascript
const response = await fetch(`${API_URL}/endpoint`);
const data = await response.json();
if (!data.success) {
    mostrarNotificacao(data.message, 'error');
    return;
}
```

### Manipulação de Estoque
Sempre atualizar em transação junto com `itens_venda` (ver [routes/vendas.js](../src/routes/vendas.js)).

## Pontos de Atenção

- **Não usar variáveis de ambiente**: Credenciais MySQL hardcoded em `database.js` (projeto interno)
- **JSON no MySQL**: `movimentacoes` usa tipo JSON nativo (MySQL 5.7+), não string serializada
- **Notificações**: `mostrarNotificacao(msg, tipo)` em [utils.js](../public/js/utils.js) - sempre preferir vs `alert()`
- **Formatação de inputs monetários**: Use `aplicarFormatacaoMoeda(inputOrId, onEnterCallback)` em [utils.js](../public/js/utils.js) para inputs de valores - digita centavos primeiro estilo PDV
- **Histórico vendas**: Filtro por data/operador implementado client-side após fetch completo
- **Configurações**: Sistema de alertas de caixa aberto e configuração de impressão automática de cupom via tabela `configuracoes` (singleton ID=1)
- **Seções ERP inline**: Produtos, Clientes, Fornecedores e Vendas mostram listas filtráveis dentro da página ERP (não abrem modais)
  - Filtros por busca (nome/código) e status (ativo/inativo)
  - Paginação client-side (10 itens por página)
  - Cards clicáveis abrem modal de edição mantendo contexto da lista
  - Contadores de resultados dinâmicos
- **Detalhes de vendas**: Popup overlay inline mostra itens e formas de pagamento sem abrir nova modal

## Estrutura de Tabelas Principais

### **Produtos e Vendas**
- `produtos`: estoque rastreado, `ativo` para soft-delete, `desconto_percentual` para descontos permanentes, `fornecedor_id` (FK), `categoria_id` (FK)
- `vendas` → `itens_venda` (1:N) + `formas_pagamento_venda` (1:N)

### **Caixa**
- `caixa_aberto` (singleton) ↔ `fechamentos_caixa` (histórico) + `movimentacoes_caixa` (detalhes)

### **Cadastros ERP**
- `clientes`: cadastro completo com CPF/CNPJ, endereço, limite de crédito, soft-delete
- `fornecedores`: nome fantasia, razão social, CNPJ, contatos, soft-delete
- `categorias_produtos`: organização de produtos
- `categorias_financeiras`: tipo receita/despesa para futuro módulo financeiro

### **Sistema**
- `usuarios`: autenticação com role (admin/operador), senha hash bcrypt
- `sessoes`: tokens JWT, remember me, controle de expiração
- `configuracoes` (singleton ID=1): alertas de caixa e comportamento de cupom

Ao modificar estrutura do banco, sempre atualizar [database/database.sql](../database/database.sql) e criar migration em `database/UPDATE.md`.
