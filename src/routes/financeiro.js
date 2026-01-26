const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// ==================== CONTAS A PAGAR ====================

// Listar todas as contas a pagar com filtros
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
        const { status, data_inicio, data_fim, fornecedor_id, categoria_id } = req.query;
        
        let query = `
            SELECT 
                cp.*,
                cf.nome as categoria_nome,
                cf.tipo as categoria_tipo,
                f.nome_fantasia as fornecedor_nome
            FROM contas_pagar cp
            LEFT JOIN categorias_financeiras cf ON cp.categoria_financeira_id = cf.id
            LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ' AND cp.status = ?';
            params.push(status);
        }
        
        if (data_inicio) {
            query += ' AND cp.data_vencimento >= ?';
            params.push(data_inicio);
        }
        
        if (data_fim) {
            query += ' AND cp.data_vencimento <= ?';
            params.push(data_fim);
        }
        
        if (fornecedor_id) {
            query += ' AND cp.fornecedor_id = ?';
            params.push(fornecedor_id);
        }
        
        if (categoria_id) {
            query += ' AND cp.categoria_financeira_id = ?';
            params.push(categoria_id);
        }
        
        query += ' ORDER BY cp.data_vencimento ASC, cp.id DESC';
        
        const [rows] = await pool.query(query, params);
        
        // Atualizar status de contas vencidas
        await pool.query(`
            UPDATE contas_pagar 
            SET status = 'vencido' 
            WHERE status = 'pendente' 
            AND data_vencimento < CURDATE()
        `);
        
        res.json({ success: true, contas: rows });
    } catch (error) {
        console.error('Erro ao listar contas a pagar:', error);
        res.status(500).json({ success: false, error: 'Erro ao listar contas' });
    }
});

// Buscar conta específica
router.get('/:id', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT 
                cp.*,
                cf.nome as categoria_nome,
                f.nome_fantasia as fornecedor_nome
            FROM contas_pagar cp
            LEFT JOIN categorias_financeiras cf ON cp.categoria_financeira_id = cf.id
            LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
            WHERE cp.id = ?
        `, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Conta não encontrada' });
        }
        
        res.json({ success: true, conta: rows[0] });
    } catch (error) {
        console.error('Erro ao buscar conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar conta' });
    }
});

// Cadastrar nova conta a pagar
router.post('/', async (req, res) => {
    try {
        const pool = getPool();
        const {
            descricao,
            categoria_financeira_id,
            fornecedor_id,
            valor,
            data_vencimento,
            observacoes
        } = req.body;
        
        if (!descricao || !valor || !data_vencimento) {
            return res.status(400).json({ 
                success: false, 
                error: 'Descrição, valor e data de vencimento são obrigatórios' 
            });
        }
        
        // Determinar status baseado na data de vencimento
        const hoje = new Date();
        const vencimento = new Date(data_vencimento);
        let status = 'pendente';
        
        if (vencimento < hoje) {
            status = 'vencido';
        }
        
        const [result] = await pool.query(`
            INSERT INTO contas_pagar (
                descricao, 
                categoria_financeira_id, 
                fornecedor_id, 
                valor, 
                data_vencimento,
                status,
                observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            descricao,
            categoria_financeira_id || null,
            fornecedor_id || null,
            valor,
            data_vencimento,
            status,
            observacoes || null
        ]);
        
        res.json({ 
            success: true, 
            message: 'Conta cadastrada com sucesso',
            id: result.insertId 
        });
    } catch (error) {
        console.error('Erro ao cadastrar conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao cadastrar conta' });
    }
});

// Atualizar conta a pagar
router.put('/:id', async (req, res) => {
    try {
        const pool = getPool();
        const {
            descricao,
            categoria_financeira_id,
            fornecedor_id,
            valor,
            data_vencimento,
            observacoes
        } = req.body;
        
        // Verificar se conta existe
        const [exists] = await pool.query('SELECT id, status FROM contas_pagar WHERE id = ?', [req.params.id]);
        if (exists.length === 0) {
            return res.status(404).json({ success: false, error: 'Conta não encontrada' });
        }
        
        // Não permitir editar contas já pagas
        if (exists[0].status === 'pago') {
            return res.status(400).json({ 
                success: false, 
                error: 'Não é possível editar uma conta já paga' 
            });
        }
        
        // Determinar status baseado na data de vencimento
        const hoje = new Date();
        const vencimento = new Date(data_vencimento);
        let status = 'pendente';
        
        if (vencimento < hoje) {
            status = 'vencido';
        }
        
        await pool.query(`
            UPDATE contas_pagar SET
                descricao = ?,
                categoria_financeira_id = ?,
                fornecedor_id = ?,
                valor = ?,
                data_vencimento = ?,
                status = ?,
                observacoes = ?
            WHERE id = ?
        `, [
            descricao,
            categoria_financeira_id || null,
            fornecedor_id || null,
            valor,
            data_vencimento,
            status,
            observacoes || null,
            req.params.id
        ]);
        
        res.json({ success: true, message: 'Conta atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao atualizar conta' });
    }
});

// Pagar conta
router.put('/:id/pagar', async (req, res) => {
    try {
        const pool = getPool();
        const { data_pagamento, forma_pagamento, observacoes } = req.body;
        
        // Verificar se conta existe
        const [exists] = await pool.query('SELECT id, status FROM contas_pagar WHERE id = ?', [req.params.id]);
        if (exists.length === 0) {
            return res.status(404).json({ success: false, error: 'Conta não encontrada' });
        }
        
        if (exists[0].status === 'pago') {
            return res.status(400).json({ 
                success: false, 
                error: 'Esta conta já foi paga' 
            });
        }
        
        const dataPagamentoFinal = data_pagamento || new Date().toISOString().split('T')[0];
        
        await pool.query(`
            UPDATE contas_pagar SET
                status = 'pago',
                data_pagamento = ?,
                forma_pagamento = ?,
                observacoes = CONCAT(COALESCE(observacoes, ''), '\n', COALESCE(?, ''))
            WHERE id = ?
        `, [
            dataPagamentoFinal,
            forma_pagamento || null,
            observacoes || '',
            req.params.id
        ]);
        
        res.json({ success: true, message: 'Conta paga com sucesso' });
    } catch (error) {
        console.error('Erro ao pagar conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao pagar conta' });
    }
});

// Cancelar conta
router.put('/:id/cancelar', async (req, res) => {
    try {
        const pool = getPool();
        const { observacoes } = req.body;
        
        await pool.query(`
            UPDATE contas_pagar SET
                status = 'cancelado',
                observacoes = CONCAT(COALESCE(observacoes, ''), '\n', 'CANCELADO: ', COALESCE(?, ''))
            WHERE id = ?
        `, [observacoes || '', req.params.id]);
        
        res.json({ success: true, message: 'Conta cancelada com sucesso' });
    } catch (error) {
        console.error('Erro ao cancelar conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao cancelar conta' });
    }
});

// Deletar conta
router.delete('/:id', async (req, res) => {
    try {
        const pool = getPool();
        
        // Verificar se conta existe e não está paga
        const [exists] = await pool.query('SELECT id, status FROM contas_pagar WHERE id = ?', [req.params.id]);
        if (exists.length === 0) {
            return res.status(404).json({ success: false, error: 'Conta não encontrada' });
        }
        
        if (exists[0].status === 'pago') {
            return res.status(400).json({ 
                success: false, 
                error: 'Não é possível excluir uma conta já paga' 
            });
        }
        
        await pool.query('DELETE FROM contas_pagar WHERE id = ?', [req.params.id]);
        
        res.json({ success: true, message: 'Conta excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao excluir conta' });
    }
});

// Estatísticas
router.get('/stats/resumo', async (req, res) => {
    try {
        const pool = getPool();
        
        const [stats] = await pool.query(`
            SELECT 
                SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as total_pendente,
                SUM(CASE WHEN status = 'vencido' THEN valor ELSE 0 END) as total_vencido,
                SUM(CASE WHEN status = 'pago' AND MONTH(data_pagamento) = MONTH(CURDATE()) THEN valor ELSE 0 END) as total_pago_mes,
                COUNT(CASE WHEN status = 'pendente' THEN 1 END) as qtd_pendente,
                COUNT(CASE WHEN status = 'vencido' THEN 1 END) as qtd_vencido,
                COUNT(CASE WHEN status = 'pago' AND MONTH(data_pagamento) = MONTH(CURDATE()) THEN 1 END) as qtd_pago_mes
            FROM contas_pagar
        `);
        
        res.json({ success: true, stats: stats[0] });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas' });
    }
});

module.exports = router;
