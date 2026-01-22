-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS BomboniereERP CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE BomboniereERP;

-- Remover tabelas se existirem (garante estrutura limpa)
DROP TABLE IF EXISTS sessoes;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS caixa_aberto;
DROP TABLE IF EXISTS movimentacoes_caixa;
DROP TABLE IF EXISTS fechamentos_caixa;
DROP TABLE IF EXISTS formas_pagamento_venda;
DROP TABLE IF EXISTS itens_venda;
DROP TABLE IF EXISTS vendas;
DROP TABLE IF EXISTS produtos;

-- ==========================================
-- TABELAS DE AUTENTICAÇÃO E USUÁRIOS
-- ==========================================

-- Tabela de usuários
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'operador') NOT NULL DEFAULT 'operador',
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de sessões
CREATE TABLE sessoes (
    id VARCHAR(255) PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    remember_token VARCHAR(500) UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expira_em TIMESTAMP NOT NULL,
    remember_expira_em TIMESTAMP,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_token (token),
    INDEX idx_expira_em (expira_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABELAS DE PRODUTOS E VENDAS
-- ==========================================

-- Tabela de produtos
CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_barras VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    desconto_percentual DECIMAL(5, 2) NOT NULL DEFAULT 0,
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
    usuario_id INT NULL,
    total DECIMAL(10, 2) NOT NULL,
    valor_pago DECIMAL(10, 2) NOT NULL,
    troco DECIMAL(10, 2) NOT NULL,
    quantidade_itens INT NOT NULL,
    desconto DECIMAL(10, 2) NOT NULL DEFAULT 0,
    data_venda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario_id (usuario_id),
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
    usuario_id INT NULL,
    operador VARCHAR(255) NOT NULL,
    data_hora_abertura TIMESTAMP NOT NULL,
    valor_abertura DECIMAL(10, 2) NOT NULL,
    total_vendas DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_reforcos DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_sangrias DECIMAL(10, 2) NOT NULL DEFAULT 0,
    movimentacoes JSON,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_operador (operador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de fechamentos de caixa
CREATE TABLE fechamentos_caixa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
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
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario_id (usuario_id),
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
    imprimir_cupom BOOLEAN NOT NULL DEFAULT TRUE,
    tempo_renderizacao_cupom INT NOT NULL DEFAULT 500,
    tempo_fechamento_cupom INT NOT NULL DEFAULT 500,
    timeout_fallback_cupom INT NOT NULL DEFAULT 3000,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipo_alerta CHECK (tipo_alerta IN ('dia_diferente', 'horas', 'desabilitado')),
    CONSTRAINT chk_horas_alerta CHECK (horas_alerta BETWEEN 1 AND 168),
    CONSTRAINT chk_tempo_renderizacao CHECK (tempo_renderizacao_cupom BETWEEN 100 AND 5000),
    CONSTRAINT chk_tempo_fechamento CHECK (tempo_fechamento_cupom BETWEEN 100 AND 5000),
    CONSTRAINT chk_timeout_fallback CHECK (timeout_fallback_cupom BETWEEN 1000 AND 10000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir configuração padrão
INSERT INTO configuracoes (id, tipo_alerta, horas_alerta, imprimir_cupom, tempo_renderizacao_cupom, tempo_fechamento_cupom, timeout_fallback_cupom) 
VALUES (1, 'dia_diferente', 24, TRUE, 500, 500, 3000)
ON DUPLICATE KEY UPDATE id = id;

-- Inserir usuário administrador padrão
-- Email: admin@bomboniere.com
-- Senha: @Bomboniere2025
-- IMPORTANTE: Troque a senha após primeiro login!
INSERT INTO usuarios (nome, email, senha_hash, role, ativo) VALUES
('Administrador', 'admin@bomboniere.com', '$2b$10$5Anx8VAnYODLYXJyxM79eOY./.VAuH8QWJVVqgtLFUAbAJwZOlVma', 'admin', TRUE)
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
SELECT COUNT(*) AS total_usuarios FROM usuarios;
SELECT CONCAT('Login: ', email, ' | Senha: @Bomboniere2025') AS credenciais_admin FROM usuarios WHERE role = 'admin' LIMIT 1;

