const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

function escapeCsv(value) {
    if (value === null || value === undefined) return '""';
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
}

function buildFiltrosProdutosRelatorio(query) {
    const filtros = [];
    const params = [];

    if (query.busca) {
        filtros.push('(p.nome LIKE ? OR p.codigo_barras LIKE ?)');
        params.push(`%${query.busca}%`, `%${query.busca}%`);
    }

    if (query.status_ativo === 'ativos') {
        filtros.push('p.ativo = TRUE');
    } else if (query.status_ativo === 'inativos') {
        filtros.push('p.ativo = FALSE');
    }

    if (query.situacao_estoque === 'zerado') {
        filtros.push('COALESCE(p.estoque, 0) = 0');
    } else if (query.situacao_estoque === 'baixo') {
        filtros.push('COALESCE(p.estoque_minimo, 0) > 0 AND COALESCE(p.estoque, 0) <= COALESCE(p.estoque_minimo, 0)');
    } else if (query.situacao_estoque === 'positivo') {
        filtros.push('COALESCE(p.estoque, 0) > 0');
    }

    if (query.categoria_id) {
        filtros.push('p.categoria_id = ?');
        params.push(query.categoria_id);
    }

    if (query.fornecedor_id) {
        filtros.push('p.fornecedor_id = ?');
        params.push(query.fornecedor_id);
    }

    return {
        whereClause: filtros.length ? `WHERE ${filtros.join(' AND ')}` : '',
        params
    };
}

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

// Exportar relatório de produtos da base em CSV
router.get('/relatorio/exportar', async (req, res) => {
    try {
        const pool = getPool();
        const { whereClause, params } = buildFiltrosProdutosRelatorio(req.query);

        const [rows] = await pool.query(
            `SELECT
                p.id,
                p.codigo_barras,
                p.nome,
                p.preco,
                p.preco_custo,
                p.desconto_percentual,
                p.estoque,
                p.estoque_minimo,
                p.ativo,
                f.nome_fantasia AS fornecedor_nome,
                c.nome AS categoria_nome
             FROM produtos p
             LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
             LEFT JOIN categorias_produtos c ON p.categoria_id = c.id
             ${whereClause}
             ORDER BY p.nome`,
            params
        );

        const cabecalho = [
            'ID',
            'Codigo de Barras',
            'Produto',
            'Preco Venda',
            'Preco Custo',
            'Desconto (%)',
            'Estoque',
            'Estoque Minimo',
            'Status',
            'Fornecedor',
            'Categoria'
        ];

        const linhas = rows.map((produto) => [
            produto.id,
            produto.codigo_barras,
            produto.nome,
            Number(produto.preco || 0).toFixed(2),
            Number(produto.preco_custo || 0).toFixed(2),
            Number(produto.desconto_percentual || 0).toFixed(2),
            Number(produto.estoque || 0),
            Number(produto.estoque_minimo || 0),
            produto.ativo ? 'Ativo' : 'Inativo',
            produto.fornecedor_nome || '',
            produto.categoria_nome || ''
        ]);

        const csv = [cabecalho, ...linhas]
            .map(colunas => colunas.map(escapeCsv).join(','))
            .join('\n');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const nomeArquivo = `relatorio_produtos_base_${timestamp}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.send(`\uFEFF${csv}`);
    } catch (error) {
        console.error('Erro ao exportar relatório de produtos da base:', error);
        res.status(500).json({ success: false, message: 'Erro ao exportar relatório de produtos' });
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
        const { codigo_barras, nome, preco, preco_custo, desconto_percentual, estoque, estoque_minimo, fornecedor_id, categoria_id, quantidade_promocional, preco_promocional } = req.body;
        
        if (!codigo_barras || !nome || preco === undefined) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO produtos (codigo_barras, nome, preco, preco_custo, desconto_percentual, estoque, estoque_minimo, fornecedor_id, categoria_id, quantidade_promocional, preco_promocional) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [codigo_barras, nome, preco, preco_custo || 0, desconto_percentual || 0, estoque || 0, estoque_minimo || 0, fornecedor_id || null, categoria_id || null, quantidade_promocional || null, preco_promocional || null]
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
        const { nome, preco, preco_custo, desconto_percentual, estoque, estoque_minimo, ativo, fornecedor_id, categoria_id, quantidade_promocional, preco_promocional } = req.body;
        
        const ativoValue = ativo !== undefined ? (ativo ? 1 : 0) : 1;
        
        const [result] = await pool.query(
            'UPDATE produtos SET nome = ?, preco = ?, preco_custo = ?, desconto_percentual = ?, estoque = ?, estoque_minimo = ?, ativo = ?, fornecedor_id = ?, categoria_id = ?, quantidade_promocional = ?, preco_promocional = ? WHERE id = ?',
            [nome, preco, preco_custo || 0, desconto_percentual || 0, estoque, estoque_minimo || 0, ativoValue, fornecedor_id || null, categoria_id || null, quantidade_promocional || null, preco_promocional || null, req.params.id]
        );
        
        res.json({ success: true, message: 'Produto atualizado!' });
    } catch (error) {
        console.error('❌ Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

module.exports = router;
