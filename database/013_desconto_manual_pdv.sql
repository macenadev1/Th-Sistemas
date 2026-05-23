USE BomboniereERP;

-- ==========================================
-- Atualizacao 013: Desconto Manual no PDV
-- Data: 23/05/2026
-- ==========================================

SET @schema_name = DATABASE();

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'vendas' AND COLUMN_NAME = 'subtotal_bruto') = 0,
    'ALTER TABLE vendas ADD COLUMN subtotal_bruto DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER desconto',
    'SELECT ''vendas.subtotal_bruto ja existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'vendas' AND COLUMN_NAME = 'desconto_manual_total_tipo') = 0,
    'ALTER TABLE vendas ADD COLUMN desconto_manual_total_tipo ENUM(''valor'', ''percentual'') NULL AFTER subtotal_bruto',
    'SELECT ''vendas.desconto_manual_total_tipo ja existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'vendas' AND COLUMN_NAME = 'desconto_manual_total_valor') = 0,
    'ALTER TABLE vendas ADD COLUMN desconto_manual_total_valor DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER desconto_manual_total_tipo',
    'SELECT ''vendas.desconto_manual_total_valor ja existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'vendas' AND COLUMN_NAME = 'desconto_manual_total_aplicado') = 0,
    'ALTER TABLE vendas ADD COLUMN desconto_manual_total_aplicado DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER desconto_manual_total_valor',
    'SELECT ''vendas.desconto_manual_total_aplicado ja existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'vendas' AND COLUMN_NAME = 'desconto_manual_itens_aplicado') = 0,
    'ALTER TABLE vendas ADD COLUMN desconto_manual_itens_aplicado DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER desconto_manual_total_aplicado',
    'SELECT ''vendas.desconto_manual_itens_aplicado ja existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'itens_venda' AND COLUMN_NAME = 'subtotal_bruto') = 0,
    'ALTER TABLE itens_venda ADD COLUMN subtotal_bruto DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER preco_custo_unitario',
    'SELECT ''itens_venda.subtotal_bruto ja existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'itens_venda' AND COLUMN_NAME = 'desconto_manual_tipo') = 0,
    'ALTER TABLE itens_venda ADD COLUMN desconto_manual_tipo ENUM(''valor'', ''percentual'') NULL AFTER subtotal_bruto',
    'SELECT ''itens_venda.desconto_manual_tipo ja existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'itens_venda' AND COLUMN_NAME = 'desconto_manual_valor') = 0,
    'ALTER TABLE itens_venda ADD COLUMN desconto_manual_valor DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER desconto_manual_tipo',
    'SELECT ''itens_venda.desconto_manual_valor ja existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'itens_venda' AND COLUMN_NAME = 'desconto_manual_aplicado') = 0,
    'ALTER TABLE itens_venda ADD COLUMN desconto_manual_aplicado DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER desconto_manual_valor',
    'SELECT ''itens_venda.desconto_manual_aplicado ja existe'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE vendas
SET subtotal_bruto = ROUND(total + desconto, 2)
WHERE subtotal_bruto = 0
    AND id > 0;

UPDATE itens_venda
SET subtotal_bruto = subtotal
WHERE subtotal_bruto = 0
    AND id > 0;

SELECT 'Atualizacao 013 aplicada com sucesso!' AS mensagem;
