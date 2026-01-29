-- ==========================================
-- DATABASE PRODUÇÃO - BomboniereERP
-- ==========================================
-- Versão limpa sem dados de teste
-- Última atualização: 28/01/2026
-- ==========================================

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
DROP TABLE IF EXISTS contas_pagar;
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS fornecedores;
DROP TABLE IF EXISTS categorias_produtos;
DROP TABLE IF EXISTS categorias_financeiras;
DROP TABLE IF EXISTS saldos_iniciais;

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
-- TABELAS DE CADASTROS BASE (ERP)
-- ==========================================

-- Tabela de clientes
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(18) UNIQUE,
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco VARCHAR(255),
    cep VARCHAR(10),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    limite_credito DECIMAL(10, 2) DEFAULT 0,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome (nome),
    INDEX idx_cpf_cnpj (cpf_cnpj),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de fornecedores
CREATE TABLE fornecedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_fantasia VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE,
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco VARCHAR(255),
    cep VARCHAR(10),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    contato_principal VARCHAR(255),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome_fantasia (nome_fantasia),
    INDEX idx_cnpj (cnpj),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de categorias de produtos
CREATE TABLE categorias_produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome (nome),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de categorias financeiras
CREATE TABLE categorias_financeiras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    tipo ENUM('receita', 'despesa') NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome (nome),
    INDEX idx_tipo (tipo),
    INDEX idx_ativo (ativo)
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
    preco_custo DECIMAL(10, 2) NOT NULL DEFAULT 0,
    desconto_percentual DECIMAL(5, 2) NOT NULL DEFAULT 0,
    estoque INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 0,
    fornecedor_id INT NULL,
    categoria_id INT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL,
    FOREIGN KEY (categoria_id) REFERENCES categorias_produtos(id) ON DELETE SET NULL,
    INDEX idx_codigo_barras (codigo_barras),
    INDEX idx_nome (nome),
    INDEX idx_fornecedor_id (fornecedor_id),
    INDEX idx_categoria_id (categoria_id),
    INDEX idx_estoque_alerta (estoque, estoque_minimo, ativo)
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
    preco_custo_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0,
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

-- ==========================================
-- TABELAS DE CAIXA
-- ==========================================

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

-- ==========================================
-- TABELAS DO MÓDULO FINANCEIRO
-- ==========================================

-- Tabela de contas a pagar
CREATE TABLE contas_pagar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE NULL,
    status ENUM('pendente', 'pago', 'vencido', 'cancelado') NOT NULL DEFAULT 'pendente',
    categoria_id INT NULL,
    fornecedor_id INT NULL,
    forma_pagamento ENUM('dinheiro', 'debito', 'credito', 'pix', 'boleto', 'transferencia') NULL,
    observacoes TEXT,
    usuario_id INT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_data_vencimento (data_vencimento),
    INDEX idx_data_pagamento (data_pagamento),
    INDEX idx_categoria_id (categoria_id),
    INDEX idx_fornecedor_id (fornecedor_id),
    INDEX idx_status_vencimento (status, data_vencimento),
    INDEX idx_origem_pagamento (origem_pagamento),
    INDEX idx_mes_referencia (mes_referencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de saldos iniciais (módulo financeiro)
CREATE TABLE saldos_iniciais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mes_ano DATE NOT NULL UNIQUE,
    saldo_reposicao DECIMAL(10, 2) NOT NULL DEFAULT 0,
    saldo_lucro DECIMAL(10, 2) NOT NULL DEFAULT 0,
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mes_ano (mes_ano)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABELAS DE CONFIGURAÇÕES
-- ==========================================

-- Tabela de configurações do sistema
CREATE TABLE configuracoes (
    id INT PRIMARY KEY DEFAULT 1,
    tipo_alerta VARCHAR(20) NOT NULL DEFAULT 'dia_diferente',
    horas_alerta INT NOT NULL DEFAULT 24,
    imprimir_cupom BOOLEAN NOT NULL DEFAULT TRUE,
    tempo_renderizacao_cupom INT NOT NULL DEFAULT 500,
    tempo_fechamento_cupom INT NOT NULL DEFAULT 500,
    timeout_fallback_cupom INT NOT NULL DEFAULT 3000,
    permite_venda_estoque_zero BOOLEAN NOT NULL DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipo_alerta CHECK (tipo_alerta IN ('dia_diferente', 'horas', 'desabilitado')),
    CONSTRAINT chk_horas_alerta CHECK (horas_alerta BETWEEN 1 AND 168),
    CONSTRAINT chk_tempo_renderizacao CHECK (tempo_renderizacao_cupom BETWEEN 100 AND 5000),
    CONSTRAINT chk_tempo_fechamento CHECK (tempo_fechamento_cupom BETWEEN 100 AND 5000),
    CONSTRAINT chk_timeout_fallback CHECK (timeout_fallback_cupom BETWEEN 1000 AND 10000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- DADOS ESSENCIAIS PARA PRODUÇÃO
-- ==========================================

-- Inserir configuração padrão do sistema
INSERT INTO configuracoes (
    id, 
    tipo_alerta, 
    horas_alerta, 
    imprimir_cupom, 
    tempo_renderizacao_cupom, 
    tempo_fechamento_cupom, 
    timeout_fallback_cupom,
    permite_venda_estoque_zero
) VALUES (
    1, 
    'dia_diferente', 
    24, 
    TRUE, 
    500, 
    500, 
    3000,
    FALSE
) ON DUPLICATE KEY UPDATE id = id;

-- Inserir usuário administrador padrão
-- Email: admin@bomboniere.com
-- Senha: @Bomboniere2025
-- ⚠️ IMPORTANTE: TROQUE A SENHA APÓS PRIMEIRO LOGIN!
INSERT INTO usuarios (
    nome, 
    email, 
    senha_hash, 
    role, 
    ativo
) VALUES (
    'Administrador', 
    'admin@bomboniere.com', 
    '$2b$10$5Anx8VAnYODLYXJyxM79eOY./.VAuH8QWJVVqgtLFUAbAJwZOlVma', 
    'admin', 
    TRUE
) ON DUPLICATE KEY UPDATE id = id;

-- Inserir categorias financeiras essenciais
INSERT INTO categorias_financeiras (nome, tipo, descricao) VALUES
('Vendas', 'receita', 'Receitas de vendas de produtos'),
('Serviços', 'receita', 'Receitas de prestação de serviços'),
('Compras', 'despesa', 'Despesas com compra de mercadorias'),
('Salários', 'despesa', 'Pagamento de salários e encargos'),
('Aluguel', 'despesa', 'Pagamento de aluguel'),
('Energia', 'despesa', 'Conta de energia elétrica'),
('Água', 'despesa', 'Conta de água'),
('Internet/Telefone', 'despesa', 'Despesas com internet e telefone'),
('Manutenção', 'despesa', 'Despesas com manutenção e reparos'),
('Impostos', 'despesa', 'Pagamento de impostos e taxas')
ON DUPLICATE KEY UPDATE nome=VALUES(nome);

-- ==========================================
-- MENSAGENS FINAIS
-- ==========================================

SELECT '✅ Banco de dados de PRODUÇÃO criado com sucesso!' AS mensagem;
SELECT 'ℹ️  Estrutura limpa sem dados de teste' AS info;
SELECT 'ℹ️  Pronto para migração de produtos do CSV' AS info2;
SELECT '⚠️  LEMBRE-SE: Trocar senha do admin após primeiro login!' AS alerta;
SELECT '' AS espaco;
SELECT 'Login: admin@bomboniere.com' AS credenciais;
SELECT 'Senha: @Bomboniere2025' AS senha_padrao;
