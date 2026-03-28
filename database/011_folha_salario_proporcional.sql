USE BomboniereERP;

-- ==========================================
-- Atualizacao 011: Salario Proporcional por Admissao
-- Data: 27/03/2026
-- ==========================================

ALTER TABLE itens_folha_pagamento
    ADD COLUMN salario_base_integral DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER funcionario_id,
    ADD COLUMN dias_periodo TINYINT NOT NULL DEFAULT 30 AFTER salario_base,
    ADD COLUMN dias_trabalhados TINYINT NOT NULL DEFAULT 30 AFTER dias_periodo;

UPDATE itens_folha_pagamento
SET
    salario_base_integral = salario_base,
    dias_periodo = CASE
        WHEN folha_id IS NOT NULL THEN DAY(LAST_DAY(STR_TO_DATE(CONCAT(
            (SELECT fp.ano FROM folha_pagamento fp WHERE fp.id = itens_folha_pagamento.folha_id),
            '-',
            LPAD((SELECT fp.mes FROM folha_pagamento fp WHERE fp.id = itens_folha_pagamento.folha_id), 2, '0'),
            '-01'
        ), '%Y-%m-%d')))
        ELSE 30
    END,
    dias_trabalhados = CASE
        WHEN folha_id IS NOT NULL THEN DAY(LAST_DAY(STR_TO_DATE(CONCAT(
            (SELECT fp.ano FROM folha_pagamento fp WHERE fp.id = itens_folha_pagamento.folha_id),
            '-',
            LPAD((SELECT fp.mes FROM folha_pagamento fp WHERE fp.id = itens_folha_pagamento.folha_id), 2, '0'),
            '-01'
        ), '%Y-%m-%d')))
        ELSE 30
    END
WHERE salario_base_integral = 0;

SELECT 'Atualizacao 011 aplicada com sucesso!' AS mensagem;
