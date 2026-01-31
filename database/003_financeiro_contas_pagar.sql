-- ==========================================
-- MÓDULO FINANCEIRO - CONTAS A PAGAR
-- ==========================================

USE BomboniereERP;

-- Tabela de contas a pagar (dívidas da loja)
CREATE TABLE IF NOT EXISTS contas_pagar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    categoria_id INT NULL,
    fornecedor_id INT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE NULL,
    status ENUM('pendente', 'pago', 'vencido', 'cancelado') NOT NULL DEFAULT 'pendente',
    forma_pagamento ENUM('dinheiro', 'debito', 'credito', 'pix', 'boleto', 'transferencia') NULL,
    observacoes TEXT,
    usuario_id INT NULL,
    anexo VARCHAR(500) NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_data_vencimento (data_vencimento),
    INDEX idx_data_pagamento (data_pagamento),
    INDEX idx_fornecedor_id (fornecedor_id),
    INDEX idx_categoria_id (categoria_id),
    INDEX idx_vencidas (status, data_vencimento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir categorias financeiras de despesas (se ainda não existem)
INSERT INTO categorias_financeiras (nome, tipo, descricao) VALUES
('Compras de Mercadorias', 'despesa', 'Compras de produtos para revenda'),
('Fornecedores', 'despesa', 'Pagamentos a fornecedores'),
('Contas de Consumo', 'despesa', 'Água, luz, gás, internet'),
('Impostos e Taxas', 'despesa', 'Tributos e taxas diversas'),
('Manutenção', 'despesa', 'Manutenção do estabelecimento'),
('Serviços Terceirizados', 'despesa', 'Contabilidade, limpeza, etc')
ON DUPLICATE KEY UPDATE nome=VALUES(nome);

-- Inserir alguns exemplos de contas a pagar (para teste)
INSERT INTO contas_pagar (descricao, categoria_id, fornecedor_id, valor, data_vencimento, status) VALUES
('Fatura Energia Elétrica - Janeiro', (SELECT id FROM categorias_financeiras WHERE nome = 'Contas de Consumo' LIMIT 1), NULL, 450.00, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'pendente'),
('Compra Mercadorias - Distribuidora Alimentos', (SELECT id FROM categorias_financeiras WHERE nome = 'Fornecedores' LIMIT 1), (SELECT id FROM fornecedores WHERE nome_fantasia = 'Distribuidora Alimentos Ltda' LIMIT 1), 3500.00, DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'pendente'),
('Aluguel do Imóvel', (SELECT id FROM categorias_financeiras WHERE nome = 'Aluguel' LIMIT 1), NULL, 2500.00, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'pendente'),
('Internet e Telefone', (SELECT id FROM categorias_financeiras WHERE nome = 'Contas de Consumo' LIMIT 1), NULL, 199.90, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'vencido'),
('Contador - Serviços Contábeis', (SELECT id FROM categorias_financeiras WHERE nome = 'Serviços Terceirizados' LIMIT 1), NULL, 800.00, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'pendente')
ON DUPLICATE KEY UPDATE id = id;

SELECT 'Tabela contas_pagar criada com sucesso!' AS mensagem;
SELECT COUNT(*) AS total_contas_pagar FROM contas_pagar;
