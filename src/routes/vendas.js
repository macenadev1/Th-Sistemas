const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// Finalizar venda
router.post('/', async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { itens, subtotal, desconto, total, valor_pago, troco, formas_pagamento } = req.body;
        
        if (!itens || itens.length === 0) {
            throw new Error('Carrinho vazio');
        }

        if (!formas_pagamento || formas_pagamento.length === 0) {
            throw new Error('Nenhuma forma de pagamento informada');
        }
        
        // Inserir venda
        const [vendaResult] = await connection.query(
            'INSERT INTO vendas (total, valor_pago, troco, quantidade_itens, desconto) VALUES (?, ?, ?, ?, ?)',
            [total, valor_pago, troco, itens.reduce((sum, item) => sum + item.quantidade, 0), desconto || 0]
        );
        
        const vendaId = vendaResult.insertId;

        // Inserir formas de pagamento
        for (const pagamento of formas_pagamento) {
            await connection.query(
                'INSERT INTO formas_pagamento_venda (venda_id, forma_pagamento, valor) VALUES (?, ?, ?)',
                [vendaId, pagamento.forma, pagamento.valor]
            );
        }
        
        // Inserir itens e atualizar estoque
        for (const item of itens) {
            // Buscar ID e CUSTO do produto (para análise de lucratividade)
            const [produtoRows] = await connection.query(
                'SELECT id, preco_custo FROM produtos WHERE codigo_barras = ?',
                [item.codigo]
            );
            
            if (produtoRows.length === 0) {
                throw new Error(`Produto ${item.codigo} não encontrado`);
            }
            
            const produtoId = produtoRows[0].id;
            const precoCusto = produtoRows[0].preco_custo || 0;
            
            // Inserir item da venda (COM CUSTO para análise histórica)
            await connection.query(
                'INSERT INTO itens_venda (venda_id, produto_id, codigo_barras, nome_produto, quantidade, preco_unitario, preco_custo_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [vendaId, produtoId, item.codigo, item.nome, item.quantidade, item.preco, precoCusto, item.preco * item.quantidade]
            );
            
            // Atualizar estoque
            await connection.query(
                'UPDATE produtos SET estoque = estoque - ? WHERE id = ?',
                [item.quantidade, produtoId]
            );
        }
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            vendaId: vendaId,
            message: 'Venda finalizada com sucesso!' 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao finalizar venda:', error);
        res.status(500).json({ error: error.message || 'Erro ao finalizar venda' });
    } finally {
        connection.release();
    }
});

// Listar vendas
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query(
            'SELECT * FROM vendas ORDER BY data_venda DESC LIMIT 100'
        );
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar vendas:', error);
        res.status(500).json({ error: 'Erro ao listar vendas' });
    }
});

// Detalhes de uma venda
router.get('/:id', async (req, res) => {
    try {
        const pool = getPool();
        
        const [venda] = await pool.query(
            'SELECT * FROM vendas WHERE id = ?',
            [req.params.id]
        );
        
        if (venda.length === 0) {
            return res.status(404).json({ error: 'Venda não encontrada' });
        }
        
        const [itens] = await pool.query(
            'SELECT * FROM itens_venda WHERE venda_id = ?',
            [req.params.id]
        );

        const [formasPagamento] = await pool.query(
            'SELECT * FROM formas_pagamento_venda WHERE venda_id = ?',
            [req.params.id]
        );
        
        res.json({
            venda: venda[0],
            itens: itens,
            formas_pagamento: formasPagamento
        });
    } catch (error) {
        console.error('Erro ao buscar venda:', error);
        res.status(500).json({ error: 'Erro ao buscar venda' });
    }
});

// Estatísticas
router.get('/stats/resumo', async (req, res) => {
    try {
        const pool = getPool();
        
        const [totalVendas] = await pool.query(
            'SELECT COUNT(*) as total, SUM(total) as valor_total FROM vendas WHERE DATE(data_venda) = CURDATE()'
        );
        
        const [totalProdutos] = await pool.query(
            'SELECT COUNT(*) as total FROM produtos WHERE ativo = TRUE'
        );
        
        const [produtosBaixoEstoque] = await pool.query(
            'SELECT COUNT(*) as total FROM produtos WHERE estoque < 10 AND ativo = TRUE'
        );
        
        res.json({
            vendas_hoje: totalVendas[0].total || 0,
            valor_vendas_hoje: totalVendas[0].valor_total || 0,
            total_produtos: totalProdutos[0].total || 0,
            produtos_baixo_estoque: produtosBaixoEstoque[0].total || 0
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

module.exports = router;
