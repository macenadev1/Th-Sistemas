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
            'SELECT * FROM produtos WHERE ativo = TRUE AND (nome LIKE ? OR codigo_barras LIKE ?) ORDER BY nome LIMIT 50',
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
            'SELECT * FROM produtos ORDER BY nome'
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
            'SELECT * FROM produtos WHERE codigo_barras = ? AND ativo = TRUE',
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
        const { codigo_barras, nome, preco, estoque } = req.body;
        
        if (!codigo_barras || !nome || preco === undefined) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO produtos (codigo_barras, nome, preco, estoque) VALUES (?, ?, ?, ?)',
            [codigo_barras, nome, preco, estoque || 0]
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
        const { nome, preco, estoque, ativo } = req.body;
        
        console.log('📝 Recebendo atualização de produto:', { id: req.params.id, nome, preco, estoque, ativo });
        
        const ativoValue = ativo !== undefined ? (ativo ? 1 : 0) : 1;
        
        console.log('🔄 Valor convertido de ativo:', ativoValue);
        
        const [result] = await pool.query(
            'UPDATE produtos SET nome = ?, preco = ?, estoque = ?, ativo = ? WHERE id = ?',
            [nome, preco, estoque, ativoValue, req.params.id]
        );
        
        console.log('✅ Query executada! Linhas afetadas:', result.affectedRows);
        console.log('📊 Resultado completo:', result);
        
        res.json({ success: true, message: 'Produto atualizado!' });
    } catch (error) {
        console.error('❌ Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

module.exports = router;
