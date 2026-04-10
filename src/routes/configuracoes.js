const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// GET - Listar taxas de maquininha
router.get('/taxas-maquininha', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT id, forma_pagamento, bandeira, parcelas, taxa_percentual, ativo
             FROM taxas_maquininha
             ORDER BY forma_pagamento, bandeira, parcelas`
        );

        res.json({
            success: true,
            taxas: rows
        });
    } catch (error) {
        console.error('Erro ao listar taxas da maquininha:', error);
        res.status(500).json({ success: false, error: 'Erro ao listar taxas da maquininha' });
    }
});

// POST - Cadastrar ou atualizar taxa de maquininha
router.post('/taxas-maquininha', async (req, res) => {
    try {
        const pool = getPool();
        const { forma_pagamento, bandeira, parcelas, taxa_percentual, ativo } = req.body;

        const forma = String(forma_pagamento || '').trim().toLowerCase();
        let bandeiraNormalizada = bandeira ? String(bandeira).trim().toLowerCase() : null;
        const parcelasNormalizadas = Number.parseInt(parcelas, 10) > 0 ? Number.parseInt(parcelas, 10) : 1;
        const taxa = Number.parseFloat(taxa_percentual);

        if (forma === 'pix' && !bandeiraNormalizada) {
            bandeiraNormalizada = 'pix';
        }

        if (!['debito', 'credito', 'pix'].includes(forma)) {
            return res.status(400).json({ success: false, error: 'Forma de pagamento invalida' });
        }

        if (forma === 'credito' && parcelasNormalizadas < 1) {
            return res.status(400).json({ success: false, error: 'Parcelas invalidas para credito' });
        }

        if (!Number.isFinite(taxa) || taxa < 0 || taxa > 100) {
            return res.status(400).json({ success: false, error: 'Taxa percentual invalida' });
        }

        await pool.query(
            `INSERT INTO taxas_maquininha (forma_pagamento, bandeira, parcelas, taxa_percentual, ativo)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                taxa_percentual = VALUES(taxa_percentual),
                ativo = VALUES(ativo),
                data_atualizacao = NOW()`,
            [forma, bandeiraNormalizada, parcelasNormalizadas, taxa, ativo !== false]
        );

        res.json({ success: true, message: 'Taxa salva com sucesso' });
    } catch (error) {
        console.error('Erro ao salvar taxa da maquininha:', error);
        res.status(500).json({ success: false, error: 'Erro ao salvar taxa da maquininha' });
    }
});

// DELETE - Desativar taxa de maquininha
router.delete('/taxas-maquininha/:id', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('UPDATE taxas_maquininha SET ativo = FALSE WHERE id = ?', [req.params.id]);

        res.json({ success: true, message: 'Taxa desativada com sucesso' });
    } catch (error) {
        console.error('Erro ao desativar taxa da maquininha:', error);
        res.status(500).json({ success: false, error: 'Erro ao desativar taxa da maquininha' });
    }
});

// GET - Obter configurações
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query(
            'SELECT * FROM configuracoes WHERE id = 1'
        );
        
        if (rows.length > 0) {
            const config = rows[0];
            res.json({
                configuracoes: {
                    tipoAlerta: config.tipo_alerta,
                    horasAlerta: config.horas_alerta,
                    imprimirCupom: config.imprimir_cupom !== 0,
                    tempoRenderizacaoCupom: config.tempo_renderizacao_cupom || 500,
                    tempoFechamentoCupom: config.tempo_fechamento_cupom || 500,
                    timeoutFallbackCupom: config.timeout_fallback_cupom || 3000,
                    permiteVendaEstoqueZero: config.permite_venda_estoque_zero !== 0
                }
            });
        } else {
            // Configurações padrão se não existir
            res.json({
                configuracoes: {
                    tipoAlerta: 'dia_diferente',
                    horasAlerta: 24,
                    imprimirCupom: true,
                    tempoRenderizacaoCupom: 500,
                    tempoFechamentoCupom: 500,
                    timeoutFallbackCupom: 3000,
                    permiteVendaEstoqueZero: false
                }
            });
        }
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ erro: 'Erro ao buscar configurações' });
    }
});

// POST - Salvar configurações
router.post('/', async (req, res) => {
    try {
        const pool = getPool();
        const { tipoAlerta, horasAlerta, imprimirCupom, tempoRenderizacaoCupom, tempoFechamentoCupom, timeoutFallbackCupom, permiteVendaEstoqueZero } = req.body;
        
        // Validação
        if (!tipoAlerta || !['dia_diferente', 'horas', 'desabilitado'].includes(tipoAlerta)) {
            return res.status(400).json({ erro: 'Tipo de alerta inválido' });
        }
        
        if (tipoAlerta === 'horas' && (horasAlerta < 1 || horasAlerta > 168)) {
            return res.status(400).json({ erro: 'Horas deve estar entre 1 e 168' });
        }
        
        // Verificar se já existe configuração
        const [existing] = await pool.query('SELECT id FROM configuracoes WHERE id = 1');
        
        if (existing.length > 0) {
            // Atualizar
            await pool.query(
                `UPDATE configuracoes SET 
                    tipo_alerta = ?, 
                    horas_alerta = ?,
                    imprimir_cupom = ?,
                    tempo_renderizacao_cupom = ?,
                    tempo_fechamento_cupom = ?,
                    timeout_fallback_cupom = ?,
                    permite_venda_estoque_zero = ?,
                    data_atualizacao = NOW() 
                WHERE id = 1`,
                [tipoAlerta, horasAlerta || 24, imprimirCupom !== false, tempoRenderizacaoCupom || 500, tempoFechamentoCupom || 500, timeoutFallbackCupom || 3000, permiteVendaEstoqueZero !== false]
            );
        } else {
            // Inserir
            await pool.query(
                `INSERT INTO configuracoes 
                    (id, tipo_alerta, horas_alerta, imprimir_cupom, tempo_renderizacao_cupom, tempo_fechamento_cupom, timeout_fallback_cupom, permite_venda_estoque_zero) 
                VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
                [tipoAlerta, horasAlerta || 24, imprimirCupom !== false, tempoRenderizacaoCupom || 500, tempoFechamentoCupom || 500, timeoutFallbackCupom || 3000, permiteVendaEstoqueZero !== false]
            );
        }
        
        res.json({ 
            sucesso: true,
            mensagem: 'Configurações salvas com sucesso' 
        });
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({ erro: 'Erro ao salvar configurações' });
    }
});

module.exports = router;
