# Template de Handoff: Planejador -> Executor (PDV Bomboniere)

Objetivo: transformar uma necessidade em plano executavel com baixo risco operacional.

## Como usar
1. O agente Planejador preenche este template.
2. O dono da tarefa revisa e aprova escopo/riscos.
3. O agente Executor recebe o conteudo final e implementa.
4. O Revisor Operacional valida risco de regressao.

---

## 1) Contexto da Necessidade
- Problema:
- Impacto no negocio:
- Fluxo afetado (PDV/ERP):
- Urgencia (alta/media/baixa):

## 2) Diagnostico Tecnico
- Causa raiz suspeita:
- Causa raiz confirmada:
- Comportamento atual observado:
- Comportamento esperado:

## 3) Ponto Exato de Alteracao
- Arquivos alvo:
- Funcoes/metodos alvo:
- Rotas/queries alvo:
- Estruturas de dados afetadas:

## 4) Regras Criticas que Nao Podem Quebrar
- Transacoes com commit/rollback/release em operacoes multi-tabela.
- Validacao de estoque e consistencia de itens_venda.
- Caixa aberto singleton e fluxo de fechamento sem perda de dados.
- Pagamentos multiplos sem divergencia no total da venda.
- Hierarquia de modais (principal -> nested -> level-2).
- Padrao de resposta da API: success, data, message.

## 5) Plano Tecnico (Passo a Passo para o Executor)
1. Mapear fluxo atual ponta a ponta nos arquivos alvo.
2. Implementar mudanca minima necessaria no backend/frontend.
3. Se houver banco: criar migration e atualizar database_producao.sql.
4. Ajustar validacoes de erro e mensagens para operador.
5. Validar cenarios criticos de caixa/venda/estoque/pagamento.
6. Documentar alteracoes, riscos residuais e limites do que nao foi mudado.

## 6) Escopo e Limites
- Dentro do escopo:
- Fora do escopo:
- Arquivos proibidos de alterar:

## 7) Criterios de Aceite
- [ ] Fluxo principal funciona sem regressao.
- [ ] Nao ha divergencia de total, troco ou saldo de caixa.
- [ ] Nao ha quebra de atalhos de teclado/barcode scanner.
- [ ] Respostas da API seguem padrao esperado.
- [ ] Erros sao tratados com mensagem clara para operador.

## 8) Testes de Validacao
### Testes manuais
- Cenario 1:
- Cenario 2:
- Cenario 3:

### Testes tecnicos
- Endpoint(s) para validar:
- SQL/consistencia para validar:
- Logs/erros para monitorar:

## 9) Riscos e Mitigacoes
- Risco 1:
- Mitigacao 1:
- Risco 2:
- Mitigacao 2:

## 10) Prompt Final para o Agente Executor
Use o texto abaixo apos preencher os campos:

"""
Implemente a tarefa conforme o handoff aprovado abaixo.

Regras obrigatorias:
- Alterar somente o escopo definido.
- Preservar estabilidade operacional de caixa, venda, estoque e pagamentos.
- Em mudancas multi-tabela, usar transacao completa (commit/rollback/release).
- Se houver SQL novo, incluir migration e atualizar database_producao.sql.
- Validar criterios de aceite e reportar riscos residuais.

HANDOFF APROVADO:
[COLE AQUI O TEMPLATE PREENCHIDO]
"""

---

## Exemplo Curto (Preenchido)

Problema: venda com pagamentos multiplos permite confirmar com total parcial em caso de edicao rapida no modal.

Arquivos alvo:
- public/js/pdv.js
- src/routes/vendas.js

Funcoes alvo:
- confirmarVenda
- calcularSaldoPagamento
- POST /api/vendas

Criterios de aceite:
- So confirma venda quando soma dos pagamentos >= total.
- Troco calculado apenas quando forma inclui dinheiro.
- Persistencia de venda e formas de pagamento sem divergencia.

Prompt executor:
- Implementar bloqueio de confirmacao com saldo pendente.
- Ajustar validacao backend para recusar soma de pagamentos menor que total.
- Exibir notificacao clara no frontend.
- Validar cenarios: pagamento unico, multiplo, multiplo com troco.
