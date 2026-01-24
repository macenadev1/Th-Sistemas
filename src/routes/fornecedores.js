const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { requireAuth } = require('./auth');

// Listar todos os fornecedores (com filtros opcionais)
router.get('/', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const { busca, ativo } = req.query;
        
        let query = 'SELECT * FROM fornecedores WHERE 1=1';
        const params = [];
        
        if (busca) {
            query += ' AND (nome_fantasia LIKE ? OR razao_social LIKE ? OR cnpj LIKE ?)';
            const buscaParam = `%${busca}%`;
            params.push(buscaParam, buscaParam, buscaParam);
        }
        
        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo === 'true' ? 1 : 0);
        }
        
        query += ' ORDER BY nome_fantasia ASC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar fornecedores:', error);
        res.status(500).json({ error: 'Erro ao listar fornecedores' });
    }
});

// Buscar fornecedor por ID
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM fornecedores WHERE id = ?', [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Fornecedor não encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao buscar fornecedor' });
    }
});

// Cadastrar novo fornecedor
router.post('/', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const {
            nome_fantasia,
            razao_social,
            cnpj,
            telefone,
            email,
            endereco,
            cep,
            cidade,
            estado,
            contato_principal,
            observacoes
        } = req.body;
        
        if (!nome_fantasia || nome_fantasia.trim() === '') {
            return res.status(400).json({ error: 'Nome fantasia é obrigatório' });
        }
        
        // Verificar se CNPJ já existe
        if (cnpj) {
            const [existing] = await pool.query(
                'SELECT id FROM fornecedores WHERE cnpj = ? AND id != ?',
                [cnpj, 0]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({ error: 'CNPJ já cadastrado' });
            }
        }
        
        const [result] = await pool.query(
            `INSERT INTO fornecedores (nome_fantasia, razao_social, cnpj, telefone, email, endereco, 
                                       cep, cidade, estado, contato_principal, observacoes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nome_fantasia, razao_social || null, cnpj || null, telefone || null, email || null, 
             endereco || null, cep || null, cidade || null, estado || null, 
             contato_principal || null, observacoes || null]
        );
        
        res.json({ 
            success: true, 
            id: result.insertId,
            message: 'Fornecedor cadastrado com sucesso!' 
        });
    } catch (error) {
        console.error('Erro ao cadastrar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao cadastrar fornecedor' });
    }
});

// Atualizar fornecedor
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const {
            nome_fantasia,
            razao_social,
            cnpj,
            telefone,
            email,
            endereco,
            cep,
            cidade,
            estado,
            contato_principal,
            observacoes,
            ativo
        } = req.body;
        
        if (!nome_fantasia || nome_fantasia.trim() === '') {
            return res.status(400).json({ error: 'Nome fantasia é obrigatório' });
        }
        
        // Verificar se CNPJ já existe em outro fornecedor
        if (cnpj) {
            const [existing] = await pool.query(
                'SELECT id FROM fornecedores WHERE cnpj = ? AND id != ?',
                [cnpj, req.params.id]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({ error: 'CNPJ já cadastrado para outro fornecedor' });
            }
        }
        
        const [result] = await pool.query(
            `UPDATE fornecedores 
             SET nome_fantasia = ?, razao_social = ?, cnpj = ?, telefone = ?, email = ?, 
                 endereco = ?, cep = ?, cidade = ?, estado = ?, contato_principal = ?, 
                 observacoes = ?, ativo = ?
             WHERE id = ?`,
            [nome_fantasia, razao_social || null, cnpj || null, telefone || null, email || null,
             endereco || null, cep || null, cidade || null, estado || null, 
             contato_principal || null, observacoes || null, ativo !== false ? 1 : 0, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Fornecedor não encontrado' });
        }
        
        res.json({ 
            success: true, 
            message: 'Fornecedor atualizado com sucesso!' 
        });
    } catch (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
    }
});

// Deletar fornecedor (soft delete)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        
        // Verificar se há produtos vinculados
        const [produtos] = await pool.query(
            'SELECT COUNT(*) as total FROM produtos WHERE fornecedor_id = ?',
            [req.params.id]
        );
        
        if (produtos[0].total > 0) {
            return res.status(400).json({ 
                error: `Não é possível desativar. Existem ${produtos[0].total} produto(s) vinculado(s) a este fornecedor.` 
            });
        }
        
        const [result] = await pool.query(
            'UPDATE fornecedores SET ativo = FALSE WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Fornecedor não encontrado' });
        }
        
        res.json({ 
            success: true, 
            message: 'Fornecedor desativado com sucesso!' 
        });
    } catch (error) {
        console.error('Erro ao desativar fornecedor:', error);
        res.status(500).json({ error: 'Erro ao desativar fornecedor' });
    }
});

// Buscar fornecedores para autocomplete/select
router.get('/buscar/autocomplete', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const { termo } = req.query;
        
        if (!termo || termo.length < 2) {
            return res.json([]);
        }
        
        const [rows] = await pool.query(
            `SELECT id, nome_fantasia, razao_social, cnpj, telefone 
             FROM fornecedores 
             WHERE ativo = TRUE AND (nome_fantasia LIKE ? OR razao_social LIKE ? OR cnpj LIKE ?)
             ORDER BY nome_fantasia ASC
             LIMIT 20`,
            [`%${termo}%`, `%${termo}%`, `%${termo}%`]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar fornecedores:', error);
        res.status(500).json({ error: 'Erro ao buscar fornecedores' });
    }
});

module.exports = router;
