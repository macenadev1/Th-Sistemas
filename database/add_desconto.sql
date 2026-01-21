-- Adicionar campo desconto na tabela vendas
USE BomboniereERP;

ALTER TABLE vendas 
ADD COLUMN desconto DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER quantidade_itens;

-- Atualizar vendas existentes (caso existam)
UPDATE vendas SET desconto = 0 WHERE desconto IS NULL;

SELECT 'Campo desconto adicionado com sucesso!' AS mensagem;
