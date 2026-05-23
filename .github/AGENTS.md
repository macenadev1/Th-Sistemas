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

## Fluxo recomendado
1. Implementar com o agente PDV Bomboniere.
2. Revisar com o agente PDV Revisor Operacional.
3. Corrigir achados criticos antes de publicar.
