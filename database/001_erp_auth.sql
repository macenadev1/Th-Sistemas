-- ==========================================
-- MIGRATION 001: Sistema de Autenticação ERP
-- ==========================================
-- Data: 21/01/2026
-- Descrição: Adiciona tabelas de usuários, sessões e campos de auditoria
-- ==========================================

USE BomboniereERP;

-- Remover tabelas de autenticação antigas se existirem
DROP TABLE IF EXISTS sessoes;
DROP TABLE IF EXISTS usuarios;

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

-- Adicionar campo usuario_id nas tabelas existentes (aceita NULL para dados históricos)
-- Usando procedure para evitar erros se coluna já existir

-- Adicionar em vendas
SET @query = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'BomboniereERP' 
     AND TABLE_NAME = 'vendas' 
     AND COLUMN_NAME = 'usuario_id') = 0,
    'ALTER TABLE vendas ADD COLUMN usuario_id INT NULL AFTER id, ADD INDEX idx_usuario_id_vendas (usuario_id), ADD CONSTRAINT fk_vendas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL',
    'SELECT "Coluna usuario_id já existe em vendas"'
));
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar em caixa_aberto
SET @query = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'BomboniereERP' 
     AND TABLE_NAME = 'caixa_aberto' 
     AND COLUMN_NAME = 'usuario_id') = 0,
    'ALTER TABLE caixa_aberto ADD COLUMN usuario_id INT NULL AFTER id, ADD INDEX idx_usuario_id_caixa (usuario_id), ADD CONSTRAINT fk_caixa_aberto_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL',
    'SELECT "Coluna usuario_id já existe em caixa_aberto"'
));
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar em fechamentos_caixa
SET @query = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'BomboniereERP' 
     AND TABLE_NAME = 'fechamentos_caixa' 
     AND COLUMN_NAME = 'usuario_id') = 0,
    'ALTER TABLE fechamentos_caixa ADD COLUMN usuario_id INT NULL AFTER id, ADD INDEX idx_usuario_id_fechamentos (usuario_id), ADD CONSTRAINT fk_fechamentos_caixa_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL',
    'SELECT "Coluna usuario_id já existe em fechamentos_caixa"'
));
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Criar usuário administrador padrão
-- Senha: @Bomboniere2025 (mesmo padrão atual)
-- Hash bcrypt com 10 rounds
INSERT INTO usuarios (nome, email, senha_hash, role, ativo) VALUES
('Administrador', 'admin@bomboniere.com', '$2b$10$5Anx8VAnYODLYXJyxM79eOY./.VAuH8QWJVVqgtLFUAbAJwZOlVma', 'admin', TRUE)
ON DUPLICATE KEY UPDATE id = id;

-- Nota: O hash acima é um placeholder. O hash real será gerado no primeiro login
-- ou pode ser gerado com: node -e "const bcrypt = require('bcrypt'); bcrypt.hash('@Bomboniere2025', 10, (err, hash) => console.log(hash));"

SELECT 'Migration 001 aplicada com sucesso!' AS mensagem;
SELECT COUNT(*) AS total_usuarios FROM usuarios;
