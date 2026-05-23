-- Migration 012: Suporte a Contas a Pagar Recorrentes
-- Data: 2026-05-23
-- Descrição: Adiciona campos de recorrência à tabela contas_pagar,
--            permitindo cadastro de contas que se repetem automaticamente
--            entre uma data de início e uma data de fim.

ALTER TABLE contas_pagar
    ADD COLUMN recorrente TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Indica se a conta pertence a uma série recorrente'
        AFTER observacoes,

    ADD COLUMN frequencia_recorrencia ENUM('mensal','bimestral','trimestral','semestral','anual') NULL
        COMMENT 'Frequência de repetição da série'
        AFTER recorrente,

    ADD COLUMN data_inicio_recorrencia DATE NULL
        COMMENT 'Data de início da série recorrente'
        AFTER frequencia_recorrencia,

    ADD COLUMN data_fim_recorrencia DATE NULL
        COMMENT 'Data de fim da série recorrente'
        AFTER data_inicio_recorrencia,

    ADD COLUMN conta_pai_id INT NULL
        COMMENT 'ID da conta pai (primeira da série). NULL = é a própria conta pai.'
        AFTER data_fim_recorrencia,

    ADD CONSTRAINT fk_conta_pai
        FOREIGN KEY (conta_pai_id) REFERENCES contas_pagar(id) ON DELETE SET NULL,

    ADD INDEX idx_recorrente (recorrente),
    ADD INDEX idx_conta_pai_id (conta_pai_id);
