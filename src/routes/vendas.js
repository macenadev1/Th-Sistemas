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
        
        // Enviar cupom via Telegram (não bloqueia venda se falhar)
        if (global.telegramBot) {
            try {
                await global.telegramBot.enviarCupomVenda({
                    id: vendaId,
                    itens: itens.map(item => ({
                        nome: item.nome,
                        quantidade: item.quantidade,
                        preco: item.preco
                    })),
                    total: total,
                    formasPagamento: formas_pagamento.map(fp => ({
                        forma: fp.forma,
                        valor: fp.valor
                    })),
                    troco: troco
                });
            } catch (error) {
                console.error('❌ Erro ao enviar Telegram (venda concluída):', error.message);
            }
        }
        
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

// Listar vendas (apenas não canceladas por padrão)
// IMPORTANTE: Por padrão exclui vendas canceladas para garantir integridade dos relatórios
// Use ?incluir_canceladas=true para auditorias
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
        const incluirCanceladas = req.query.incluir_canceladas === 'true';
        
        const whereClause = incluirCanceladas ? '' : 'WHERE cancelado = FALSE';
        
        const [rows] = await pool.query(
            `SELECT * FROM vendas ${whereClause} ORDER BY data_venda DESC LIMIT 1000`
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar vendas:', error);
        res.status(500).json({ error: 'Erro ao listar vendas' });
    }
});

// Relatorio de vendas com itens/formas em lote
router.get('/relatorio', async (req, res) => {
    try {
        const pool = getPool();
        const { data_inicial, data_final, forma_pagamento } = req.query;

        if (!data_inicial || !data_final) {
            return res.status(400).json({
                success: false,
                message: 'Datas inicial e final sao obrigatorias'
            });
        }

        const forma = forma_pagamento || 'todos';
        const params = [data_inicial, data_final];
        let filtroForma = '';

        if (forma !== 'todos') {
            filtroForma = 'AND fp.forma_pagamento = ?';
            params.push(forma);
        }

        const [vendas] = await pool.query(
            `SELECT DISTINCT v.*
             FROM vendas v
             LEFT JOIN formas_pagamento_venda fp ON fp.venda_id = v.id
             WHERE v.cancelado = FALSE
               AND DATE(v.data_venda) BETWEEN ? AND ?
               ${filtroForma}
             ORDER BY v.data_venda DESC`,
            params
        );

        if (vendas.length === 0) {
            return res.json({ success: true, vendas: [], itens: [], formas_pagamento: [] });
        }

        const vendaIds = vendas.map(venda => venda.id);
        const placeholders = vendaIds.map(() => '?').join(',');

        const [itens] = await pool.query(
            `SELECT * FROM itens_venda WHERE venda_id IN (${placeholders})`,
            vendaIds
        );

        const [formasPagamento] = await pool.query(
            `SELECT * FROM formas_pagamento_venda WHERE venda_id IN (${placeholders})`,
            vendaIds
        );

        res.json({
            success: true,
            vendas,
            itens,
            formas_pagamento: formasPagamento
        });
    } catch (error) {
        console.error('Erro ao gerar relatorio de vendas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar relatorio de vendas'
        });
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
        
        // Avisar se a venda está cancelada
        if (venda[0].cancelado) {
            console.warn(`⚠️ Acesso a venda cancelada #${req.params.id}`);
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
            'SELECT COUNT(*) as total, SUM(total) as valor_total FROM vendas WHERE DATE(data_venda) = CURDATE() AND cancelado = FALSE'
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

// Estatísticas por forma de pagamento (apenas vendas não canceladas)
router.get('/stats/formas-pagamento', async (req, res) => {
    try {
        const pool = getPool();
        const periodo = String(req.query.periodo || 'mes').toLowerCase();

        let filtroData = "AND DATE(v.data_venda) BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND CURDATE()";

        if (periodo === 'hoje') {
            filtroData = 'AND DATE(v.data_venda) = CURDATE()';
        } else if (periodo === '7dias') {
            filtroData = 'AND DATE(v.data_venda) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()';
        }

        const [rows] = await pool.query(
            `SELECT
                agregado.forma_pagamento,
                SUM(agregado.valor_liquido) AS valor_total,
                COUNT(*) AS quantidade_vendas
             FROM (
                SELECT
                    fp.venda_id,
                    fp.forma_pagamento,
                    CASE
                        WHEN fp.forma_pagamento = 'dinheiro' THEN GREATEST(SUM(fp.valor) - COALESCE(MAX(v.troco), 0), 0)
                        ELSE SUM(fp.valor)
                    END AS valor_liquido
                FROM formas_pagamento_venda fp
                INNER JOIN vendas v ON v.id = fp.venda_id
                WHERE v.cancelado = FALSE
                ${filtroData}
                GROUP BY fp.venda_id, fp.forma_pagamento
             ) AS agregado
             GROUP BY agregado.forma_pagamento
             ORDER BY valor_total DESC`
        );

        res.json({ success: true, data: rows, periodo_aplicado: periodo });
    } catch (error) {
        console.error('Erro ao buscar estatísticas de formas de pagamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas de formas de pagamento' });
    }
});

// Cancelar/Excluir venda (marca como cancelada e reverte estoque)
router.delete('/:id', async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const vendaId = req.params.id;
        const { motivo } = req.body;
        
        // Buscar venda
        const [venda] = await connection.query(
            'SELECT * FROM vendas WHERE id = ? AND cancelado = FALSE',
            [vendaId]
        );
        
        if (venda.length === 0) {
            throw new Error('Venda não encontrada ou já cancelada');
        }
        
        const vendaData = venda[0];
        
        // Verificar se o caixa ainda está aberto
        const [caixaAberto] = await connection.query(
            'SELECT * FROM caixa_aberto LIMIT 1'
        );
        
        // Se caixa está aberto, verificar se a venda foi feita no caixa atual
        if (caixaAberto.length > 0) {
            const dataAberturaCaixa = new Date(caixaAberto[0].data_hora_abertura);
            const dataVenda = new Date(vendaData.data_venda);
            
            // Se a venda foi feita após a abertura do caixa atual, atualizar total_vendas
            if (dataVenda >= dataAberturaCaixa) {
                await connection.query(
                    'UPDATE caixa_aberto SET total_vendas = total_vendas - ? WHERE id = ?',
                    [vendaData.total, caixaAberto[0].id]
                );
                
                console.log(`✅ Total de vendas do caixa atualizado: -R$ ${vendaData.total}`);
            }
        }
        
        // Buscar itens da venda para reverter estoque
        const [itens] = await connection.query(
            'SELECT * FROM itens_venda WHERE venda_id = ?',
            [vendaId]
        );
        
        // Reverter estoque de cada produto
        for (const item of itens) {
            await connection.query(
                'UPDATE produtos SET estoque = estoque + ? WHERE id = ?',
                [item.quantidade, item.produto_id]
            );
            
            console.log(`✅ Estoque revertido: ${item.nome_produto} +${item.quantidade}`);
        }
        
        // Marcar venda como cancelada (não excluir para auditoria)
        await connection.query(
            `UPDATE vendas 
             SET cancelado = TRUE, 
                 data_cancelamento = NOW(), 
                 motivo_cancelamento = ?,
                 usuario_cancelamento_id = ?
             WHERE id = ?`,
            [motivo || 'Cancelamento via sistema', req.body.usuario_id || null, vendaId]
        );
        
        await connection.commit();
        
        console.log(`✅ Venda #${vendaId} cancelada com sucesso`);
        
        res.json({ 
            success: true, 
            message: 'Venda cancelada com sucesso',
            dados: {
                venda_id: vendaId,
                valor: vendaData.total,
                itens_revertidos: itens.length,
                caixa_atualizado: caixaAberto.length > 0
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Erro ao cancelar venda:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Erro ao cancelar venda' 
        });
    } finally {
        connection.release();
    }
});

// Editar venda (criar nova venda e cancelar a antiga)
router.put('/:id', async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const vendaId = req.params.id;
        const { itens, subtotal, desconto, total, valor_pago, troco, formas_pagamento, motivo_edicao } = req.body;
        
        // Buscar venda original
        const [vendaOriginal] = await connection.query(
            'SELECT * FROM vendas WHERE id = ? AND cancelado = FALSE',
            [vendaId]
        );
        
        if (vendaOriginal.length === 0) {
            throw new Error('Venda não encontrada ou já cancelada');
        }
        
        // Verificar se o caixa está aberto
        const [caixaAberto] = await connection.query('SELECT * FROM caixa_aberto LIMIT 1');
        
        if (caixaAberto.length === 0) {
            throw new Error('Caixa fechado! Não é possível editar vendas com o caixa fechado.');
        }
        
        const vendaOriginalData = vendaOriginal[0];
        
        // 1. CANCELAR VENDA ORIGINAL (reverter estoque)
        const [itensOriginais] = await connection.query(
            'SELECT * FROM itens_venda WHERE venda_id = ?',
            [vendaId]
        );
        
        for (const item of itensOriginais) {
            await connection.query(
                'UPDATE produtos SET estoque = estoque + ? WHERE id = ?',
                [item.quantidade, item.produto_id]
            );
        }
        
        // Atualizar caixa: remover venda original
        const dataAberturaCaixa = new Date(caixaAberto[0].data_hora_abertura);
        const dataVendaOriginal = new Date(vendaOriginalData.data_venda);
        
        if (dataVendaOriginal >= dataAberturaCaixa) {
            await connection.query(
                'UPDATE caixa_aberto SET total_vendas = total_vendas - ? WHERE id = ?',
                [vendaOriginalData.total, caixaAberto[0].id]
            );
        }
        
        // Marcar venda original como cancelada
        await connection.query(
            `UPDATE vendas 
             SET cancelado = TRUE, 
                 data_cancelamento = NOW(), 
                 motivo_cancelamento = ?
             WHERE id = ?`,
            [`Editada: ${motivo_edicao || 'Venda editada'}`, vendaId]
        );
        
        // 2. CRIAR NOVA VENDA
        const [novaVendaResult] = await connection.query(
            'INSERT INTO vendas (total, valor_pago, troco, quantidade_itens, desconto) VALUES (?, ?, ?, ?, ?)',
            [total, valor_pago, troco, itens.reduce((sum, item) => sum + item.quantidade, 0), desconto || 0]
        );
        
        const novaVendaId = novaVendaResult.insertId;
        
        // Inserir formas de pagamento
        for (const pagamento of formas_pagamento) {
            await connection.query(
                'INSERT INTO formas_pagamento_venda (venda_id, forma_pagamento, valor) VALUES (?, ?, ?)',
                [novaVendaId, pagamento.forma, pagamento.valor]
            );
        }
        
        // Inserir itens e atualizar estoque
        for (const item of itens) {
            const [produtoRows] = await connection.query(
                'SELECT id, preco_custo FROM produtos WHERE codigo_barras = ?',
                [item.codigo]
            );
            
            if (produtoRows.length === 0) {
                throw new Error(`Produto ${item.codigo} não encontrado`);
            }
            
            const produtoId = produtoRows[0].id;
            const precoCusto = produtoRows[0].preco_custo || 0;
            
            await connection.query(
                'INSERT INTO itens_venda (venda_id, produto_id, codigo_barras, nome_produto, quantidade, preco_unitario, preco_custo_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [novaVendaId, produtoId, item.codigo, item.nome, item.quantidade, item.preco, precoCusto, item.preco * item.quantidade]
            );
            
            // Atualizar estoque
            await connection.query(
                'UPDATE produtos SET estoque = estoque - ? WHERE id = ?',
                [item.quantidade, produtoId]
            );
        }
        
        // Atualizar caixa: adicionar nova venda
        await connection.query(
            'UPDATE caixa_aberto SET total_vendas = total_vendas + ? WHERE id = ?',
            [total, caixaAberto[0].id]
        );
        
        await connection.commit();
        
        console.log(`✅ Venda #${vendaId} editada com sucesso. Nova venda: #${novaVendaId}`);
        
        res.json({ 
            success: true, 
            message: 'Venda editada com sucesso!',
            dados: {
                venda_original_id: vendaId,
                nova_venda_id: novaVendaId
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Erro ao editar venda:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Erro ao editar venda' 
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
