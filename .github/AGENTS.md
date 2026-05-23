# AGENTS - Guia Rapido

Este projeto usa agentes customizados para separar implementacao e revisao operacional.

## Quando usar cada agente

### PDV Bomboniere
Arquivo: .github/agents/pdv-bomboniere.agent.md

Use para:
- Implementar funcionalidades e correcoes no backend, frontend e banco.
- Evoluir fluxos de PDV/ERP com validacao tecnica.
- Aplicar mudancas com baixo risco e validar impacto operacional.

Nao usar para:
- Revisao estritamente de risco sem alteracao de codigo.

Prompt exemplo:
- Corrigir inconsistencia no fechamento de caixa mantendo fluxo de modal aninhada.

### PDV Design UX
Arquivo: .github/agents/pdv-design-ux.agent.md

Use para:
- Melhorar UX/UI do PDV e ERP com foco em clareza para cliente final e velocidade para operador.
- Reorganizar hierarquia visual de valores (subtotal, total, saldo a pagar, troco) e fluxo de pagamento.
- Aplicar boas praticas de mercado (consistencia, feedback, prevencao de erro, acessibilidade e responsividade).

Nao usar para:
- Revisao puramente tecnica de backend sem impacto de UX.

Prompt exemplo:
- Ajustar o fluxo de pagamento para destacar total a pagar, saldo restante e troco sem prejudicar atalhos de teclado.

### PDV Revisor Operacional
Arquivo: .github/agents/pdv-revisor-operacional.agent.md

Use para:
- Revisar PRs, diffs e alteracoes com foco em regressao operacional.
- Avaliar risco em caixa, vendas, estoque, pagamentos e atalhos.
- Apontar gaps de testes e cenarios criticos nao cobertos.

Nao usar para:
- Implementar codigo ou executar mudancas em arquivos.

Prompt exemplo:
- Revise esta alteracao com foco em risco de estoque e pagamento multiplo.

### PDV Planejador de Execucao
Arquivo: .github/agents/pdv-planejador-execucao.agent.md

Use para:
- Entender necessidade de negocio e mapear causa/problema tecnico.
- Encontrar ponto exato de alteracao (arquivos, funcoes, rotas e SQL).
- Gerar handoff objetivo para o agente executor implementar com seguranca.

Nao usar para:
- Implementar codigo diretamente.

Prompt exemplo:
- Analise o erro de fechamento de caixa e gere handoff completo para execucao segura.

## Fluxo recomendado
1. Planejar com o agente PDV Planejador de Execucao.
2. Implementar com o agente PDV Bomboniere.
3. Refinar experiencia com o agente PDV Design UX.
4. Revisar com o agente PDV Revisor Operacional.
5. Corrigir achados criticos antes de publicar.

## Handoff Planejador para Executor
Template pronto:
- .github/AGENT-HANDOFF-PLANEJADOR-EXECUTOR.md

Use quando quiser separar diagnostico/planejamento da execucao.
O planejador define contexto, arquivos-alvo, riscos, plano tecnico, criterios de aceite e testes.
O executor recebe esse handoff e implementa apenas o escopo aprovado.
