-- Migration: Adicionar controle de vendas canceladas
-- Data: 2026-02-03
-- Descrição: Adiciona coluna para marcar vendas como canceladas e campos de auditoria

USE BomboniereERP;

-- Adicionar coluna cancelado na tabela vendas
ALTER TABLE vendas 
ADD COLUMN cancelado BOOLEAN DEFAULT FALSE AFTER desconto,
ADD COLUMN data_cancelamento TIMESTAMP NULL AFTER cancelado,
ADD COLUMN motivo_cancelamento TEXT NULL AFTER data_cancelamento,
ADD COLUMN usuario_cancelamento_id INT NULL AFTER motivo_cancelamento,
ADD INDEX idx_cancelado (cancelado),
ADD INDEX idx_data_cancelamento (data_cancelamento);

-- Adicionar foreign key para usuário que cancelou
ALTER TABLE vendas
ADD CONSTRAINT fk_vendas_usuario_cancelamento 
FOREIGN KEY (usuario_cancelamento_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Comentários
ALTER TABLE vendas 
MODIFY COLUMN cancelado BOOLEAN DEFAULT FALSE COMMENT 'Indica se a venda foi cancelada',
MODIFY COLUMN data_cancelamento TIMESTAMP NULL COMMENT 'Data e hora do cancelamento',
MODIFY COLUMN motivo_cancelamento TEXT NULL COMMENT 'Motivo do cancelamento da venda',
MODIFY COLUMN usuario_cancelamento_id INT NULL COMMENT 'ID do usuário que cancelou a venda';

SELECT 'Migration aplicada com sucesso: vendas agora suportam cancelamento' AS status;
