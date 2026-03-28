const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { requireAuth } = require('./auth');

function parseAtivoParam(ativo) {
    if (ativo === undefined) return null;
    if (ativo === 'true' || ativo === '1' || ativo === 1 || ativo === true) return 1;
    if (ativo === 'false' || ativo === '0' || ativo === 0 || ativo === false) return 0;
    return null;
}

router.get('/', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const { busca, ativo } = req.query;

        let query = `
            SELECT
                id,
                nome,
                data_admissao,
                salario_base,
                observacoes,
                ativo,
                data_criacao,
                data_atualizacao
            FROM funcionarios
            WHERE 1=1
        `;
        const params = [];

        if (busca) {
            query += ' AND nome LIKE ?';
            params.push(`%${busca}%`);
        }

        const ativoValue = parseAtivoParam(ativo);
        if (ativoValue !== null) {
            query += ' AND ativo = ?';
            params.push(ativoValue);
        }

        query += ' ORDER BY nome ASC';

        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao listar funcionários:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar funcionários' });
    }
});

router.get('/:id', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT id, nome, data_admissao, salario_base, observacoes, ativo, data_criacao, data_atualizacao
             FROM funcionarios
             WHERE id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Erro ao buscar funcionário:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar funcionário' });
    }
});

router.post('/', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const { nome, data_admissao, salario_base, observacoes } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
        }

        if (!data_admissao) {
            return res.status(400).json({ success: false, message: 'Data de admissão é obrigatória' });
        }

        const salario = Number(salario_base);
        if (!Number.isFinite(salario) || salario <= 0) {
            return res.status(400).json({ success: false, message: 'Salário base deve ser maior que zero' });
        }

        const [result] = await pool.query(
            `INSERT INTO funcionarios (nome, data_admissao, salario_base, observacoes, ativo)
             VALUES (?, ?, ?, ?, TRUE)`,
            [nome.trim(), data_admissao, salario, observacoes || null]
        );

        res.json({
            success: true,
            message: 'Funcionário cadastrado com sucesso',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Erro ao cadastrar funcionário:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar funcionário' });
    }
});

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const { nome, data_admissao, salario_base, observacoes, ativo } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
        }

        if (!data_admissao) {
            return res.status(400).json({ success: false, message: 'Data de admissão é obrigatória' });
        }

        const salario = Number(salario_base);
        if (!Number.isFinite(salario) || salario <= 0) {
            return res.status(400).json({ success: false, message: 'Salário base deve ser maior que zero' });
        }

        const ativoBoolean = ativo === undefined ? true : Boolean(ativo);

        const [result] = await pool.query(
            `UPDATE funcionarios
             SET nome = ?, data_admissao = ?, salario_base = ?, observacoes = ?, ativo = ?
             WHERE id = ?`,
            [nome.trim(), data_admissao, salario, observacoes || null, ativoBoolean, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
        }

        res.json({ success: true, message: 'Funcionário atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar funcionário:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar funcionário' });
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const [result] = await pool.query('UPDATE funcionarios SET ativo = FALSE WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
        }

        res.json({ success: true, message: 'Funcionário desativado com sucesso' });
    } catch (error) {
        console.error('Erro ao desativar funcionário:', error);
        res.status(500).json({ success: false, message: 'Erro ao desativar funcionário' });
    }
});

module.exports = router;
