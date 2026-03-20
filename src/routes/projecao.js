const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

/**
 * GET /api/projecao/historico?dias_referencia=30
 * Retorna dados históricos diários de vendas para cálculo de projeção financeira.
 * Usado pelo módulo de Projeção de Receitas do ERP.
 */
router.get('/historico', async (req, res) => {
    try {
        const pool = getPool();
        const diasReferencia = Math.min(
            Math.max(parseInt(req.query.dias_referencia) || 30, 1),
            365
        );

        const [rows] = await pool.query(`
            SELECT
                dia.data,
                dia.num_vendas,
                dia.receita_bruta,
                COALESCE(custos.custo_total, 0) AS custo_total
            FROM (
                SELECT
                    DATE(data_venda) AS data,
                    COUNT(id)        AS num_vendas,
                    SUM(total)       AS receita_bruta
                FROM vendas
                WHERE cancelado = FALSE
                  AND data_venda >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                  AND data_venda <  DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                GROUP BY DATE(data_venda)
            ) dia
            LEFT JOIN (
                SELECT
                    DATE(v.data_venda)                             AS data,
                    SUM(iv.preco_custo_unitario * iv.quantidade)   AS custo_total
                FROM itens_venda iv
                JOIN vendas v ON v.id = iv.venda_id
                WHERE v.cancelado = FALSE
                  AND v.data_venda >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                  AND v.data_venda <  DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                GROUP BY DATE(v.data_venda)
            ) custos ON custos.data = dia.data
            ORDER BY dia.data ASC
        `, [diasReferencia, diasReferencia]);

        const receitaTotal = rows.reduce((sum, d) => sum + parseFloat(d.receita_bruta || 0), 0);
        const custoTotal   = rows.reduce((sum, d) => sum + parseFloat(d.custo_total   || 0), 0);

        res.json({
            success: true,
            dias: rows,
            resumo: {
                total_dias_referencia: diasReferencia,
                dias_com_vendas: rows.length,
                receita_total: receitaTotal.toFixed(2),
                custo_total:   custoTotal.toFixed(2),
                lucro_total:   (receitaTotal - custoTotal).toFixed(2)
            }
        });

    } catch (error) {
        console.error('Erro ao gerar projeção:', error);
        res.status(500).json({ success: false, message: 'Erro ao calcular projeção financeira' });
    }
});

module.exports = router;
