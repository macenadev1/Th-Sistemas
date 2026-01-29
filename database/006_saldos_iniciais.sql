-- ==========================================
-- TABELA DE SALDOS INICIAIS
-- ==========================================
-- Armazena saldos iniciais de Reposição e Lucro por mês
-- Permite configurar valores iniciais antes de começar a usar o sistema

USE BomboniereERP;

-- Tabela de saldos iniciais mensais
CREATE TABLE IF NOT EXISTS saldos_iniciais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mes_ano DATE NOT NULL UNIQUE COMMENT 'Formato YYYY-MM-01 (sempre dia 01)',
    saldo_reposicao DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Saldo inicial da carteira de reposição',
    saldo_lucro DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Saldo inicial da carteira de lucro',
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mes_ano (mes_ano)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tabela saldos_iniciais criada com sucesso!' AS mensagem;
