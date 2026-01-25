-- Adicionar campo estoque_minimo na tabela produtos
-- Data: 25/01/2026
-- Descrição: Campo para controlar o estoque mínimo de cada produto e gerar alertas de reposição

USE BomboniereERP;

-- Adicionar coluna estoque_minimo (padrão 0 = sem controle de estoque mínimo)
-- Verifica se a coluna não existe antes de adicionar
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'produtos' 
    AND COLUMN_NAME = 'estoque_minimo'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE produtos ADD COLUMN estoque_minimo INT NOT NULL DEFAULT 0 AFTER estoque;',
    'SELECT ''Coluna estoque_minimo já existe, pulando criação...'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Desabilitar safe mode temporariamente para permitir o UPDATE
SET SQL_SAFE_UPDATES = 0;

-- Atualizar produtos existentes com valores sugeridos baseados no estoque atual
-- Exemplo: estoque_minimo = 10% do estoque atual (mínimo 1)
-- Apenas atualiza produtos que ainda têm estoque_minimo = 0
UPDATE produtos 
SET estoque_minimo = GREATEST(1, FLOOR(estoque * 0.1))
WHERE estoque > 0 AND ativo = TRUE AND estoque_minimo = 0;

-- Reabilitar safe mode
SET SQL_SAFE_UPDATES = 1;

-- Criar índice para melhorar performance de consultas de estoque baixo
-- Verifica se o índice não existe antes de criar
SET @index_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'produtos' 
    AND INDEX_NAME = 'idx_estoque_alerta'
);

SET @sql_index = IF(@index_exists = 0,
    'CREATE INDEX idx_estoque_alerta ON produtos(estoque, estoque_minimo, ativo);',
    'SELECT ''Índice idx_estoque_alerta já existe, pulando criação...'' AS mensagem;'
);

PREPARE stmt_index FROM @sql_index;
EXECUTE stmt_index;
DEALLOCATE PREPARE stmt_index;

-- Verificar estrutura atualizada
DESCRIBE produtos;
