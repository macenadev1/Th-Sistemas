const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { requireAuth } = require('./auth');

// Listar todos os clientes (com filtros opcionais)
router.get('/', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const { busca, ativo } = req.query;
        
        let query = 'SELECT * FROM clientes WHERE 1=1';
        const params = [];
        
        if (busca) {
            query += ' AND (nome LIKE ? OR cpf_cnpj LIKE ? OR telefone LIKE ?)';
            const buscaParam = `%${busca}%`;
            params.push(buscaParam, buscaParam, buscaParam);
        }
        
        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo === 'true' ? 1 : 0);
        }
        
        query += ' ORDER BY nome ASC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({ error: 'Erro ao listar clientes' });
    }
});

// Buscar cliente por ID
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
});

// Cadastrar novo cliente
router.post('/', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const {
            nome,
            cpf_cnpj,
            telefone,
            email,
            endereco,
            cep,
            cidade,
            estado,
            limite_credito,
            observacoes
        } = req.body;
        
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        // Verificar se CPF/CNPJ já existe
        if (cpf_cnpj) {
            const [existing] = await pool.query(
                'SELECT id FROM clientes WHERE cpf_cnpj = ? AND id != ?',
                [cpf_cnpj, 0]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({ error: 'CPF/CNPJ já cadastrado' });
            }
        }
        
        const [result] = await pool.query(
            `INSERT INTO clientes (nome, cpf_cnpj, telefone, email, endereco, cep, cidade, estado, limite_credito, observacoes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nome, cpf_cnpj || null, telefone || null, email || null, endereco || null, 
             cep || null, cidade || null, estado || null, limite_credito || 0, observacoes || null]
        );
        
        res.json({ 
            success: true, 
            id: result.insertId,
            message: 'Cliente cadastrado com sucesso!' 
        });
    } catch (error) {
        console.error('Erro ao cadastrar cliente:', error);
        res.status(500).json({ error: 'Erro ao cadastrar cliente' });
    }
});

// Atualizar cliente
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const {
            nome,
            cpf_cnpj,
            telefone,
            email,
            endereco,
            cep,
            cidade,
            estado,
            limite_credito,
            observacoes,
            ativo
        } = req.body;
        
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        // Verificar se CPF/CNPJ já existe em outro cliente
        if (cpf_cnpj) {
            const [existing] = await pool.query(
                'SELECT id FROM clientes WHERE cpf_cnpj = ? AND id != ?',
                [cpf_cnpj, req.params.id]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({ error: 'CPF/CNPJ já cadastrado para outro cliente' });
            }
        }
        
        const [result] = await pool.query(
            `UPDATE clientes 
             SET nome = ?, cpf_cnpj = ?, telefone = ?, email = ?, endereco = ?, 
                 cep = ?, cidade = ?, estado = ?, limite_credito = ?, observacoes = ?, ativo = ?
             WHERE id = ?`,
            [nome, cpf_cnpj || null, telefone || null, email || null, endereco || null,
             cep || null, cidade || null, estado || null, limite_credito || 0, 
             observacoes || null, ativo !== false ? 1 : 0, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        res.json({ 
            success: true, 
            message: 'Cliente atualizado com sucesso!' 
        });
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

// Deletar cliente (soft delete)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        
        const [result] = await pool.query(
            'UPDATE clientes SET ativo = FALSE WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        res.json({ 
            success: true, 
            message: 'Cliente desativado com sucesso!' 
        });
    } catch (error) {
        console.error('Erro ao desativar cliente:', error);
        res.status(500).json({ error: 'Erro ao desativar cliente' });
    }
});

// Buscar clientes para autocomplete/select
router.get('/buscar/autocomplete', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const { termo } = req.query;
        
        if (!termo || termo.length < 2) {
            return res.json([]);
        }
        
        const [rows] = await pool.query(
            `SELECT id, nome, cpf_cnpj, telefone, limite_credito 
             FROM clientes 
             WHERE ativo = TRUE AND (nome LIKE ? OR cpf_cnpj LIKE ?)
             ORDER BY nome ASC
             LIMIT 20`,
            [`%${termo}%`, `%${termo}%`]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
});

module.exports = router;
