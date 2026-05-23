const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

const TOLERANCIA_FECHAMENTO = 0.01;

function toNumero(valor, fallback = 0) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : fallback;
}

function arredondarMoeda(valor) {
    return Math.round((toNumero(valor) + Number.EPSILON) * 100) / 100;
}

function clamp(valor, minimo, maximo) {
    return Math.min(Math.max(valor, minimo), maximo);
}

function ehErroValidacaoVenda(error) {
    const mensagem = String(error?.message || '');
    const errosValidacao = [
        'Subtotal da venda divergente da soma dos itens',
        'Total da venda divergente dos descontos aplicados',
        'Pagamento insuficiente para finalizar venda',
        'Nenhuma forma de pagamento informada',
        'Forma de pagamento invalida',
        'Valor pago divergente da soma das formas de pagamento',
        'Troco divergente do total e dos pagamentos informados',
        'Troco somente e permitido quando houver pagamento em dinheiro',
        'Troco nao pode ser maior que o valor recebido em dinheiro',
        'Carrinho vazio',
        'Caixa fechado! Não é possível editar vendas com o caixa fechado.',
        'Venda não encontrada ou já cancelada'
    ];

    return errosValidacao.some((texto) => mensagem.includes(texto));
}

function normalizarVendaComDescontoManual(payload) {
    const itens = Array.isArray(payload.itens) ? payload.itens : [];
    const itensNormalizados = itens.map((item) => {
        const quantidade = toNumero(item.quantidade, 0);
        const precoUnitario = toNumero(item.preco, 0);
        const subtotalBruto = arredondarMoeda(
            item.subtotal_bruto !== undefined ? item.subtotal_bruto : (precoUnitario * quantidade)
        );
        const descontoItemAplicado = arredondarMoeda(toNumero(item.desconto_manual_aplicado, 0));
        const subtotalLiquido = arredondarMoeda(
            item.subtotal !== undefined
                ? item.subtotal
                : (subtotalBruto - descontoItemAplicado)
        );

        return {
            ...item,
            quantidade,
            preco: precoUnitario,
            subtotal_bruto: subtotalBruto,
            desconto_manual_tipo: item.desconto_manual_tipo || null,
            desconto_manual_valor: arredondarMoeda(toNumero(item.desconto_manual_valor, 0)),
            desconto_manual_aplicado: clamp(descontoItemAplicado, 0, subtotalBruto),
            subtotal: clamp(subtotalLiquido, 0, subtotalBruto)
        };
    });

    const subtotalItensBruto = arredondarMoeda(
        itensNormalizados.reduce((soma, item) => soma + item.subtotal_bruto, 0)
    );

    const descontoItensAplicado = arredondarMoeda(
        itensNormalizados.reduce((soma, item) => soma + item.desconto_manual_aplicado, 0)
    );

    const subtotalAposDescontoItens = arredondarMoeda(
        Math.max(0, subtotalItensBruto - descontoItensAplicado)
    );

    let descontoManualTotalAplicado = arredondarMoeda(
        toNumero(payload.desconto_manual_total_aplicado, 0)
    );

    if (!payload.desconto_manual_total_aplicado && payload.desconto !== undefined) {
        const descontoLegado = arredondarMoeda(toNumero(payload.desconto, 0));
        descontoManualTotalAplicado = arredondarMoeda(
            Math.max(0, descontoLegado - descontoItensAplicado)
        );
    }

    descontoManualTotalAplicado = clamp(descontoManualTotalAplicado, 0, subtotalAposDescontoItens);

    const descontoTotalAplicado = arredondarMoeda(descontoItensAplicado + descontoManualTotalAplicado);

    const subtotalBrutoInformado = payload.subtotal !== undefined
        ? arredondarMoeda(toNumero(payload.subtotal, subtotalItensBruto))
        : subtotalItensBruto;

    if (Math.abs(subtotalBrutoInformado - subtotalItensBruto) > TOLERANCIA_FECHAMENTO) {
        throw new Error('Subtotal da venda divergente da soma dos itens');
    }

    const subtotalBrutoValidado = subtotalItensBruto;
    const totalCalculado = arredondarMoeda(Math.max(0, subtotalBrutoValidado - descontoTotalAplicado));

    const totalInformado = arredondarMoeda(toNumero(payload.total, totalCalculado));
    if (Math.abs(totalCalculado - totalInformado) > TOLERANCIA_FECHAMENTO) {
        throw new Error('Total da venda divergente dos descontos aplicados');
    }

    const valorPago = arredondarMoeda(toNumero(payload.valor_pago, 0));
    if (valorPago + TOLERANCIA_FECHAMENTO < totalInformado) {
        throw new Error('Pagamento insuficiente para finalizar venda');
    }

    return {
        itens: itensNormalizados,
        subtotalBruto: subtotalBrutoValidado,
        total: totalInformado,
        descontoTotalAplicado,
        descontoItensAplicado,
        descontoManualTotalTipo: payload.desconto_manual_total_tipo || null,
        descontoManualTotalValor: arredondarMoeda(toNumero(payload.desconto_manual_total_valor, 0)),
        descontoManualTotalAplicado,
        valorPago,
        troco: arredondarMoeda(toNumero(payload.troco, 0))
    };
}

function validarPagamentosVenda(formasPagamentoPayload, total, valorPago, trocoInformado) {
    if (!Array.isArray(formasPagamentoPayload) || formasPagamentoPayload.length === 0) {
        throw new Error('Nenhuma forma de pagamento informada');
    }

    const formasPagamento = formasPagamentoPayload.map((pagamento) => ({
        forma: String(pagamento.forma || '').trim().toLowerCase(),
        valor: arredondarMoeda(toNumero(pagamento.valor, 0))
    }));

    if (formasPagamento.some((pagamento) => !pagamento.forma || pagamento.valor <= 0)) {
        throw new Error('Forma de pagamento invalida');
    }

    const somaPagamentos = arredondarMoeda(
        formasPagamento.reduce((soma, pagamento) => soma + pagamento.valor, 0)
    );

    if (Math.abs(somaPagamentos - valorPago) > TOLERANCIA_FECHAMENTO) {
        throw new Error('Valor pago divergente da soma das formas de pagamento');
    }

    const trocoCalculado = arredondarMoeda(Math.max(0, valorPago - total));
    if (Math.abs(arredondarMoeda(trocoInformado) - trocoCalculado) > TOLERANCIA_FECHAMENTO) {
        throw new Error('Troco divergente do total e dos pagamentos informados');
    }

    const totalDinheiro = arredondarMoeda(
        formasPagamento
            .filter((pagamento) => pagamento.forma === 'dinheiro')
            .reduce((soma, pagamento) => soma + pagamento.valor, 0)
    );

    if (trocoCalculado > TOLERANCIA_FECHAMENTO && totalDinheiro <= TOLERANCIA_FECHAMENTO) {
        throw new Error('Troco somente e permitido quando houver pagamento em dinheiro');
    }

    if (trocoCalculado > TOLERANCIA_FECHAMENTO && totalDinheiro + TOLERANCIA_FECHAMENTO < trocoCalculado) {
        throw new Error('Troco nao pode ser maior que o valor recebido em dinheiro');
    }

    return {
        formasPagamento,
        trocoCalculado
    };
}

// Finalizar venda
router.post('/', async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { formas_pagamento } = req.body;
        const vendaNormalizada = normalizarVendaComDescontoManual(req.body);
        const {
            itens,
            subtotalBruto,
            descontoTotalAplicado,
            total,
            valorPago,
            troco: trocoInformado,
            descontoManualTotalTipo,
            descontoManualTotalValor,
            descontoManualTotalAplicado,
            descontoItensAplicado
        } = vendaNormalizada;

        const pagamentoNormalizado = validarPagamentosVenda(formas_pagamento, total, valorPago, trocoInformado);
        const formasPagamento = pagamentoNormalizado.formasPagamento;
        const troco = pagamentoNormalizado.trocoCalculado;
        
        if (!itens || itens.length === 0) {
            throw new Error('Carrinho vazio');
        }

        // Inserir venda
        const [vendaResult] = await connection.query(
            `INSERT INTO vendas (
                total, valor_pago, troco, quantidade_itens, desconto, subtotal_bruto,
                desconto_manual_total_tipo, desconto_manual_total_valor,
                desconto_manual_total_aplicado, desconto_manual_itens_aplicado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                total,
                valorPago,
                troco,
                itens.reduce((sum, item) => sum + item.quantidade, 0),
                descontoTotalAplicado,
                subtotalBruto,
                descontoManualTotalTipo,
                descontoManualTotalValor,
                descontoManualTotalAplicado,
                descontoItensAplicado
            ]
        );
        
        const vendaId = vendaResult.insertId;

        // Inserir formas de pagamento
        for (const pagamento of formasPagamento) {
            await connection.query(
                'INSERT INTO formas_pagamento_venda (venda_id, forma_pagamento, valor) VALUES (?, ?, ?)',
                [vendaId, pagamento.forma, pagamento.valor]
            );
        }
        
        // Inserir itens e atualizar estoque
        for (const item of itens) {
            // Buscar ID e CUSTO do produto (para análise de lucratividade)
            const [produtoRows] = await connection.query(
                'SELECT id, preco_custo FROM produtos WHERE codigo_barras = ?',
                [item.codigo]
            );
            
            if (produtoRows.length === 0) {
                throw new Error(`Produto ${item.codigo} não encontrado`);
            }
            
            const produtoId = produtoRows[0].id;
            const precoCusto = produtoRows[0].preco_custo || 0;
            
            // Inserir item da venda (COM CUSTO para análise histórica)
            await connection.query(
                `INSERT INTO itens_venda (
                    venda_id, produto_id, codigo_barras, nome_produto, quantidade,
                    preco_unitario, preco_custo_unitario, subtotal_bruto,
                    desconto_manual_tipo, desconto_manual_valor, desconto_manual_aplicado, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    vendaId,
                    produtoId,
                    item.codigo,
                    item.nome,
                    item.quantidade,
                    item.preco,
                    precoCusto,
                    item.subtotal_bruto,
                    item.desconto_manual_tipo,
                    item.desconto_manual_valor,
                    item.desconto_manual_aplicado,
                    item.subtotal
                ]
            );
            
            // Atualizar estoque
            await connection.query(
                'UPDATE produtos SET estoque = estoque - ? WHERE id = ?',
                [item.quantidade, produtoId]
            );
        }
        
        await connection.commit();
        
        // Enviar cupom via Telegram (não bloqueia venda se falhar)
        if (global.telegramBot) {
            try {
                await global.telegramBot.enviarCupomVenda({
                    id: vendaId,
                    itens: itens.map(item => ({
                        nome: item.nome,
                        quantidade: item.quantidade,
                        preco: item.preco
                    })),
                    total: total,
                    formasPagamento: formasPagamento.map(fp => ({
                        forma: fp.forma,
                        valor: fp.valor
                    })),
                    troco: troco
                });
            } catch (error) {
                console.error('❌ Erro ao enviar Telegram (venda concluída):', error.message);
            }
        }
        
        res.json({
            success: true,
            data: { vendaId },
            vendaId: vendaId,
            message: 'Venda finalizada com sucesso!' 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao finalizar venda:', error);
        const statusCode = ehErroValidacaoVenda(error) ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message || 'Erro ao finalizar venda' });
    } finally {
        connection.release();
    }
});

// Listar vendas (apenas não canceladas por padrão)
// IMPORTANTE: Por padrão exclui vendas canceladas para garantir integridade dos relatórios
// Use ?incluir_canceladas=true para auditorias
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
        const incluirCanceladas = req.query.incluir_canceladas === 'true';
        
        const whereClause = incluirCanceladas ? '' : 'WHERE cancelado = FALSE';
        
        const [rows] = await pool.query(
            `SELECT * FROM vendas ${whereClause} ORDER BY data_venda DESC LIMIT 1000`
        );
        
        res.json({
            success: true,
            data: rows,
            vendas: rows,
            message: 'Vendas listadas com sucesso'
        });
    } catch (error) {
        console.error('Erro ao listar vendas:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar vendas' });
    }
});

// Relatorio de vendas com itens/formas em lote
router.get('/relatorio', async (req, res) => {
    try {
        const pool = getPool();
        const { data_inicial, data_final, forma_pagamento } = req.query;

        if (!data_inicial || !data_final) {
            return res.status(400).json({
                success: false,
                message: 'Datas inicial e final sao obrigatorias'
            });
        }

        const forma = forma_pagamento || 'todos';
        const params = [data_inicial, data_final];
        let filtroForma = '';

        if (forma !== 'todos') {
            filtroForma = 'AND fp.forma_pagamento = ?';
            params.push(forma);
        }

        const [vendas] = await pool.query(
            `SELECT DISTINCT v.*
             FROM vendas v
             LEFT JOIN formas_pagamento_venda fp ON fp.venda_id = v.id
             WHERE v.cancelado = FALSE
               AND DATE(v.data_venda) BETWEEN ? AND ?
               ${filtroForma}
             ORDER BY v.data_venda DESC`,
            params
        );

        if (vendas.length === 0) {
            return res.json({
                success: true,
                data: { vendas: [], itens: [], formas_pagamento: [] },
                vendas: [],
                itens: [],
                formas_pagamento: [],
                message: 'Relatorio gerado com sucesso'
            });
        }

        const vendaIds = vendas.map(venda => venda.id);
        const placeholders = vendaIds.map(() => '?').join(',');

        const [itens] = await pool.query(
            `SELECT * FROM itens_venda WHERE venda_id IN (${placeholders})`,
            vendaIds
        );

        const [formasPagamento] = await pool.query(
            `SELECT * FROM formas_pagamento_venda WHERE venda_id IN (${placeholders})`,
            vendaIds
        );

        res.json({
            success: true,
            data: {
                vendas,
                itens,
                formas_pagamento: formasPagamento
            },
            vendas,
            itens,
            formas_pagamento: formasPagamento,
            message: 'Relatorio gerado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao gerar relatorio de vendas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar relatorio de vendas'
        });
    }
});

// Detalhes de uma venda
router.get('/:id', async (req, res) => {
    try {
        const pool = getPool();
        
        const [venda] = await pool.query(
            'SELECT * FROM vendas WHERE id = ?',
            [req.params.id]
        );
        
        if (venda.length === 0) {
            return res.status(404).json({ success: false, message: 'Venda não encontrada' });
        }
        
        // Avisar se a venda está cancelada
        if (venda[0].cancelado) {
            console.warn(`⚠️ Acesso a venda cancelada #${req.params.id}`);
        }
        
        const [itens] = await pool.query(
            'SELECT * FROM itens_venda WHERE venda_id = ?',
            [req.params.id]
        );

        const [formasPagamento] = await pool.query(
            'SELECT * FROM formas_pagamento_venda WHERE venda_id = ?',
            [req.params.id]
        );
        
        const detalhes = {
            venda: venda[0],
            itens: itens,
            formas_pagamento: formasPagamento
        };

        res.json({
            success: true,
            data: detalhes,
            ...detalhes,
            message: 'Detalhes da venda carregados com sucesso'
        });
    } catch (error) {
        console.error('Erro ao buscar venda:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar venda' });
    }
});

// Estatísticas
router.get('/stats/resumo', async (req, res) => {
    try {
        const pool = getPool();
        
        const [totalVendas] = await pool.query(
            'SELECT COUNT(*) as total, SUM(total) as valor_total FROM vendas WHERE DATE(data_venda) = CURDATE() AND cancelado = FALSE'
        );
        
        const [totalProdutos] = await pool.query(
            'SELECT COUNT(*) as total FROM produtos WHERE ativo = TRUE'
        );
        
        const [produtosBaixoEstoque] = await pool.query(
            'SELECT COUNT(*) as total FROM produtos WHERE estoque < 10 AND ativo = TRUE'
        );
        
        const resumo = {
            vendas_hoje: totalVendas[0].total || 0,
            valor_vendas_hoje: totalVendas[0].valor_total || 0,
            total_produtos: totalProdutos[0].total || 0,
            produtos_baixo_estoque: produtosBaixoEstoque[0].total || 0
        };

        res.json({
            success: true,
            data: resumo,
            ...resumo,
            message: 'Estatisticas carregadas com sucesso'
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas' });
    }
});

// Estatísticas por forma de pagamento (apenas vendas não canceladas)
router.get('/stats/formas-pagamento', async (req, res) => {
    try {
        const pool = getPool();
        const periodo = String(req.query.periodo || 'mes').toLowerCase();
        const data = req.query.data;
        const dataInicial = req.query.data_inicial;
        const dataFinal = req.query.data_final;

        let filtroData = "AND DATE(v.data_venda) BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND CURDATE()";
        const params = [];

        if (dataInicial && dataFinal) {
            if (new Date(dataInicial) > new Date(dataFinal)) {
                return res.status(400).json({
                    success: false,
                    message: 'Data inicial nao pode ser maior que data final'
                });
            }

            filtroData = 'AND DATE(v.data_venda) BETWEEN ? AND ?';
            params.push(dataInicial, dataFinal);
        } else if (data) {
            filtroData = 'AND DATE(v.data_venda) = ?';
            params.push(data);
        } else if (periodo === 'hoje') {
            filtroData = 'AND DATE(v.data_venda) = CURDATE()';
        } else if (periodo === '7dias') {
            filtroData = 'AND DATE(v.data_venda) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()';
        }

        const [rows] = await pool.query(
            `SELECT
                agregado.forma_pagamento,
                SUM(agregado.valor_liquido) AS valor_total,
                COUNT(*) AS quantidade_vendas
             FROM (
                SELECT
                    fp.venda_id,
                    fp.forma_pagamento,
                    CASE
                        WHEN fp.forma_pagamento = 'dinheiro' THEN GREATEST(SUM(fp.valor) - COALESCE(MAX(v.troco), 0), 0)
                        ELSE SUM(fp.valor)
                    END AS valor_liquido
                FROM formas_pagamento_venda fp
                INNER JOIN vendas v ON v.id = fp.venda_id
                WHERE v.cancelado = FALSE
                ${filtroData}
                GROUP BY fp.venda_id, fp.forma_pagamento
             ) AS agregado
             GROUP BY agregado.forma_pagamento
             ORDER BY valor_total DESC`
            ,
            params
        );

        res.json({
            success: true,
            data: rows,
            formas_pagamento: rows,
            periodo_aplicado: dataInicial && dataFinal ? 'intervalo_personalizado' : (data ? 'data_especifica' : periodo),
            data_aplicada: data || null,
            data_inicial_aplicada: dataInicial || null,
            data_final_aplicada: dataFinal || null,
            message: 'Estatisticas de formas de pagamento carregadas com sucesso'
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas de formas de pagamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas de formas de pagamento' });
    }
});

// Cancelar/Excluir venda (marca como cancelada e reverte estoque)
router.delete('/:id', async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const vendaId = req.params.id;
        const { motivo } = req.body;
        
        // Buscar venda
        const [venda] = await connection.query(
            'SELECT * FROM vendas WHERE id = ? AND cancelado = FALSE',
            [vendaId]
        );
        
        if (venda.length === 0) {
            throw new Error('Venda não encontrada ou já cancelada');
        }
        
        const vendaData = venda[0];
        
        // Verificar se o caixa ainda está aberto
        const [caixaAberto] = await connection.query(
            'SELECT * FROM caixa_aberto LIMIT 1'
        );
        
        // Se caixa está aberto, verificar se a venda foi feita no caixa atual
        if (caixaAberto.length > 0) {
            const dataAberturaCaixa = new Date(caixaAberto[0].data_hora_abertura);
            const dataVenda = new Date(vendaData.data_venda);
            
            // Se a venda foi feita após a abertura do caixa atual, atualizar total_vendas
            if (dataVenda >= dataAberturaCaixa) {
                await connection.query(
                    'UPDATE caixa_aberto SET total_vendas = total_vendas - ? WHERE id = ?',
                    [vendaData.total, caixaAberto[0].id]
                );
                
                console.log(`✅ Total de vendas do caixa atualizado: -R$ ${vendaData.total}`);
            }
        }
        
        // Buscar itens da venda para reverter estoque
        const [itens] = await connection.query(
            'SELECT * FROM itens_venda WHERE venda_id = ?',
            [vendaId]
        );
        
        // Reverter estoque de cada produto
        for (const item of itens) {
            await connection.query(
                'UPDATE produtos SET estoque = estoque + ? WHERE id = ?',
                [item.quantidade, item.produto_id]
            );
            
            console.log(`✅ Estoque revertido: ${item.nome_produto} +${item.quantidade}`);
        }
        
        // Marcar venda como cancelada (não excluir para auditoria)
        await connection.query(
            `UPDATE vendas 
             SET cancelado = TRUE, 
                 data_cancelamento = NOW(), 
                 motivo_cancelamento = ?,
                 usuario_cancelamento_id = ?
             WHERE id = ?`,
            [motivo || 'Cancelamento via sistema', req.body.usuario_id || null, vendaId]
        );
        
        await connection.commit();
        
        console.log(`✅ Venda #${vendaId} cancelada com sucesso`);
        
        res.json({ 
            success: true, 
            data: {
                venda_id: vendaId,
                valor: vendaData.total,
                itens_revertidos: itens.length,
                caixa_atualizado: caixaAberto.length > 0
            },
            message: 'Venda cancelada com sucesso',
            dados: {
                venda_id: vendaId,
                valor: vendaData.total,
                itens_revertidos: itens.length,
                caixa_atualizado: caixaAberto.length > 0
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Erro ao cancelar venda:', error);
        res.status(500).json({ 
            success: false,
            message: error.message || 'Erro ao cancelar venda',
            error: error.message || 'Erro ao cancelar venda' 
        });
    } finally {
        connection.release();
    }
});

// Editar venda (criar nova venda e cancelar a antiga)
router.put('/:id', async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const vendaId = req.params.id;
        const { formas_pagamento, motivo_edicao } = req.body;
        const vendaNormalizada = normalizarVendaComDescontoManual(req.body);
        const {
            itens,
            subtotalBruto,
            descontoTotalAplicado,
            total,
            valorPago,
            troco: trocoInformado,
            descontoManualTotalTipo,
            descontoManualTotalValor,
            descontoManualTotalAplicado,
            descontoItensAplicado
        } = vendaNormalizada;

        const pagamentoNormalizado = validarPagamentosVenda(formas_pagamento, total, valorPago, trocoInformado);
        const formasPagamento = pagamentoNormalizado.formasPagamento;
        const troco = pagamentoNormalizado.trocoCalculado;
        
        // Buscar venda original
        const [vendaOriginal] = await connection.query(
            'SELECT * FROM vendas WHERE id = ? AND cancelado = FALSE',
            [vendaId]
        );
        
        if (vendaOriginal.length === 0) {
            throw new Error('Venda não encontrada ou já cancelada');
        }
        
        // Verificar se o caixa está aberto
        const [caixaAberto] = await connection.query('SELECT * FROM caixa_aberto LIMIT 1');
        
        if (caixaAberto.length === 0) {
            throw new Error('Caixa fechado! Não é possível editar vendas com o caixa fechado.');
        }

        const vendaOriginalData = vendaOriginal[0];
        
        // 1. CANCELAR VENDA ORIGINAL (reverter estoque)
        const [itensOriginais] = await connection.query(
            'SELECT * FROM itens_venda WHERE venda_id = ?',
            [vendaId]
        );
        
        for (const item of itensOriginais) {
            await connection.query(
                'UPDATE produtos SET estoque = estoque + ? WHERE id = ?',
                [item.quantidade, item.produto_id]
            );
        }
        
        // Atualizar caixa: remover venda original
        const dataAberturaCaixa = new Date(caixaAberto[0].data_hora_abertura);
        const dataVendaOriginal = new Date(vendaOriginalData.data_venda);
        
        if (dataVendaOriginal >= dataAberturaCaixa) {
            await connection.query(
                'UPDATE caixa_aberto SET total_vendas = total_vendas - ? WHERE id = ?',
                [vendaOriginalData.total, caixaAberto[0].id]
            );
        }
        
        // Marcar venda original como cancelada
        await connection.query(
            `UPDATE vendas 
             SET cancelado = TRUE, 
                 data_cancelamento = NOW(), 
                 motivo_cancelamento = ?
             WHERE id = ?`,
            [`Editada: ${motivo_edicao || 'Venda editada'}`, vendaId]
        );
        
        // 2. CRIAR NOVA VENDA
        const [novaVendaResult] = await connection.query(
            `INSERT INTO vendas (
                total, valor_pago, troco, quantidade_itens, desconto, subtotal_bruto,
                desconto_manual_total_tipo, desconto_manual_total_valor,
                desconto_manual_total_aplicado, desconto_manual_itens_aplicado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                total,
                valorPago,
                troco,
                itens.reduce((sum, item) => sum + item.quantidade, 0),
                descontoTotalAplicado,
                subtotalBruto,
                descontoManualTotalTipo,
                descontoManualTotalValor,
                descontoManualTotalAplicado,
                descontoItensAplicado
            ]
        );
        
        const novaVendaId = novaVendaResult.insertId;
        
        // Inserir formas de pagamento
        for (const pagamento of formasPagamento) {
            await connection.query(
                'INSERT INTO formas_pagamento_venda (venda_id, forma_pagamento, valor) VALUES (?, ?, ?)',
                [novaVendaId, pagamento.forma, pagamento.valor]
            );
        }
        
        // Inserir itens e atualizar estoque
        for (const item of itens) {
            const [produtoRows] = await connection.query(
                'SELECT id, preco_custo FROM produtos WHERE codigo_barras = ?',
                [item.codigo]
            );
            
            if (produtoRows.length === 0) {
                throw new Error(`Produto ${item.codigo} não encontrado`);
            }
            
            const produtoId = produtoRows[0].id;
            const precoCusto = produtoRows[0].preco_custo || 0;
            
            await connection.query(
                `INSERT INTO itens_venda (
                    venda_id, produto_id, codigo_barras, nome_produto, quantidade,
                    preco_unitario, preco_custo_unitario, subtotal_bruto,
                    desconto_manual_tipo, desconto_manual_valor, desconto_manual_aplicado, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    novaVendaId,
                    produtoId,
                    item.codigo,
                    item.nome,
                    item.quantidade,
                    item.preco,
                    precoCusto,
                    item.subtotal_bruto,
                    item.desconto_manual_tipo,
                    item.desconto_manual_valor,
                    item.desconto_manual_aplicado,
                    item.subtotal
                ]
            );
            
            // Atualizar estoque
            await connection.query(
                'UPDATE produtos SET estoque = estoque - ? WHERE id = ?',
                [item.quantidade, produtoId]
            );
        }
        
        // Atualizar caixa: adicionar nova venda
        await connection.query(
            'UPDATE caixa_aberto SET total_vendas = total_vendas + ? WHERE id = ?',
            [total, caixaAberto[0].id]
        );
        
        await connection.commit();
        
        console.log(`✅ Venda #${vendaId} editada com sucesso. Nova venda: #${novaVendaId}`);
        
        res.json({ 
            success: true, 
            data: {
                venda_original_id: vendaId,
                nova_venda_id: novaVendaId
            },
            message: 'Venda editada com sucesso!',
            dados: {
                venda_original_id: vendaId,
                nova_venda_id: novaVendaId
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Erro ao editar venda:', error);
        const statusCode = ehErroValidacaoVenda(error) ? 400 : 500;
        res.status(statusCode).json({ 
            success: false,
            message: error.message || 'Erro ao editar venda' 
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
