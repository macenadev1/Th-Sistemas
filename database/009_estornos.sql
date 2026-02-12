-- ==========================================
-- MIGRATION 009: Sistema de Estornos
-- Descrição: Adiciona tabela para registrar estornos de contas pagas
-- Data: 2026-02-10
-- ==========================================

USE BomboniereERP;

-- Tabela de estornos de contas pagas
CREATE TABLE IF NOT EXISTS estornos_contas_pagar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conta_pagar_id INT NOT NULL,
    valor_estornado DECIMAL(10, 2) NOT NULL,
    motivo TEXT NOT NULL,
    saldo_antes_reposicao DECIMAL(10, 2) NOT NULL,
    saldo_antes_lucro DECIMAL(10, 2) NOT NULL,
    saldo_depois_reposicao DECIMAL(10, 2) NOT NULL,
    saldo_depois_lucro DECIMAL(10, 2) NOT NULL,
    mes_estornado DATE NOT NULL COMMENT 'Mês que recebeu o estorno (YYYY-MM-01)',
    usuario_id INT NULL,
    data_estorno TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conta_pagar_id) REFERENCES contas_pagar(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_conta_pagar_id (conta_pagar_id),
    INDEX idx_data_estorno (data_estorno),
    INDEX idx_mes_estornado (mes_estornado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar coluna para rastrear valor total estornado (verifica se não existe)
SET @dbname = DATABASE();
SET @tablename = 'contas_pagar';
SET @columnname = 'valor_estornado';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  'ALTER TABLE contas_pagar ADD COLUMN valor_estornado DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT "Valor total estornado desta conta"'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Adicionar índice para otimizar consultas (verifica se não existe)
SET @indexname = 'idx_valor_estornado';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname)
  ) > 0,
  'SELECT 1',
  'ALTER TABLE contas_pagar ADD INDEX idx_valor_estornado (valor_estornado)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SELECT '✅ Migration 009 (Estornos) aplicada com sucesso!' AS mensagem;
