-- ========================================
-- Migração: permite_desconto → desconto_percentual
-- Aplica desconto diretamente no produto
-- ========================================

USE BomboniereERP;

-- Adicionar campo desconto_percentual
SET @sql_add_desconto = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'BomboniereERP' 
     AND TABLE_NAME = 'produtos' 
     AND COLUMN_NAME = 'desconto_percentual') = 0,
    'ALTER TABLE produtos ADD COLUMN desconto_percentual DECIMAL(5, 2) NOT NULL DEFAULT 0 AFTER preco',
    'SELECT "Campo desconto_percentual já existe" AS mensagem'
);

PREPARE stmt_add FROM @sql_add_desconto;
EXECUTE stmt_add;
DEALLOCATE PREPARE stmt_add;

-- Remover campo permite_desconto (se existir)
SET @sql_drop_permite = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'BomboniereERP' 
     AND TABLE_NAME = 'produtos' 
     AND COLUMN_NAME = 'permite_desconto') > 0,
    'ALTER TABLE produtos DROP COLUMN permite_desconto',
    'SELECT "Campo permite_desconto já foi removido" AS mensagem'
);

PREPARE stmt_drop FROM @sql_drop_permite;
EXECUTE stmt_drop;
DEALLOCATE PREPARE stmt_drop;

-- Atualizar produtos: aplicar desconto padrão 0% para todos
UPDATE produtos 
SET desconto_percentual = 0 
WHERE id > 0 AND desconto_percentual IS NULL;

-- Mostrar estatísticas
SELECT 
    'Migração concluída!' AS status,
    COUNT(*) AS total_produtos,
    AVG(desconto_percentual) AS desconto_medio
FROM produtos;

SELECT 
    nome,
    preco AS preco_original,
    desconto_percentual,
    ROUND(preco * (1 - desconto_percentual / 100), 2) AS preco_com_desconto
FROM produtos
WHERE ativo = 1
ORDER BY nome
LIMIT 10;
