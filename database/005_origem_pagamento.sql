-- ==========================================
-- MIGRAÇÃO: Sistema de Origem de Pagamentos
-- ==========================================
-- Data: 27/01/2026
-- Objetivo: Rastrear se pagamentos saem de Reposição ou Lucro
-- Regras: Origem obrigatória ao pagar, validação de saldo em tempo real

USE BomboniereERP;

-- ==========================================
-- 1. ADICIONAR CAMPOS EM CONTAS_PAGAR
-- ==========================================

-- Verificar e adicionar origem_pagamento se não existir
SET @dbname = 'BomboniereERP';
SET @tablename = 'contas_pagar';
SET @columnname = 'origem_pagamento';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT "Column origem_pagamento already exists" AS result',
  'ALTER TABLE contas_pagar ADD COLUMN origem_pagamento ENUM(\'reposicao\', \'lucro\') NULL COMMENT \'Origem do dinheiro: reposicao (custos) ou lucro (operacional)\''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verificar e adicionar mes_referencia se não existir
SET @columnname = 'mes_referencia';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT "Column mes_referencia already exists" AS result',
  'ALTER TABLE contas_pagar ADD COLUMN mes_referencia DATE NULL COMMENT \'Mês de referência da despesa (permite futuro, mas dedução sempre do mês atual)\''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verificar e adicionar índices se não existirem
SET @tablename = 'contas_pagar';
SET @indexname = 'idx_origem_pagamento';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = @indexname
  ) > 0,
  'SELECT "Index idx_origem_pagamento already exists" AS result',
  'ALTER TABLE contas_pagar ADD INDEX idx_origem_pagamento (origem_pagamento)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @indexname = 'idx_mes_referencia';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = @indexname
  ) > 0,
  'SELECT "Index idx_mes_referencia already exists" AS result',
  'ALTER TABLE contas_pagar ADD INDEX idx_mes_referencia (mes_referencia)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @indexname = 'idx_origem_mes';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = @indexname
  ) > 0,
  'SELECT "Index idx_origem_mes already exists" AS result',
  'ALTER TABLE contas_pagar ADD INDEX idx_origem_mes (origem_pagamento, mes_referencia)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ==========================================
-- 2. CRIAR TABELA DE SALDOS INICIAIS
-- ==========================================

-- Tabela para configurar saldos iniciais manualmente (ajustes de início de mês)
CREATE TABLE IF NOT EXISTS saldos_iniciais (
    mes_ano DATE PRIMARY KEY COMMENT 'Primeiro dia do mês (formato: YYYY-MM-01)',
    saldo_reposicao DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Saldo inicial manual de reposição para o mês',
    saldo_lucro DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Saldo inicial manual de lucro para o mês',
    observacoes TEXT COMMENT 'Notas sobre ajustes manuais',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mes_ano (mes_ano)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Saldos iniciais manuais por mês para Reposição e Lucro';

-- ==========================================
-- 3. INSERIR SALDO INICIAL PARA MÊS ATUAL
-- ==========================================

-- Inserir registro para janeiro/2026 com saldos zerados (usuário ajustará depois)
INSERT INTO saldos_iniciais (mes_ano, saldo_reposicao, saldo_lucro, observacoes) 
VALUES ('2026-01-01', 0.00, 0.00, 'Saldo inicial - ajustar conforme necessário')
ON DUPLICATE KEY UPDATE mes_ano = mes_ano;

-- ==========================================
-- VALIDAÇÕES E CONSULTAS DE TESTE
-- ==========================================

-- Verificar estrutura atualizada de contas_pagar
SELECT 
    'Estrutura atualizada' AS info,
    COUNT(*) AS total_contas,
    SUM(CASE WHEN origem_pagamento IS NULL THEN 1 ELSE 0 END) AS contas_sem_origem,
    SUM(CASE WHEN status = 'pendente' AND origem_pagamento IS NULL THEN 1 ELSE 0 END) AS pendentes_sem_origem
FROM contas_pagar;

-- Verificar tabela de saldos iniciais
SELECT 
    mes_ano,
    saldo_reposicao,
    saldo_lucro,
    observacoes
FROM saldos_iniciais 
ORDER BY mes_ano DESC;

-- Mensagem de conclusão
SELECT '✅ Migração 005_origem_pagamento concluída com sucesso!' AS status;
SELECT 'IMPORTANTE: Contas antigas sem origem serão bloqueadas até seleção manual no pagamento' AS aviso;
SELECT 'PRÓXIMO PASSO: Configurar saldos iniciais no dashboard ERP' AS acao;
