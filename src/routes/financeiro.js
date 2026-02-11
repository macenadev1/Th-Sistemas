const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// ==================== CONTAS A PAGAR ====================

// Listar todas as contas a pagar com filtros
router.get('/', async (req, res) => {
    try {
        const pool = getPool();
        const { status, data_inicio, data_fim, fornecedor_id, categoria_id } = req.query;
        
        let query = `
            SELECT 
                cp.*,
                cf.nome as categoria_nome,
                cf.tipo as categoria_tipo,
                f.nome_fantasia as fornecedor_nome
            FROM contas_pagar cp
            LEFT JOIN categorias_financeiras cf ON cp.categoria_id = cf.id
            LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ' AND cp.status = ?';
            params.push(status);
        }
        
        if (data_inicio) {
            query += ' AND cp.data_vencimento >= ?';
            params.push(data_inicio);
        }
        
        if (data_fim) {
            query += ' AND cp.data_vencimento <= ?';
            params.push(data_fim);
        }
        
        if (fornecedor_id) {
            query += ' AND cp.fornecedor_id = ?';
            params.push(fornecedor_id);
        }
        
        if (categoria_id) {
            query += ' AND cp.categoria_id = ?';
            params.push(categoria_id);
        }
        
        query += ' ORDER BY cp.data_vencimento ASC, cp.id DESC';
        
        const [rows] = await pool.query(query, params);
        
        // Atualizar status de contas vencidas
        await pool.query(`
            UPDATE contas_pagar 
            SET status = 'vencido' 
            WHERE status = 'pendente' 
            AND data_vencimento < CURDATE()
        `);
        
        res.json({ success: true, contas: rows });
    } catch (error) {
        console.error('Erro ao listar contas a pagar:', error);
        res.status(500).json({ success: false, error: 'Erro ao listar contas' });
    }
});

// Calcular dívidas futuras (contas pendentes) por origem
// IMPORTANTE: Esta rota deve vir ANTES de /:id para não ser capturada pelo parâmetro dinâmico
router.get('/dividas-futuras', async (req, res) => {
    try {
        const pool = getPool();
        
        // Extrair parâmetros de filtro de período
        const { mes, data_inicial, data_final } = req.query;
        
        // Construir filtro dinâmico de data
        let filtroData = '';
        const params = [];
        let filtroDescricao = 'Todos os períodos';
        
        if (mes) {
            // Filtro por mês específico (formato: YYYY-MM)
            filtroData = ' AND DATE_FORMAT(cp.data_vencimento, "%Y-%m") = ?';
            params.push(mes);
            filtroDescricao = `Mês ${mes}`;
        } else if (data_inicial && data_final) {
            // Filtro por range de datas
            filtroData = ' AND cp.data_vencimento BETWEEN ? AND ?';
            params.push(data_inicial, data_final);
            filtroDescricao = `${data_inicial} até ${data_final}`;
        }
        
        // Buscar contas pendentes + vencidas com filtro de data
        const [contas] = await pool.query(`
            SELECT 
                cp.valor,
                cp.origem_pagamento
            FROM contas_pagar cp
            WHERE cp.status IN ('pendente', 'vencido')${filtroData}
        `, params);
        
        let dividasReposicao = 0;
        let dividasLucro = 0;
        
        // Separar por origem de pagamento
        contas.forEach(conta => {
            const valor = parseFloat(conta.valor);
            
            // Usar o campo origem_pagamento para separar
            if (conta.origem_pagamento === 'reposicao') {
                dividasReposicao += valor;
            } 
            // Lucro ou null vai para Lucro
            else {
                dividasLucro += valor;
            }
        });
        
        res.json({
            success: true,
            dividas: {
                reposicao: dividasReposicao,
                lucro: dividasLucro,
                total: dividasReposicao + dividasLucro
            },
            filtro: filtroDescricao
        });
    } catch (error) {
        console.error('Erro ao calcular dívidas futuras:', error);
        res.status(500).json({ success: false, error: 'Erro ao calcular dívidas futuras' });
    }
});

// Relatório de estornos (todos ou por período)
router.get('/relatorio/estornos', async (req, res) => {
    try {
        const pool = getPool();
        const { data_inicio, data_fim } = req.query;
        
        let query = `
            SELECT 
                e.*,
                cp.descricao as conta_descricao,
                cp.valor as conta_valor_total,
                cp.origem_pagamento,
                f.nome_fantasia as fornecedor_nome,
                u.nome as usuario_nome
            FROM estornos_contas_pagar e
            INNER JOIN contas_pagar cp ON e.conta_pagar_id = cp.id
            LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
            LEFT JOIN usuarios u ON e.usuario_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (data_inicio) {
            query += ' AND e.data_estorno >= ?';
            params.push(data_inicio);
        }
        
        if (data_fim) {
            query += ' AND e.data_estorno <= ?';
            params.push(data_fim + ' 23:59:59');
        }
        
        query += ' ORDER BY e.data_estorno DESC';
        
        const [estornos] = await pool.query(query, params);
        
        // Calcular totais
        const totalEstornado = estornos.reduce((sum, e) => sum + parseFloat(e.valor_estornado), 0);
        const totalReposicao = estornos.filter(e => e.origem_pagamento === 'reposicao')
            .reduce((sum, e) => sum + parseFloat(e.valor_estornado), 0);
        const totalLucro = estornos.filter(e => e.origem_pagamento === 'lucro')
            .reduce((sum, e) => sum + parseFloat(e.valor_estornado), 0);
        
        res.json({
            success: true,
            estornos: estornos,
            totais: {
                total_estornado: totalEstornado,
                total_reposicao: totalReposicao,
                total_lucro: totalLucro,
                quantidade: estornos.length
            }
        });
    } catch (error) {
        console.error('Erro ao gerar relatório de estornos:', error);
        res.status(500).json({ success: false, error: 'Erro ao gerar relatório' });
    }
});

// Buscar conta específica
router.get('/:id', async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT 
                cp.*,
                cf.nome as categoria_nome,
                f.nome_fantasia as fornecedor_nome
            FROM contas_pagar cp
            LEFT JOIN categorias_financeiras cf ON cp.categoria_id = cf.id
            LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
            WHERE cp.id = ?
        `, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Conta não encontrada' });
        }
        
        res.json({ success: true, conta: rows[0] });
    } catch (error) {
        console.error('Erro ao buscar conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar conta' });
    }
});

// Cadastrar nova conta a pagar
router.post('/', async (req, res) => {
    try {
        const pool = getPool();
        const {
            descricao,
            categoria_id,
            fornecedor_id,
            valor,
            data_vencimento,
            observacoes,
            origem_pagamento,
            mes_referencia
        } = req.body;
        
        if (!descricao || !valor || !data_vencimento) {
            return res.status(400).json({ 
                success: false, 
                error: 'Descrição, valor e data de vencimento são obrigatórios' 
            });
        }
        
        // Determinar status baseado na data de vencimento
        const hoje = new Date();
        const vencimento = new Date(data_vencimento);
        let status = 'pendente';
        
        if (vencimento < hoje) {
            status = 'vencido';
        }
        
        const [result] = await pool.query(`
            INSERT INTO contas_pagar (
                descricao, 
                categoria_id, 
                fornecedor_id, 
                valor, 
                data_vencimento,
                status,
                observacoes,
                origem_pagamento,
                mes_referencia
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            descricao,
            categoria_id || null,
            fornecedor_id || null,
            valor,
            data_vencimento,
            status,
            observacoes || null,
            origem_pagamento || null,
            mes_referencia || null
        ]);
        
        res.json({ 
            success: true, 
            message: 'Conta cadastrada com sucesso',
            id: result.insertId 
        });
    } catch (error) {
        console.error('Erro ao cadastrar conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao cadastrar conta' });
    }
});

// Atualizar conta a pagar
router.put('/:id', async (req, res) => {
    try {
        const pool = getPool();
        const {
            descricao,
        categoria_id,
            data_vencimento,
            observacoes,
            origem_pagamento,
            mes_referencia
        } = req.body;
        
        // Verificar se conta existe
        const [exists] = await pool.query('SELECT id, status FROM contas_pagar WHERE id = ?', [req.params.id]);
        if (exists.length === 0) {
            return res.status(404).json({ success: false, error: 'Conta não encontrada' });
        }
        
        // Não permitir editar contas já pagas
        if (exists[0].status === 'pago') {
            return res.status(400).json({ 
                success: false, 
                error: 'Não é possível editar uma conta já paga' 
            });
        }
        
        // Determinar status baseado na data de vencimento
        const hoje = new Date();
        const vencimento = new Date(data_vencimento);
        let status = 'pendente';
        
        if (vencimento < hoje) {
            status = 'vencido';
        }
        
        await pool.query(`
            UPDATE contas_pagar SET
                descricao = ?,
                categoria_id = ?,
                fornecedor_id = ?,
                valor = ?,
                data_vencimento = ?,
                status = ?,
                observacoes = ?,
                origem_pagamento = ?,
                mes_referencia = ?
            WHERE id = ?
        `, [
            descricao,
            categoria_id || null,
            fornecedor_id || null,
            valor,
            data_vencimento,
            status,
            observacoes || null,
            origem_pagamento || null,
            mes_referencia || null,
            req.params.id
        ]);
        
        res.json({ success: true, message: 'Conta atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao atualizar conta' });
    }
});

// Obter saldos mensais de Reposição e Lucro
router.get('/saldos-mes/:ano/:mes', async (req, res) => {
    try {
        const pool = getPool();
        const { ano, mes } = req.params;
        
        // Validar parâmetros
        if (!ano || !mes || mes < 1 || mes > 12) {
            return res.status(400).json({ success: false, error: 'Ano e mês inválidos' });
        }
        
        const mesFormatado = String(mes).padStart(2, '0');
        const mesAno = `${ano}-${mesFormatado}-01`;
        
        // 1. BUSCAR SALDO INICIAL MANUAL (se existir)
        const [saldosIniciais] = await pool.query(
            'SELECT saldo_reposicao, saldo_lucro FROM saldos_iniciais WHERE mes_ano = ?',
            [mesAno]
        );
        
        const saldoInicialReposicao = saldosIniciais.length > 0 ? parseFloat(saldosIniciais[0].saldo_reposicao) : 0;
        const saldoInicialLucro = saldosIniciais.length > 0 ? parseFloat(saldosIniciais[0].saldo_lucro) : 0;
        
        // 2. CALCULAR REPOSIÇÃO E LUCRO DO MÊS (das vendas)
        // Receita: usar venda.total (já inclui descontos)
        // Custos: somar custos dos itens vendidos
        // IMPORTANTE: Excluir vendas canceladas
        const [vendas] = await pool.query(`
            SELECT 
                COALESCE(SUM(v.total), 0) AS receita_bruta
            FROM vendas v
            WHERE YEAR(v.data_venda) = ? AND MONTH(v.data_venda) = ?
            AND v.cancelado = FALSE
        `, [ano, mes]);
        
        const [custos] = await pool.query(`
            SELECT 
                COALESCE(SUM(iv.preco_custo_unitario * iv.quantidade), 0) AS custos_reposicao
            FROM itens_venda iv
            JOIN vendas v ON iv.venda_id = v.id
            WHERE YEAR(v.data_venda) = ? AND MONTH(v.data_venda) = ?
            AND v.cancelado = FALSE
        `, [ano, mes]);
        
        const receitaBruta = parseFloat(vendas[0].receita_bruta) || 0;
        const custosReposicao = parseFloat(custos[0].custos_reposicao) || 0;
        const lucroBruto = receitaBruta - custosReposicao;
        
        // DEBUG: Log dos valores calculados
        console.log(`📊 Saldos ${ano}-${mes}:`);
        console.log(`   Receita bruta: R$ ${receitaBruta.toFixed(2)}`);
        console.log(`   Custos reposição: R$ ${custosReposicao.toFixed(2)}`);
        console.log(`   Lucro bruto: R$ ${lucroBruto.toFixed(2)}`);
        
        // 3. CALCULAR PAGAMENTOS REALIZADOS NO MÊS CONSULTADO (por origem)
        const [pagamentos] = await pool.query(`
            SELECT 
                origem_pagamento,
                COALESCE(SUM(valor), 0) AS total_pago
            FROM contas_pagar
            WHERE status = 'pago'
            AND YEAR(data_pagamento) = ?
            AND MONTH(data_pagamento) = ?
            AND origem_pagamento IS NOT NULL
            GROUP BY origem_pagamento
        `, [ano, mes]);
        
        const pagamentosReposicao = pagamentos.find(p => p.origem_pagamento === 'reposicao')?.total_pago || 0;
        const pagamentosLucro = pagamentos.find(p => p.origem_pagamento === 'lucro')?.total_pago || 0;

        // 4. CALCULAR ESTORNOS REALIZADOS NO MÊS CONSULTADO (por origem da conta)
        const [estornos] = await pool.query(`
            SELECT 
                cp.origem_pagamento,
                COALESCE(SUM(e.valor_estornado), 0) AS total_estornado
            FROM estornos_contas_pagar e
            INNER JOIN contas_pagar cp ON e.conta_pagar_id = cp.id
            WHERE YEAR(e.data_estorno) = ?
            AND MONTH(e.data_estorno) = ?
            AND cp.origem_pagamento IS NOT NULL
            GROUP BY cp.origem_pagamento
        `, [ano, mes]);

        const estornosReposicao = estornos.find(e => e.origem_pagamento === 'reposicao')?.total_estornado || 0;
        const estornosLucro = estornos.find(e => e.origem_pagamento === 'lucro')?.total_estornado || 0;
        
        // 5. CALCULAR SALDOS DISPONÍVEIS (estornos aumentam apenas o disponível, não a bruta)
        const reposicaoBruta = saldoInicialReposicao + custosReposicao;
        const reposicaoDisponivel = reposicaoBruta - parseFloat(pagamentosReposicao) + parseFloat(estornosReposicao);
        
        const lucroBrutaTotal = saldoInicialLucro + lucroBruto;
        const lucroDisponivel = lucroBrutaTotal - parseFloat(pagamentosLucro) + parseFloat(estornosLucro);
        
        res.json({
            success: true,
            mes_referencia: mesAno,
            saldos: {
                reposicao: {
                    saldo_inicial: saldoInicialReposicao,
                    custos_mes: custosReposicao,
                    bruta: reposicaoBruta,
                    pagamentos: parseFloat(pagamentosReposicao),
                    estornos: parseFloat(estornosReposicao),
                    disponivel: reposicaoDisponivel,
                    negativo: reposicaoDisponivel < 0
                },
                lucro: {
                    saldo_inicial: saldoInicialLucro,
                    receita_mes: receitaBruta,
                    custos_mes: custosReposicao,
                    lucro_mes: lucroBruto,
                    bruta: lucroBrutaTotal,
                    pagamentos: parseFloat(pagamentosLucro),
                    estornos: parseFloat(estornosLucro),
                    disponivel: lucroDisponivel,
                    negativo: lucroDisponivel < 0
                },
                receita_bruta: receitaBruta,
                mes_consultado: mesAno // Mês que está sendo consultado
            }
        });
    } catch (error) {
        console.error('Erro ao calcular saldos mensais:', error);
        res.status(500).json({ success: false, error: 'Erro ao calcular saldos' });
    }
});

// Pagar conta
router.put('/:id/pagar', async (req, res) => {
    try {
        const pool = getPool();
        const { data_pagamento, forma_pagamento, observacoes, origem_pagamento } = req.body;
        
        // Verificar se conta existe
        const [exists] = await pool.query('SELECT id, status, valor, origem_pagamento as origem_atual FROM contas_pagar WHERE id = ?', [req.params.id]);
        if (exists.length === 0) {
            return res.status(404).json({ success: false, error: 'Conta não encontrada' });
        }
        
        if (exists[0].status === 'pago') {
            return res.status(400).json({ 
                success: false, 
                error: 'Esta conta já foi paga' 
            });
        }
        
        // VALIDAR ORIGEM OBRIGATÓRIA
        const origemFinal = origem_pagamento || exists[0].origem_atual;
        if (!origemFinal) {
            return res.status(400).json({ 
                success: false, 
                error: 'Origem do pagamento é obrigatória. Selecione Reposição ou Lucro.' 
            });
        }
        
        if (!['reposicao', 'lucro'].includes(origemFinal)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Origem inválida. Use "reposicao" ou "lucro".' 
            });
        }
        
        // VALIDAR SALDO DISPONÍVEL DO MÊS ATUAL
        const dataAtual = new Date();
        const anoAtual = dataAtual.getFullYear();
        const mesAtual = dataAtual.getMonth() + 1;
        const mesReferenciaAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;

        // Saldo inicial manual (se existir)
        const [saldoInicialRows] = await pool.query(
            'SELECT saldo_reposicao, saldo_lucro FROM saldos_iniciais WHERE mes_ano = ?',
            [mesReferenciaAtual]
        );

        const saldoInicialReposicao = saldoInicialRows.length > 0 ? parseFloat(saldoInicialRows[0].saldo_reposicao) : 0;
        const saldoInicialLucro = saldoInicialRows.length > 0 ? parseFloat(saldoInicialRows[0].saldo_lucro) : 0;

        // Receita e custos do mês (excluir vendas canceladas)
        const [vendas] = await pool.query(`
            SELECT COALESCE(SUM(v.total), 0) AS receita_total
            FROM vendas v
            WHERE YEAR(v.data_venda) = ? AND MONTH(v.data_venda) = ?
            AND v.cancelado = FALSE
        `, [anoAtual, mesAtual]);

        const [custos] = await pool.query(`
            SELECT COALESCE(SUM(iv.preco_custo_unitario * iv.quantidade), 0) AS custo_total
            FROM itens_venda iv
            JOIN vendas v ON iv.venda_id = v.id
            WHERE YEAR(v.data_venda) = ? AND MONTH(v.data_venda) = ?
            AND v.cancelado = FALSE
        `, [anoAtual, mesAtual]);

        const receitaMes = parseFloat(vendas[0].receita_total) || 0;
        const custosMes = parseFloat(custos[0].custo_total) || 0;

        // Pagamentos já realizados no mês (por origem)
        const [pagamentosRealizados] = await pool.query(`
            SELECT COALESCE(SUM(valor), 0) as total
            FROM contas_pagar
            WHERE status = 'pago'
            AND origem_pagamento = ?
            AND YEAR(data_pagamento) = ?
            AND MONTH(data_pagamento) = ?
        `, [origemFinal, anoAtual, mesAtual]);

        const totalPago = parseFloat(pagamentosRealizados[0].total) || 0;

        // Estornos já realizados no mês (por origem da conta)
        const [estornosRealizados] = await pool.query(`
            SELECT COALESCE(SUM(e.valor_estornado), 0) as total
            FROM estornos_contas_pagar e
            INNER JOIN contas_pagar cp ON e.conta_pagar_id = cp.id
            WHERE cp.origem_pagamento = ?
            AND YEAR(e.data_estorno) = ?
            AND MONTH(e.data_estorno) = ?
        `, [origemFinal, anoAtual, mesAtual]);

        const totalEstornado = parseFloat(estornosRealizados[0].total) || 0;

        // Calcular saldo disponível (estornos aumentam apenas o disponível)
        let saldoDisponivel;
        if (origemFinal === 'reposicao') {
            const reposicaoBruta = saldoInicialReposicao + custosMes;
            saldoDisponivel = reposicaoBruta - totalPago + totalEstornado;
        } else {
            const lucroMes = receitaMes - custosMes;
            const lucroBrutaTotal = saldoInicialLucro + lucroMes;
            saldoDisponivel = lucroBrutaTotal - totalPago + totalEstornado;
        }
        
        const valorConta = parseFloat(exists[0].valor);
        const saldoAposPagamento = saldoDisponivel - valorConta;
        
        // BLOQUEAR SE SALDO FICAR NEGATIVO
        if (saldoAposPagamento < 0) {
            return res.status(400).json({ 
                success: false, 
                error: `Saldo insuficiente em ${origemFinal === 'reposicao' ? 'Reposição' : 'Lucro'}. Disponível: R$ ${saldoDisponivel.toFixed(2)}, Necessário: R$ ${valorConta.toFixed(2)}`,
                saldo_disponivel: saldoDisponivel,
                valor_conta: valorConta,
                faltante: Math.abs(saldoAposPagamento)
            });
        }
        
        const dataPagamentoFinal = data_pagamento || new Date().toISOString().split('T')[0];
        
        // ATUALIZAR CONTA COM ORIGEM E MÊS ATUAL
        await pool.query(`
            UPDATE contas_pagar SET
                status = 'pago',
                data_pagamento = ?,
                forma_pagamento = ?,
                origem_pagamento = ?,
                mes_referencia = ?,
                observacoes = CONCAT(COALESCE(observacoes, ''), '\n', COALESCE(?, ''))
            WHERE id = ?
        `, [
            dataPagamentoFinal,
            forma_pagamento || null,
            origemFinal,
            mesReferenciaAtual,
            observacoes || '',
            req.params.id
        ]);
        
        res.json({ 
            success: true, 
            message: 'Conta paga com sucesso',
            origem: origemFinal,
            saldo_anterior: saldoDisponivel,
            saldo_apos_pagamento: saldoAposPagamento
        });
    } catch (error) {
        console.error('Erro ao pagar conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao pagar conta' });
    }
});

// Configurar saldos iniciais de um mês
router.post('/saldos-iniciais', async (req, res) => {
    try {
        const pool = getPool();
        const { mes_ano, saldo_reposicao, saldo_lucro } = req.body;
        
        // Validar formato de data (YYYY-MM-01)
        const dataRegex = /^\d{4}-\d{2}-01$/;
        if (!dataRegex.test(mes_ano)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Formato de data inválido. Use YYYY-MM-01' 
            });
        }
        
        // Validar valores numéricos
        if (isNaN(saldo_reposicao) || isNaN(saldo_lucro)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Saldos devem ser valores numéricos' 
            });
        }
        
        // Inserir ou atualizar saldo inicial
        await pool.query(`
            INSERT INTO saldos_iniciais (mes_ano, saldo_reposicao, saldo_lucro)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                saldo_reposicao = VALUES(saldo_reposicao),
                saldo_lucro = VALUES(saldo_lucro)
        `, [mes_ano, saldo_reposicao, saldo_lucro]);
        
        res.json({ 
            success: true, 
            message: 'Saldos iniciais configurados com sucesso',
            mes_ano,
            saldo_reposicao,
            saldo_lucro
        });
    } catch (error) {
        console.error('Erro ao configurar saldos iniciais:', error);
        res.status(500).json({ success: false, error: 'Erro ao configurar saldos iniciais' });
    }
});

// Listar saldos iniciais configurados
router.get('/saldos-iniciais', async (req, res) => {
    try {
        const pool = getPool();
        
        // Buscar últimos 12 meses de saldos configurados
        const [saldos] = await pool.query(`
            SELECT 
                mes_ano,
                saldo_reposicao,
                saldo_lucro,
                DATE_FORMAT(mes_ano, '%m/%Y') as mes_formatado
            FROM saldos_iniciais
            ORDER BY mes_ano DESC
            LIMIT 12
        `);
        
        res.json({ 
            success: true, 
            saldos
        });
    } catch (error) {
        console.error('Erro ao listar saldos iniciais:', error);
        res.status(500).json({ success: false, error: 'Erro ao listar saldos iniciais' });
    }
});

// Cancelar conta
router.put('/:id/cancelar', async (req, res) => {
    try {
        const pool = getPool();
        const { observacoes } = req.body;
        
        await pool.query(`
            UPDATE contas_pagar SET
                status = 'cancelado',
                observacoes = CONCAT(COALESCE(observacoes, ''), '\n', 'CANCELADO: ', COALESCE(?, ''))
            WHERE id = ?
        `, [observacoes || '', req.params.id]);
        
        res.json({ success: true, message: 'Conta cancelada com sucesso' });
    } catch (error) {
        console.error('Erro ao cancelar conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao cancelar conta' });
    }
});

// Deletar conta
router.delete('/:id', async (req, res) => {
    try {
        const pool = getPool();
        
        // Verificar se conta existe e não está paga
        const [exists] = await pool.query('SELECT id, status FROM contas_pagar WHERE id = ?', [req.params.id]);
        if (exists.length === 0) {
            return res.status(404).json({ success: false, error: 'Conta não encontrada' });
        }
        
        if (exists[0].status === 'pago') {
            return res.status(400).json({ 
                success: false, 
                error: 'Não é possível excluir uma conta já paga' 
            });
        }
        
        await pool.query('DELETE FROM contas_pagar WHERE id = ?', [req.params.id]);
        
        res.json({ success: true, message: 'Conta excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir conta:', error);
        res.status(500).json({ success: false, error: 'Erro ao excluir conta' });
    }
});

// Estatísticas
router.get('/stats/resumo', async (req, res) => {
    try {
        const pool = getPool();
        
        const [stats] = await pool.query(`
            SELECT 
                SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as total_pendente,
                SUM(CASE WHEN status = 'vencido' THEN valor ELSE 0 END) as total_vencido,
                SUM(CASE WHEN status = 'pago' AND MONTH(data_pagamento) = MONTH(CURDATE()) THEN valor ELSE 0 END) as total_pago_mes,
                COUNT(CASE WHEN status = 'pendente' THEN 1 END) as qtd_pendente,
                COUNT(CASE WHEN status = 'vencido' THEN 1 END) as qtd_vencido,
                COUNT(CASE WHEN status = 'pago' AND MONTH(data_pagamento) = MONTH(CURDATE()) THEN 1 END) as qtd_pago_mes
            FROM contas_pagar
        `);
        
        res.json({ success: true, stats: stats[0] });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas' });
    }
});

// Fechar mês e transferir saldos para próximo mês (carry over automático)
router.post('/fechar-mes', async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { ano, mes, forcar } = req.body;
        
        // 1. Validação
        if (!ano || !mes) {
            throw new Error('Ano e mês são obrigatórios');
        }
        
        // 2. Calcular próximo mês com rollover
        const mesAtual = parseInt(mes);
        const anoAtual = parseInt(ano);
        const proximoMes = mesAtual === 12 ? 1 : mesAtual + 1;
        const proximoAno = mesAtual === 12 ? anoAtual + 1 : anoAtual;
        
        const mesAtualFormatado = String(mesAtual).padStart(2, '0');
        const proximoMesFormatado = String(proximoMes).padStart(2, '0');
        const mesAnoAtual = `${anoAtual}-${mesAtualFormatado}-01`;
        const mesAnoProximo = `${proximoAno}-${proximoMesFormatado}-01`;
        
        // 3. Verificar se próximo mês já tem saldo inicial
        const [saldoExistente] = await connection.query(
            'SELECT * FROM saldos_iniciais WHERE mes_ano = ?',
            [mesAnoProximo]
        );
        
        if (saldoExistente.length > 0 && !forcar) {
            throw new Error(`Mês ${proximoMesFormatado}/${proximoAno} já possui saldo inicial configurado`);
        }
        
        // 4. Buscar saldo inicial do mês atual
        const [saldosIniciais] = await connection.query(
            'SELECT saldo_reposicao, saldo_lucro FROM saldos_iniciais WHERE mes_ano = ?',
            [mesAnoAtual]
        );
        
        const saldoInicialReposicao = saldosIniciais.length > 0 
            ? parseFloat(saldosIniciais[0].saldo_reposicao) : 0;
        const saldoInicialLucro = saldosIniciais.length > 0 
            ? parseFloat(saldosIniciais[0].saldo_lucro) : 0;
        
        // 5. Calcular receita total das vendas (excluir canceladas)
        const [vendas] = await connection.query(`
            SELECT COALESCE(SUM(v.total), 0) AS receita_total
            FROM vendas v
            WHERE YEAR(v.data_venda) = ? AND MONTH(v.data_venda) = ?
            AND v.cancelado = FALSE
        `, [anoAtual, mesAtual]);
        
        // 6. Calcular custo total dos itens vendidos (excluir canceladas)
        const [custos] = await connection.query(`
            SELECT COALESCE(SUM(iv.preco_custo_unitario * iv.quantidade), 0) AS custo_total
            FROM itens_venda iv
            JOIN vendas v ON iv.venda_id = v.id
            WHERE YEAR(v.data_venda) = ? AND MONTH(v.data_venda) = ?
            AND v.cancelado = FALSE
        `, [anoAtual, mesAtual]);
        
        const receitaMes = parseFloat(vendas[0].receita_total);
        const custosMes = parseFloat(custos[0].custo_total);
        const lucroMes = receitaMes - custosMes;
        
        // 7. Calcular pagamentos por origem
        const [pagamentos] = await connection.query(`
            SELECT 
                origem_pagamento,
                COALESCE(SUM(valor), 0) AS total_pago
            FROM contas_pagar
            WHERE status = 'pago'
            AND YEAR(data_pagamento) = ?
            AND MONTH(data_pagamento) = ?
            AND origem_pagamento IS NOT NULL
            GROUP BY origem_pagamento
        `, [anoAtual, mesAtual]);
        
        const pagamentosReposicao = parseFloat(
            pagamentos.find(p => p.origem_pagamento === 'reposicao')?.total_pago || 0
        );
        const pagamentosLucro = parseFloat(
            pagamentos.find(p => p.origem_pagamento === 'lucro')?.total_pago || 0
        );

        // 8. Calcular estornos do mês por origem
        const [estornos] = await connection.query(`
            SELECT 
                cp.origem_pagamento,
                COALESCE(SUM(e.valor_estornado), 0) AS total_estornado
            FROM estornos_contas_pagar e
            INNER JOIN contas_pagar cp ON e.conta_pagar_id = cp.id
            WHERE YEAR(e.data_estorno) = ?
            AND MONTH(e.data_estorno) = ?
            AND cp.origem_pagamento IS NOT NULL
            GROUP BY cp.origem_pagamento
        `, [anoAtual, mesAtual]);

        const estornosReposicao = parseFloat(
            estornos.find(e => e.origem_pagamento === 'reposicao')?.total_estornado || 0
        );
        const estornosLucro = parseFloat(
            estornos.find(e => e.origem_pagamento === 'lucro')?.total_estornado || 0
        );

        // 9. Calcular disponível para próximo mês (estornos aumentam apenas disponível)
        const reposicaoDisponivel = saldoInicialReposicao + custosMes - pagamentosReposicao + estornosReposicao;
        const lucroDisponivel = saldoInicialLucro + lucroMes - pagamentosLucro + estornosLucro;
        
        // 10. Criar/atualizar saldo inicial do próximo mês
        if (saldoExistente.length > 0) {
            await connection.query(
                'UPDATE saldos_iniciais SET saldo_reposicao = ?, saldo_lucro = ?, observacoes = ? WHERE mes_ano = ?',
                [
                    reposicaoDisponivel,
                    lucroDisponivel,
                    `Carry over automático de ${mesAtualFormatado}/${anoAtual}`,
                    mesAnoProximo
                ]
            );
        } else {
            await connection.query(
                'INSERT INTO saldos_iniciais (mes_ano, saldo_reposicao, saldo_lucro, observacoes) VALUES (?, ?, ?, ?)',
                [
                    mesAnoProximo,
                    reposicaoDisponivel,
                    lucroDisponivel,
                    `Carry over automático de ${mesAtualFormatado}/${anoAtual}`
                ]
            );
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: `Mês ${mesAtualFormatado}/${anoAtual} fechado com sucesso!`,
            dados: {
                mes_fechado: mesAnoAtual,
                proximo_mes: mesAnoProximo,
                saldos_transferidos: {
                    reposicao: reposicaoDisponivel,
                    lucro: lucroDisponivel
                }
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao fechar mês:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// ==================== ESTORNOS ====================

// Registrar estorno de uma conta paga
router.post('/:id/estorno', async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const contaId = req.params.id;
        const { valor_estornado, motivo, usuario_id } = req.body;
        
        // Validações
        if (!valor_estornado || valor_estornado <= 0) {
            throw new Error('Valor do estorno deve ser maior que zero');
        }
        
        if (!motivo || motivo.trim() === '') {
            throw new Error('Motivo do estorno é obrigatório');
        }
        
        // Buscar conta
        const [conta] = await connection.query(
            'SELECT * FROM contas_pagar WHERE id = ?',
            [contaId]
        );
        
        if (conta.length === 0) {
            throw new Error('Conta não encontrada');
        }
        
        const contaData = conta[0];
        
        // Verificar se conta está paga
        if (contaData.status !== 'pago') {
            throw new Error('Apenas contas pagas podem ser estornadas');
        }
        
        // Verificar se valor do estorno não excede o valor pago
        const valorJaEstornado = parseFloat(contaData.valor_estornado || 0);
        const valorPago = parseFloat(contaData.valor);
        const valorTotalEstornado = valorJaEstornado + parseFloat(valor_estornado);
        
        if (valorTotalEstornado > valorPago) {
            throw new Error(`Valor total estornado (R$ ${valorTotalEstornado.toFixed(2)}) não pode exceder o valor pago (R$ ${valorPago.toFixed(2)})`);
        }
        
        // Determinar mês atual para registrar estorno
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1; // 1-12
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;

        // Buscar saldo inicial do mês atual (se existir)
        const [saldoInicial] = await connection.query(
            'SELECT saldo_reposicao, saldo_lucro FROM saldos_iniciais WHERE mes_ano = ?',
            [mesAnoAtual]
        );
        
        const saldoInicialReposicao = saldoInicial.length > 0 ? parseFloat(saldoInicial[0].saldo_reposicao) : 0;
        const saldoInicialLucro = saldoInicial.length > 0 ? parseFloat(saldoInicial[0].saldo_lucro) : 0;

        // Calcular receita, custos e lucro do mês (sem alterar brutos)
        const [vendas] = await connection.query(`
            SELECT COALESCE(SUM(v.total), 0) AS receita_total
            FROM vendas v
            WHERE YEAR(v.data_venda) = ? AND MONTH(v.data_venda) = ?
            AND v.cancelado = FALSE
        `, [anoAtual, mesAtual]);

        const [custos] = await connection.query(`
            SELECT COALESCE(SUM(iv.preco_custo_unitario * iv.quantidade), 0) AS custo_total
            FROM itens_venda iv
            JOIN vendas v ON iv.venda_id = v.id
            WHERE YEAR(v.data_venda) = ? AND MONTH(v.data_venda) = ?
            AND v.cancelado = FALSE
        `, [anoAtual, mesAtual]);

        const receitaMes = parseFloat(vendas[0].receita_total);
        const custosMes = parseFloat(custos[0].custo_total);
        const lucroMes = receitaMes - custosMes;

        // Calcular pagamentos por origem no mês
        const [pagamentos] = await connection.query(`
            SELECT 
                origem_pagamento,
                COALESCE(SUM(valor), 0) AS total_pago
            FROM contas_pagar
            WHERE status = 'pago'
            AND YEAR(data_pagamento) = ?
            AND MONTH(data_pagamento) = ?
            AND origem_pagamento IS NOT NULL
            GROUP BY origem_pagamento
        `, [anoAtual, mesAtual]);

        const pagamentosReposicao = parseFloat(
            pagamentos.find(p => p.origem_pagamento === 'reposicao')?.total_pago || 0
        );
        const pagamentosLucro = parseFloat(
            pagamentos.find(p => p.origem_pagamento === 'lucro')?.total_pago || 0
        );

        // Calcular estornos já realizados no mês por origem
        const [estornos] = await connection.query(`
            SELECT 
                cp.origem_pagamento,
                COALESCE(SUM(e.valor_estornado), 0) AS total_estornado
            FROM estornos_contas_pagar e
            INNER JOIN contas_pagar cp ON e.conta_pagar_id = cp.id
            WHERE YEAR(e.data_estorno) = ?
            AND MONTH(e.data_estorno) = ?
            AND cp.origem_pagamento IS NOT NULL
            GROUP BY cp.origem_pagamento
        `, [anoAtual, mesAtual]);

        const estornosReposicao = parseFloat(
            estornos.find(e => e.origem_pagamento === 'reposicao')?.total_estornado || 0
        );
        const estornosLucro = parseFloat(
            estornos.find(e => e.origem_pagamento === 'lucro')?.total_estornado || 0
        );

        // Saldos disponíveis atuais (não altera brutos)
        const reposicaoBruta = saldoInicialReposicao + custosMes;
        const lucroBrutaTotal = saldoInicialLucro + lucroMes;

        const reposicaoDisponivelAtual = reposicaoBruta - pagamentosReposicao + estornosReposicao;
        const lucroDisponivelAtual = lucroBrutaTotal - pagamentosLucro + estornosLucro;

        const saldoAntesReposicao = reposicaoDisponivelAtual;
        const saldoAntesLucro = lucroDisponivelAtual;
        
        // Devolver dinheiro para a origem correta (reposicao ou lucro)
        const origemEstorno = contaData.origem_pagamento || 'lucro';
        
        let saldoDepoisReposicao = saldoAntesReposicao;
        let saldoDepoisLucro = saldoAntesLucro;
        
        if (origemEstorno === 'reposicao') {
            saldoDepoisReposicao += parseFloat(valor_estornado);
        } else {
            saldoDepoisLucro += parseFloat(valor_estornado);
        }
        
        // NÃO altera saldos brutos; estorno impacta apenas o disponível via histórico
        
        // Registrar estorno
        await connection.query(
            `INSERT INTO estornos_contas_pagar 
             (conta_pagar_id, valor_estornado, motivo, 
              saldo_antes_reposicao, saldo_antes_lucro, 
              saldo_depois_reposicao, saldo_depois_lucro, 
              mes_estornado, usuario_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                contaId,
                valor_estornado,
                motivo.trim(),
                saldoAntesReposicao,
                saldoAntesLucro,
                saldoDepoisReposicao,
                saldoDepoisLucro,
                mesAnoAtual,
                usuario_id || null
            ]
        );
        
        // Atualizar valor total estornado na conta
        await connection.query(
            'UPDATE contas_pagar SET valor_estornado = valor_estornado + ? WHERE id = ?',
            [valor_estornado, contaId]
        );
        
        await connection.commit();
        
        console.log(`✅ Estorno registrado: Conta #${contaId}, Valor R$ ${valor_estornado}, Origem: ${origemEstorno}`);
        
        res.json({
            success: true,
            message: 'Estorno registrado com sucesso!',
            dados: {
                conta_id: contaId,
                valor_estornado: parseFloat(valor_estornado),
                origem_estorno: origemEstorno,
                saldos_atualizados: {
                    reposicao: saldoDepoisReposicao,
                    lucro: saldoDepoisLucro
                }
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('❌ Erro ao registrar estorno:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// Listar estornos de uma conta
router.get('/:id/estornos', async (req, res) => {
    try {
        const pool = getPool();
        const contaId = req.params.id;
        
        const [estornos] = await pool.query(
            `SELECT 
                e.*,
                u.nome as usuario_nome
             FROM estornos_contas_pagar e
             LEFT JOIN usuarios u ON e.usuario_id = u.id
             WHERE e.conta_pagar_id = ?
             ORDER BY e.data_estorno DESC`,
            [contaId]
        );
        
        res.json({ success: true, estornos: estornos });
    } catch (error) {
        console.error('Erro ao listar estornos:', error);
        res.status(500).json({ success: false, error: 'Erro ao listar estornos' });
    }
});

module.exports = router;
