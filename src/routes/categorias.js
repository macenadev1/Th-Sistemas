const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { requireAuth, requireAdmin } = require('./auth');

// ==========================================
// CATEGORIAS DE PRODUTOS
// ==========================================

// Listar categorias de produtos
router.get('/produtos', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const { ativo } = req.query;
        
        let query = 'SELECT * FROM categorias_produtos WHERE 1=1';
        const params = [];
        
        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo === 'true' ? 1 : 0);
        }
        
        query += ' ORDER BY nome ASC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar categorias de produtos:', error);
        res.status(500).json({ error: 'Erro ao listar categorias' });
    }
});

// Criar categoria de produto
router.post('/produtos', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const { nome, descricao } = req.body;
        
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO categorias_produtos (nome, descricao) VALUES (?, ?)',
            [nome, descricao || null]
        );
        
        res.json({ 
            success: true, 
            id: result.insertId,
            message: 'Categoria criada com sucesso!' 
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Já existe uma categoria com este nome' });
        }
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({ error: 'Erro ao criar categoria' });
    }
});

// Atualizar categoria de produto
router.put('/produtos/:id', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const { nome, descricao, ativo } = req.body;
        
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        const [result] = await pool.query(
            'UPDATE categorias_produtos SET nome = ?, descricao = ?, ativo = ? WHERE id = ?',
            [nome, descricao || null, ativo !== false ? 1 : 0, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        res.json({ 
            success: true, 
            message: 'Categoria atualizada com sucesso!' 
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Já existe uma categoria com este nome' });
        }
        console.error('Erro ao atualizar categoria:', error);
        res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
});

// Deletar categoria de produto
router.delete('/produtos/:id', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        
        // Verificar se há produtos usando esta categoria
        const [produtos] = await pool.query(
            'SELECT COUNT(*) as total FROM produtos WHERE categoria_id = ?',
            [req.params.id]
        );
        
        if (produtos[0].total > 0) {
            return res.status(400).json({ 
                error: `Não é possível excluir. Existem ${produtos[0].total} produto(s) nesta categoria.` 
            });
        }
        
        const [result] = await pool.query(
            'DELETE FROM categorias_produtos WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        res.json({ 
            success: true, 
            message: 'Categoria excluída com sucesso!' 
        });
    } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        res.status(500).json({ error: 'Erro ao excluir categoria' });
    }
});

// ==========================================
// CATEGORIAS FINANCEIRAS
// ==========================================

// Listar categorias financeiras
router.get('/financeiras', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const { tipo, ativo } = req.query;
        
        let query = 'SELECT * FROM categorias_financeiras WHERE 1=1';
        const params = [];
        
        if (tipo) {
            query += ' AND tipo = ?';
            params.push(tipo);
        }
        
        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo === 'true' ? 1 : 0);
        }
        
        query += ' ORDER BY nome ASC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar categorias financeiras:', error);
        res.status(500).json({ error: 'Erro ao listar categorias' });
    }
});

// Criar categoria financeira
router.post('/financeiras', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const { nome, tipo, descricao } = req.body;
        
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        if (!tipo || !['receita', 'despesa'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo deve ser "receita" ou "despesa"' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO categorias_financeiras (nome, tipo, descricao) VALUES (?, ?, ?)',
            [nome, tipo, descricao || null]
        );
        
        res.json({ 
            success: true, 
            id: result.insertId,
            message: 'Categoria criada com sucesso!' 
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Já existe uma categoria com este nome' });
        }
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({ error: 'Erro ao criar categoria' });
    }
});

// Atualizar categoria financeira
router.put('/financeiras/:id', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const { nome, tipo, descricao, ativo } = req.body;
        
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        if (!tipo || !['receita', 'despesa'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo deve ser "receita" ou "despesa"' });
        }
        
        const [result] = await pool.query(
            'UPDATE categorias_financeiras SET nome = ?, tipo = ?, descricao = ?, ativo = ? WHERE id = ?',
            [nome, tipo, descricao || null, ativo !== false ? 1 : 0, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        res.json({ 
            success: true, 
            message: 'Categoria atualizada com sucesso!' 
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Já existe uma categoria com este nome' });
        }
        console.error('Erro ao atualizar categoria:', error);
        res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
});

// Deletar categoria financeira
router.delete('/financeiras/:id', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        
        const [result] = await pool.query(
            'DELETE FROM categorias_financeiras WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        res.json({ 
            success: true, 
            message: 'Categoria excluída com sucesso!' 
        });
    } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        res.status(500).json({ error: 'Erro ao excluir categoria' });
    }
});

module.exports = router;
