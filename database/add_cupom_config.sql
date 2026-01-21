-- ================================================
-- Script de Atualização: Configurações de Cupom
-- ================================================
-- Data: 21/01/2026
-- Descrição: Adiciona campos de configuração de tempo para impressão de cupom

USE BomboniereERP;

-- Adicionar campo imprimir_cupom se não existir
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'configuracoes' 
    AND COLUMN_NAME = 'imprimir_cupom');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE configuracoes ADD COLUMN imprimir_cupom BOOLEAN NOT NULL DEFAULT TRUE AFTER horas_alerta;',
    'SELECT "Campo imprimir_cupom já existe" AS aviso;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar campo tempo_renderizacao_cupom se não existir
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'configuracoes' 
    AND COLUMN_NAME = 'tempo_renderizacao_cupom');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE configuracoes ADD COLUMN tempo_renderizacao_cupom INT NOT NULL DEFAULT 500 AFTER imprimir_cupom;',
    'SELECT "Campo tempo_renderizacao_cupom já existe" AS aviso;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar campo tempo_fechamento_cupom se não existir
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'configuracoes' 
    AND COLUMN_NAME = 'tempo_fechamento_cupom');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE configuracoes ADD COLUMN tempo_fechamento_cupom INT NOT NULL DEFAULT 500 AFTER tempo_renderizacao_cupom;',
    'SELECT "Campo tempo_fechamento_cupom já existe" AS aviso;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar campo timeout_fallback_cupom se não existir
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'configuracoes' 
    AND COLUMN_NAME = 'timeout_fallback_cupom');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE configuracoes ADD COLUMN timeout_fallback_cupom INT NOT NULL DEFAULT 3000 AFTER tempo_fechamento_cupom;',
    'SELECT "Campo timeout_fallback_cupom já existe" AS aviso;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar constraints de validação (apenas se os campos foram criados agora)
-- Verificar se a constraint já existe
SET @constraint_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'configuracoes' 
    AND CONSTRAINT_NAME = 'chk_tempo_renderizacao');

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE configuracoes ADD CONSTRAINT chk_tempo_renderizacao CHECK (tempo_renderizacao_cupom BETWEEN 100 AND 5000);',
    'SELECT "Constraint chk_tempo_renderizacao já existe" AS aviso;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'configuracoes' 
    AND CONSTRAINT_NAME = 'chk_tempo_fechamento');

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE configuracoes ADD CONSTRAINT chk_tempo_fechamento CHECK (tempo_fechamento_cupom BETWEEN 100 AND 5000);',
    'SELECT "Constraint chk_tempo_fechamento já existe" AS aviso;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'BomboniereERP' 
    AND TABLE_NAME = 'configuracoes' 
    AND CONSTRAINT_NAME = 'chk_timeout_fallback');

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE configuracoes ADD CONSTRAINT chk_timeout_fallback CHECK (timeout_fallback_cupom BETWEEN 1000 AND 10000);',
    'SELECT "Constraint chk_timeout_fallback já existe" AS aviso;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Atualizar registro existente com valores padrão (se existir)
UPDATE configuracoes SET
    imprimir_cupom = COALESCE(imprimir_cupom, TRUE),
    tempo_renderizacao_cupom = COALESCE(tempo_renderizacao_cupom, 500),
    tempo_fechamento_cupom = COALESCE(tempo_fechamento_cupom, 500),
    timeout_fallback_cupom = COALESCE(timeout_fallback_cupom, 3000)
WHERE id = 1;

SELECT '✅ Migração concluída com sucesso!' AS mensagem;
SELECT * FROM configuracoes WHERE id = 1;
