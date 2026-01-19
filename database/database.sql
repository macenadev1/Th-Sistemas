-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS BomboniereERP CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE BomboniereERP;

-- Remover tabelas se existirem (garante estrutura limpa)
DROP TABLE IF EXISTS caixa_aberto;
DROP TABLE IF EXISTS movimentacoes_caixa;
DROP TABLE IF EXISTS fechamentos_caixa;
DROP TABLE IF EXISTS formas_pagamento_venda;
DROP TABLE IF EXISTS itens_venda;
DROP TABLE IF EXISTS vendas;
DROP TABLE IF EXISTS produtos;

-- Tabela de produtos
CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_barras VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    estoque INT NOT NULL DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_codigo_barras (codigo_barras),
    INDEX idx_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de vendas
CREATE TABLE vendas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total DECIMAL(10, 2) NOT NULL,
    valor_pago DECIMAL(10, 2) NOT NULL,
    troco DECIMAL(10, 2) NOT NULL,
    quantidade_itens INT NOT NULL,
    data_venda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_data_venda (data_venda)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de itens da venda
CREATE TABLE itens_venda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venda_id INT NOT NULL,
    produto_id INT NOT NULL,
    codigo_barras VARCHAR(100) NOT NULL,
    nome_produto VARCHAR(255) NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id),
    INDEX idx_venda_id (venda_id),
    INDEX idx_produto_id (produto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de formas de pagamento por venda
CREATE TABLE formas_pagamento_venda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venda_id INT NOT NULL,
    forma_pagamento ENUM('dinheiro', 'debito', 'credito', 'pix') NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
    INDEX idx_venda_id (venda_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de caixa aberto (estado atual)
CREATE TABLE caixa_aberto (
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

-- Tabela de fechamentos de caixa
CREATE TABLE fechamentos_caixa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operador VARCHAR(255) NOT NULL,
    data_hora_abertura TIMESTAMP NOT NULL,
    data_hora_fechamento TIMESTAMP NOT NULL,
    valor_abertura DECIMAL(10, 2) NOT NULL,
    total_vendas DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_reforcos DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_sangrias DECIMAL(10, 2) NOT NULL DEFAULT 0,
    saldo_esperado DECIMAL(10, 2) NOT NULL,
    saldo_real DECIMAL(10, 2) NOT NULL,
    diferenca DECIMAL(10, 2) NOT NULL,
    INDEX idx_data_fechamento (data_hora_fechamento),
    INDEX idx_operador (operador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de movimentações do caixa
CREATE TABLE movimentacoes_caixa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fechamento_id INT NOT NULL,
    tipo ENUM('abertura', 'venda', 'reforco', 'sangria', 'fechamento') NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    observacao TEXT,
    data_hora TIMESTAMP NOT NULL,
    FOREIGN KEY (fechamento_id) REFERENCES fechamentos_caixa(id) ON DELETE CASCADE,
    INDEX idx_fechamento_id (fechamento_id),
    INDEX idx_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de configurações do sistema
CREATE TABLE configuracoes (
    id INT PRIMARY KEY DEFAULT 1,
    tipo_alerta VARCHAR(20) NOT NULL DEFAULT 'dia_diferente',
    horas_alerta INT NOT NULL DEFAULT 24,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipo_alerta CHECK (tipo_alerta IN ('dia_diferente', 'horas', 'desabilitado')),
    CONSTRAINT chk_horas_alerta CHECK (horas_alerta BETWEEN 1 AND 168)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir configuração padrão
INSERT INTO configuracoes (id, tipo_alerta, horas_alerta) 
VALUES (1, 'dia_diferente', 24)
ON DUPLICATE KEY UPDATE id = id;

-- Inserir produtos de exemplo
INSERT INTO produtos (codigo_barras, nome, preco, estoque) VALUES
('7891234567890', 'Coca-Cola 2L', 9.99, 50),
('7891234567891', 'Arroz 5kg', 25.90, 30),
('7891234567892', 'Feijão 1kg', 8.50, 40),
('7891234567893', 'Açúcar 1kg', 4.99, 60),
('7891234567894', 'Café 500g', 15.90, 25),
('7891234567895', 'Leite 1L', 5.50, 80),
('7891234567896', 'Óleo de Soja 900ml', 7.90, 45),
('7891234567897', 'Macarrão 500g', 4.50, 70),
('7891234567898', 'Sal 1kg', 2.99, 90),
('7891234567899', 'Achocolatado 400g', 8.90, 35),
('123', 'Produto Teste', 10.00, 100)
ON DUPLICATE KEY UPDATE nome=VALUES(nome);

SELECT 'Banco de dados criado com sucesso!' AS mensagem;
SELECT COUNT(*) AS total_produtos FROM produtos;
