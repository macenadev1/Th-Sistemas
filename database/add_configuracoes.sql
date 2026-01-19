-- Script para adicionar tabela de configurações
-- Execute este script no seu banco de dados MySQL

CREATE TABLE IF NOT EXISTS configuracoes (
    id INT PRIMARY KEY DEFAULT 1,
    tipo_alerta VARCHAR(20) NOT NULL DEFAULT 'dia_diferente',
    horas_alerta INT NOT NULL DEFAULT 24,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipo_alerta CHECK (tipo_alerta IN ('dia_diferente', 'horas', 'desabilitado')),
    CONSTRAINT chk_horas_alerta CHECK (horas_alerta BETWEEN 1 AND 168)
);

-- Inserir configuração padrão
INSERT INTO configuracoes (id, tipo_alerta, horas_alerta) 
VALUES (1, 'dia_diferente', 24)
ON DUPLICATE KEY UPDATE id = id;

-- Verificar se a tabela foi criada
SELECT * FROM configuracoes;
