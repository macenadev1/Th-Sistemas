-- ================================================
-- Script de Atualização: Campo permite_desconto
-- ================================================
-- Data: 21/01/2026
-- Descrição: Adiciona campo para controlar quais produtos podem ter desconto

USE BomboniereERP;

-- Verificar se o campo já existe
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'produtos' 
    AND COLUMN_NAME = 'permite_desconto');

-- Adicionar campo se não existir
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE produtos ADD COLUMN permite_desconto BOOLEAN DEFAULT TRUE AFTER ativo;',
    'SELECT "Campo permite_desconto já existe" AS aviso;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Atualizar produtos existentes (todos permitem desconto por padrão)
UPDATE produtos SET permite_desconto = TRUE WHERE id > 0 AND permite_desconto IS NULL;

SELECT '✅ Migração concluída com sucesso!' AS mensagem;
SELECT COUNT(*) AS total_produtos, 
       SUM(permite_desconto) AS produtos_com_desconto,
       COUNT(*) - SUM(permite_desconto) AS produtos_sem_desconto
FROM produtos;
