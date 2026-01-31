-- Migration: Adicionar campos de preço promocional à tabela produtos
-- Data: 31/01/2026
-- Descrição: Permite configurar promoções tipo "7 por R$ 1,00"

USE BomboniereERP;

-- Adicionar campos de preço promocional
ALTER TABLE produtos 
ADD COLUMN quantidade_promocional INT NULL COMMENT 'Quantidade para ativar preço promocional (ex: 7 unidades)',
ADD COLUMN preco_promocional DECIMAL(10, 2) NULL COMMENT 'Preço total para a quantidade promocional (ex: R$ 1,00)';

-- Adicionar índice para consultas de produtos com promoção
ALTER TABLE produtos
ADD INDEX idx_promo_ativo (quantidade_promocional, preco_promocional, ativo);

-- Comentários sobre uso:
-- Exemplo: Bala custa R$ 0,15 cada
-- quantidade_promocional = 7
-- preco_promocional = 1.00
-- Resultado: 7 balas = R$ 1,00 (ao invés de R$ 1,05)
-- Cálculo no PDV: 
--   15 balas = 2 pacotes (R$ 2,00) + 1 avulsa (R$ 0,15) = R$ 2,15

SELECT 'Migration 007 aplicada com sucesso!' AS mensagem;
SELECT CONCAT('Campos adicionados: quantidade_promocional, preco_promocional') AS detalhes;
