# PDV Bomboniere - AI Coding Agent Instructions

## Visão Geral do Sistema
Sistema PDV (Ponto de Venda) com gestão completa de caixa, operável via teclado e leitor de código de barras. Stack: Node.js/Express backend com frontend vanilla JS, MySQL para persistência.

## Arquitetura e Componentes

### Backend (Express/MySQL)
- **[src/server.js](../src/server.js)**: Entry point, configura middleware e rotas
- **[src/config/database.js](../src/config/database.js)**: Pool MySQL2/promise (sempre use `getPool()` para obter conexão)
- **[src/routes/](../src/routes/)**: RESTful API separada por domínio (produtos, vendas, caixa, configuracoes)
- **Database**: BomboniereERP (config hardcoded em database.js, não em variáveis de ambiente)

### Frontend (Vanilla JS)
- **Modal-based UI**: [public/js/modal-loader.js](../public/js/modal-loader.js) carrega todos os HTMLs de [public/modals/](../public/modals/) no boot
- **[public/js/pdv.js](../public/js/pdv.js)**: Lógica principal - carrinho, vendas, pagamentos múltiplos
- **[public/js/caixa.js](../public/js/caixa.js)**: Abertura, fechamento, reforços, sangrias
- **Estado global**: Variáveis globais `carrinho`, `caixaAberto`, `pagamentos` compartilhadas entre módulos

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
- Fechar modal: sempre use `closeModal()` de [modal-handler.js](../public/js/modal-handler.js) (ESC já mapeado)
- IDs únicos por modal (evitar conflitos entre modais reutilizáveis)

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
- `F1`: Ajuda | `F2`: Finalizar venda | `F3`: Cancelar venda | `F4`: Novo produto
- `F7`: Menu caixa | `F8`: Configurações | `F12`: Lista produtos
- `+/-`: Ajustar quantidade no input | `Enter`: Adicionar produto
- Leitores de código de barras: buffer de 100ms para input ≥8 chars ([pdv.js](../public/js/pdv.js#L75-L82))

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
- **Histórico vendas**: Filtro por data/operador implementado client-side após fetch completo

## Estrutura de Tabelas Principais

- `produtos`: estoque rastreado, `ativo` para soft-delete
- `vendas` → `itens_venda` (1:N) + `formas_pagamento_venda` (1:N)
- `caixa_aberto` (singleton) ↔ `fechamentos_caixa` (histórico)

Ao modificar estrutura do banco, sempre atualizar [database/database.sql](../database/database.sql) e criar migration em `database/UPDATE.md`.
