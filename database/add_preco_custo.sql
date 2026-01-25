-- ============================================
-- Adicionar campo preco_custo aos produtos
-- ============================================
-- Este script adiciona a coluna preco_custo na tabela produtos
-- para permitir o cálculo de margem de lucro nos relatórios

USE BomboniereERP;

-- Verificar se a coluna já existe antes de adicionar
SET @dbname = DATABASE();
SET @tablename = 'produtos';
SET @columnname = 'preco_custo';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1;', -- Coluna já existe, não fazer nada
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER preco;') -- Adicionar coluna
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SELECT 'Script executado com sucesso!' AS mensagem;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'BomboniereERP' 
  AND TABLE_NAME = 'produtos' 
  AND COLUMN_NAME = 'preco_custo';
