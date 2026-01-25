-- =========================================
-- MIGRAÇÃO: Adicionar Custo Unitário em Itens de Venda
-- =========================================
-- Data: 25/01/2026
-- Objetivo: Guardar o custo do produto NO MOMENTO DA VENDA para cálculo preciso de lucratividade
--
-- IMPORTANTE: Custos de produtos podem mudar ao longo do tempo.
-- Para ter análise histórica correta, precisamos salvar o custo
-- que estava vigente no momento de cada venda.

USE BomboniereERP;

-- Verificar se a coluna já existe
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'itens_venda' 
    AND COLUMN_NAME = 'preco_custo_unitario'
);

-- Preparar statement condicional
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE itens_venda ADD COLUMN preco_custo_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER preco_unitario',
    'SELECT ''Coluna preco_custo_unitario já existe em itens_venda'' AS mensagem'
);

-- Executar
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar índice para consultas de análise de lucratividade
SET @index_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'itens_venda' 
    AND INDEX_NAME = 'idx_venda_custo'
);

SET @sql_index = IF(@index_exists = 0,
    'CREATE INDEX idx_venda_custo ON itens_venda(venda_id, preco_custo_unitario)',
    'SELECT ''Índice idx_venda_custo já existe'' AS mensagem'
);

PREPARE stmt FROM @sql_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =========================================
-- ATUALIZAÇÃO DE DADOS EXISTENTES
-- =========================================
-- Para vendas antigas (sem custo registrado), vamos buscar o custo ATUAL do produto
-- NOTA: Isso não será 100% preciso (custo pode ter mudado), mas é melhor que zero

-- Desabilitar safe update mode temporariamente
SET SQL_SAFE_UPDATES = 0;

UPDATE itens_venda iv
INNER JOIN produtos p ON iv.produto_id = p.id
SET iv.preco_custo_unitario = p.preco_custo
WHERE iv.preco_custo_unitario = 0;

-- Reabilitar safe update mode
SET SQL_SAFE_UPDATES = 1;

-- =========================================
-- VERIFICAÇÕES
-- =========================================

SELECT 'Migração concluída com sucesso!' AS status;

-- Verificar estrutura da tabela
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'BomboniereERP' 
AND TABLE_NAME = 'itens_venda'
AND COLUMN_NAME IN ('preco_unitario', 'preco_custo_unitario', 'subtotal')
ORDER BY ORDINAL_POSITION;

-- Estatísticas de itens com custo
SELECT 
    COUNT(*) AS total_itens,
    SUM(CASE WHEN preco_custo_unitario > 0 THEN 1 ELSE 0 END) AS itens_com_custo,
    SUM(CASE WHEN preco_custo_unitario = 0 THEN 1 ELSE 0 END) AS itens_sem_custo,
    ROUND(SUM(subtotal), 2) AS total_vendido,
    ROUND(SUM(preco_custo_unitario * quantidade), 2) AS total_custos,
    ROUND(SUM(subtotal - (preco_custo_unitario * quantidade)), 2) AS lucro_total,
    CONCAT(
        ROUND(
            (SUM(subtotal - (preco_custo_unitario * quantidade)) / SUM(subtotal) * 100), 
            1
        ), 
        '%'
    ) AS margem_media
FROM itens_venda;

-- Exemplo de análise de lucratividade por venda
SELECT 
    v.id AS venda_id,
    v.data_venda,
    v.total AS valor_venda,
    ROUND(SUM(iv.preco_custo_unitario * iv.quantidade), 2) AS custo_total,
    ROUND(SUM(iv.subtotal - (iv.preco_custo_unitario * iv.quantidade)), 2) AS lucro,
    CONCAT(
        ROUND(
            (SUM(iv.subtotal - (iv.preco_custo_unitario * iv.quantidade)) / v.total * 100), 
            1
        ), 
        '%'
    ) AS margem_percentual
FROM vendas v
INNER JOIN itens_venda iv ON v.id = iv.venda_id
GROUP BY v.id, v.data_venda, v.total
ORDER BY v.data_venda DESC
LIMIT 10;

SELECT 'Pronto! Agora o sistema registra o custo no momento de cada venda.' AS mensagem;
