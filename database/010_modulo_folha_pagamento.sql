USE BomboniereERP;

-- ==========================================
-- Atualizacao 010: Modulo de Funcionarios e Folha
-- Data: 27/03/2026
-- ==========================================

CREATE TABLE IF NOT EXISTS funcionarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    data_admissao DATE NOT NULL,
    salario_base DECIMAL(10, 2) NOT NULL,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome (nome),
    INDEX idx_ativo (ativo),
    INDEX idx_data_admissao (data_admissao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS folha_pagamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mes TINYINT NOT NULL,
    ano SMALLINT NOT NULL,
    status ENUM('rascunho', 'fechada', 'paga', 'cancelada') NOT NULL DEFAULT 'rascunho',
    total_bruto DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_descontos DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_liquido DECIMAL(10, 2) NOT NULL DEFAULT 0,
    data_geracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_pagamento DATE NULL,
    usuario_id INT NULL,
    CONSTRAINT chk_folha_mes CHECK (mes BETWEEN 1 AND 12),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE KEY uk_mes_ano (mes, ano),
    INDEX idx_status (status),
    INDEX idx_ano_mes (ano, mes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS itens_folha_pagamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folha_id INT NOT NULL,
    funcionario_id INT NOT NULL,
    salario_base_integral DECIMAL(10, 2) NOT NULL,
    salario_base DECIMAL(10, 2) NOT NULL,
    dias_periodo TINYINT NOT NULL DEFAULT 30,
    dias_trabalhados TINYINT NOT NULL DEFAULT 30,
    bonificacao DECIMAL(10, 2) NOT NULL DEFAULT 0,
    desconto_manual DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_descontos DECIMAL(10, 2) NOT NULL DEFAULT 0,
    liquido DECIMAL(10, 2) NOT NULL,
    observacoes TEXT,
    pago BOOLEAN DEFAULT FALSE,
    conta_pagar_id INT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folha_id) REFERENCES folha_pagamento(id) ON DELETE CASCADE,
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_folha_funcionario (folha_id, funcionario_id),
    INDEX idx_folha_id (folha_id),
    INDEX idx_funcionario_id (funcionario_id),
    INDEX idx_pago (pago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categorias_financeiras (nome, tipo, descricao)
SELECT 'Salários', 'despesa', 'Pagamento de salários e encargos'
WHERE NOT EXISTS (
    SELECT 1 FROM categorias_financeiras WHERE nome = 'Salários' AND tipo = 'despesa'
);

SELECT 'Atualizacao 010 aplicada com sucesso!' AS mensagem;
