-- ============================================
-- MIGRATION 012: Taxas de maquininha por bandeira
-- Data: 2026-04-09
-- ============================================

USE BomboniereERP;

-- Adicionar campo bandeira em formas_pagamento_venda (se nao existir)
SET @sql = (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'formas_pagamento_venda'
            AND COLUMN_NAME = 'bandeira'
        ),
        'SELECT "Campo bandeira ja existe" AS aviso;',
        'ALTER TABLE formas_pagamento_venda ADD COLUMN bandeira VARCHAR(30) NULL AFTER valor;'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar campo parcelas em formas_pagamento_venda (se nao existir)
SET @sql = (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'formas_pagamento_venda'
            AND COLUMN_NAME = 'parcelas'
        ),
        'SELECT "Campo parcelas ja existe" AS aviso;',
        'ALTER TABLE formas_pagamento_venda ADD COLUMN parcelas INT NOT NULL DEFAULT 1 AFTER bandeira;'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar campo taxa_percentual em formas_pagamento_venda (se nao existir)
SET @sql = (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'formas_pagamento_venda'
            AND COLUMN_NAME = 'taxa_percentual'
        ),
        'SELECT "Campo taxa_percentual ja existe" AS aviso;',
        'ALTER TABLE formas_pagamento_venda ADD COLUMN taxa_percentual DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER parcelas;'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar campo valor_taxa em formas_pagamento_venda (se nao existir)
SET @sql = (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'formas_pagamento_venda'
            AND COLUMN_NAME = 'valor_taxa'
        ),
        'SELECT "Campo valor_taxa ja existe" AS aviso;',
        'ALTER TABLE formas_pagamento_venda ADD COLUMN valor_taxa DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER taxa_percentual;'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar campo valor_liquido em formas_pagamento_venda (se nao existir)
SET @sql = (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'formas_pagamento_venda'
            AND COLUMN_NAME = 'valor_liquido'
        ),
        'SELECT "Campo valor_liquido ja existe" AS aviso;',
        'ALTER TABLE formas_pagamento_venda ADD COLUMN valor_liquido DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER valor_taxa;'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Criar tabela de taxas por bandeira/parcela
CREATE TABLE IF NOT EXISTS taxas_maquininha (
    id INT AUTO_INCREMENT PRIMARY KEY,
    forma_pagamento ENUM('debito', 'credito', 'pix') NOT NULL,
    bandeira VARCHAR(30) NULL,
    parcelas INT NOT NULL DEFAULT 1,
    taxa_percentual DECIMAL(5,2) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_taxa_forma_bandeira_parcelas (forma_pagamento, bandeira, parcelas),
    INDEX idx_taxa_ativa (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar registros iniciais (taxa zero) para evitar bloqueio operacional
INSERT INTO taxas_maquininha (forma_pagamento, bandeira, parcelas, taxa_percentual, ativo) VALUES
('debito', 'visa', 1, 0.00, TRUE),
('debito', 'master', 1, 0.00, TRUE),
('debito', 'elo', 1, 0.00, TRUE),
('debito', 'amex', 1, 0.00, TRUE),
('credito', 'visa', 1, 0.00, TRUE),
('credito', 'master', 1, 0.00, TRUE),
('credito', 'elo', 1, 0.00, TRUE),
('credito', 'amex', 1, 0.00, TRUE),
('pix', 'pix', 1, 0.00, TRUE)
ON DUPLICATE KEY UPDATE
    taxa_percentual = VALUES(taxa_percentual),
    ativo = VALUES(ativo);

-- Backfill de valor_liquido para dados antigos
SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

UPDATE formas_pagamento_venda
SET valor_liquido = valor
WHERE valor_liquido = 0;

-- Recalcular valor_liquido de dinheiro considerando troco historico
UPDATE formas_pagamento_venda fp
INNER JOIN vendas v ON v.id = fp.venda_id
SET fp.valor_liquido = GREATEST(fp.valor - v.troco, 0)
WHERE fp.forma_pagamento = 'dinheiro';

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

SELECT 'Migration 012 aplicada com sucesso' AS status;
