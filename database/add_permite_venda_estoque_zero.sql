-- Adicionar campo para permitir venda com estoque zerado
-- Data: 28/01/2026
-- Descrição: Adiciona flag para configurar se o sistema permite ou não vender produtos com estoque 0

USE BomboniereERP;

-- Adicionar coluna na tabela configuracoes
ALTER TABLE configuracoes 
ADD COLUMN permite_venda_estoque_zero BOOLEAN NOT NULL DEFAULT FALSE
AFTER timeout_fallback_cupom;

-- Atualizar configuração existente (padrão: não permite)
UPDATE configuracoes SET permite_venda_estoque_zero = FALSE WHERE id = 1;

SELECT 'Campo permite_venda_estoque_zero adicionado com sucesso!' AS mensagem;
SELECT * FROM configuracoes WHERE id = 1;
