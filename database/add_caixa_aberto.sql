USE BomboniereERP;

-- Criar tabela de caixa aberto (estado atual)
CREATE TABLE IF NOT EXISTS caixa_aberto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operador VARCHAR(255) NOT NULL,
    data_hora_abertura TIMESTAMP NOT NULL,
    valor_abertura DECIMAL(10, 2) NOT NULL,
    total_vendas DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_reforcos DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_sangrias DECIMAL(10, 2) NOT NULL DEFAULT 0,
    movimentacoes JSON,
    INDEX idx_operador (operador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tabela caixa_aberto criada com sucesso!' AS mensagem;
