const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// Buscar produtos (por nome ou código)
router.get('/buscar', async (req, res) => {
    try {
        const pool = getPool();
        const { termo } = req.query;
        
        if (!termo) {
            return res.json([]);
        }
        
        const [rows] = await pool.query(
            `SELECT p.*, f.nome_fantasia as fornecedor_nome, c.nome as categoria_nome 
             FROM produtos p 
             LEFT JOIN fornecedores f ON p.fornecedor_id = f.id 
             LEFT JOIN categorias_produtos c ON p.categoria_id = c.id 
             WHERE p.ativo = TRUE AND (p.nome LIKE ? OR p.codigo_barras LIKE ?) 
             ORDER BY p.nome LIMIT 50`,
            [`%${termo}%`, `%${termo}%`]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// Listar todos os produtos
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT p.*, f.nome_fantasia as fornecedor_nome, c.nome as categoria_nome 
             FROM produtos p 
             LEFT JOIN fornecedores f ON p.fornecedor_id = f.id 
             LEFT JOIN categorias_produtos c ON p.categoria_id = c.id 
             ORDER BY p.nome`
        );
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ error: 'Erro ao listar produtos' });
    }
});

// Buscar produto por código de barras
router.get('/:codigo', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT p.*, f.nome_fantasia as fornecedor_nome, c.nome as categoria_nome 
             FROM produtos p 
             LEFT JOIN fornecedores f ON p.fornecedor_id = f.id 
             LEFT JOIN categorias_produtos c ON p.categoria_id = c.id 
             WHERE p.codigo_barras = ? AND p.ativo = TRUE`,
            [req.params.codigo]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
});

// Cadastrar novo produto
router.post('/', async (req, res) => {
    try {
        const pool = getPool();
        const { codigo_barras, nome, preco, desconto_percentual, estoque, fornecedor_id, categoria_id } = req.body;
        
        if (!codigo_barras || !nome || preco === undefined) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO produtos (codigo_barras, nome, preco, desconto_percentual, estoque, fornecedor_id, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [codigo_barras, nome, preco, desconto_percentual || 0, estoque || 0, fornecedor_id || null, categoria_id || null]
        );
        
        res.json({ 
            success: true, 
            id: result.insertId,
            message: 'Produto cadastrado com sucesso!' 
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Código de barras já cadastrado' });
        }
        console.error('Erro ao cadastrar produto:', error);
        res.status(500).json({ error: 'Erro ao cadastrar produto' });
    }
});

// Atualizar produto
router.put('/:id', async (req, res) => {
    try {
        const pool = getPool();
        const { nome, preco, desconto_percentual, estoque, ativo, fornecedor_id, categoria_id } = req.body;
        
        const ativoValue = ativo !== undefined ? (ativo ? 1 : 0) : 1;
        
        const [result] = await pool.query(
            'UPDATE produtos SET nome = ?, preco = ?, desconto_percentual = ?, estoque = ?, ativo = ?, fornecedor_id = ?, categoria_id = ? WHERE id = ?',
            [nome, preco, desconto_percentual || 0, estoque, ativoValue, fornecedor_id || null, categoria_id || null, req.params.id]
        );
        
        res.json({ success: true, message: 'Produto atualizado!' });
    } catch (error) {
        console.error('❌ Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

module.exports = router;
