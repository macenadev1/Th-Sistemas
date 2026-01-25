-- ==========================================
-- MIGRATION 002: ERP - CADASTROS BASE
-- Data: 2026-01-23
-- Descrição: Adiciona tabelas de clientes, fornecedores e categorias
-- ==========================================

USE BomboniereERP;

-- ==========================================
-- TABELA DE CLIENTES
-- ==========================================

DROP TABLE IF EXISTS clientes;

CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(20) UNIQUE,
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco TEXT,
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

-- ==========================================
-- TABELA DE FORNECEDORES
-- ==========================================

DROP TABLE IF EXISTS fornecedores;

CREATE TABLE fornecedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_fantasia VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cnpj VARCHAR(20) UNIQUE,
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco TEXT,
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

-- ==========================================
-- TABELA DE CATEGORIAS DE PRODUTOS
-- ==========================================

DROP TABLE IF EXISTS categorias_produtos;

CREATE TABLE categorias_produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nome (nome),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- TABELA DE CATEGORIAS FINANCEIRAS
-- ==========================================

DROP TABLE IF EXISTS categorias_financeiras;

CREATE TABLE categorias_financeiras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    tipo ENUM('receita', 'despesa') NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nome (nome),
    INDEX idx_tipo (tipo),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- ADICIONAR COLUNAS EM PRODUTOS
-- ==========================================

-- Verificar e adicionar fornecedor_id
SET @dbname = DATABASE();
SET @tablename = 'produtos';
SET @columnname = 'fornecedor_id';
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @dbname
        AND TABLE_NAME = @tablename
        AND COLUMN_NAME = @columnname
    ) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL, ADD INDEX idx_fornecedor_id (', @columnname, '), ADD FOREIGN KEY (', @columnname, ') REFERENCES fornecedores(id) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verificar e adicionar categoria_id
SET @columnname = 'categoria_id';
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @dbname
        AND TABLE_NAME = @tablename
        AND COLUMN_NAME = @columnname
    ) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL, ADD INDEX idx_categoria_id (', @columnname, '), ADD FOREIGN KEY (', @columnname, ') REFERENCES categorias_produtos(id) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ==========================================
-- DADOS DE EXEMPLO
-- ==========================================

-- Inserir fornecedores de exemplo
INSERT INTO fornecedores (nome_fantasia, razao_social, cnpj, telefone, email, cidade, estado) VALUES
('Distribuidora Alimentos Ltda', 'Distribuidora de Alimentos LTDA', '12.345.678/0001-90', '(11) 98765-4321', 'contato@distralimentos.com.br', 'São Paulo', 'SP'),
('Bebidas & Cia', 'Bebidas e Companhia S.A.', '98.765.432/0001-10', '(11) 91234-5678', 'vendas@bebidasecia.com.br', 'Campinas', 'SP'),
('Atacado Brasil', 'Atacado Brasil Ltda', '11.222.333/0001-44', '(21) 97777-8888', 'comercial@atacadobrasil.com.br', 'Rio de Janeiro', 'RJ')
ON DUPLICATE KEY UPDATE nome_fantasia=VALUES(nome_fantasia);

-- Inserir categorias de produtos de exemplo
INSERT INTO categorias_produtos (nome, descricao) VALUES
('Bebidas', 'Refrigerantes, sucos, águas e bebidas em geral'),
('Alimentos Básicos', 'Arroz, feijão, açúcar, sal e produtos essenciais'),
('Higiene e Limpeza', 'Produtos de limpeza e higiene pessoal'),
('Mercearia', 'Produtos diversos de mercearia'),
('Laticínios', 'Leite, queijos, iogurtes e derivados'),
('Padaria', 'Pães, bolos e produtos de padaria')
ON DUPLICATE KEY UPDATE nome=VALUES(nome);

-- Inserir categorias financeiras de exemplo
INSERT INTO categorias_financeiras (nome, tipo, descricao) VALUES
('Vendas', 'receita', 'Receitas provenientes de vendas'),
('Serviços', 'receita', 'Receitas de serviços prestados'),
('Compras de Mercadorias', 'despesa', 'Compras de produtos para revenda'),
('Salários', 'despesa', 'Pagamento de salários e encargos'),
('Aluguel', 'despesa', 'Pagamento de aluguel do estabelecimento'),
('Energia Elétrica', 'despesa', 'Contas de energia elétrica'),
('Água', 'despesa', 'Contas de água'),
('Internet/Telefone', 'despesa', 'Contas de telecomunicações'),
('Manutenção', 'despesa', 'Gastos com manutenção e reparos'),
('Impostos', 'despesa', 'Pagamento de impostos e taxas')
ON DUPLICATE KEY UPDATE nome=VALUES(nome);

-- Inserir clientes de exemplo
INSERT INTO clientes (nome, cpf_cnpj, telefone, email, cidade, estado, limite_credito) VALUES
('João Silva', '123.456.789-00', '(11) 98888-7777', 'joao.silva@email.com', 'São Paulo', 'SP', 500.00),
('Maria Santos', '987.654.321-00', '(11) 97777-6666', 'maria.santos@email.com', 'São Paulo', 'SP', 1000.00),
('Mercadinho do Zé', '12.345.678/0001-99', '(11) 96666-5555', 'contato@mercadinhodoze.com.br', 'Guarulhos', 'SP', 5000.00)
ON DUPLICATE KEY UPDATE nome=VALUES(nome);

SELECT '✅ Migration 002 executada com sucesso!' AS mensagem;
SELECT COUNT(*) AS total_fornecedores FROM fornecedores;
SELECT COUNT(*) AS total_clientes FROM clientes;
SELECT COUNT(*) AS total_categorias_produtos FROM categorias_produtos;
SELECT COUNT(*) AS total_categorias_financeiras FROM categorias_financeiras;
