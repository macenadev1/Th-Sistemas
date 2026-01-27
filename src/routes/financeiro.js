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
            LEFT JOIN categorias_financeiras cf ON cp.categoria_financeira_id = cf.id
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
            query += ' AND cp.categoria_financeira_id = ?';
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
            LEFT JOIN categorias_financeiras cf ON cp.categoria_financeira_id = cf.id
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
            categoria_financeira_id,
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
                categoria_financeira_id, 
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
            categoria_financeira_id || null,
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
            categoria_financeira_id,
            fornecedor_id,
            valor,
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
                categoria_financeira_id = ?,
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
            categoria_financeira_id || null,
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
        const [vendas] = await pool.query(`
            SELECT 
                COALESCE(SUM(v.total), 0) AS receita_bruta
            FROM vendas v
            WHERE YEAR(v.data_venda) = ? AND MONTH(v.data_venda) = ?
        `, [ano, mes]);
        
        const [custos] = await pool.query(`
            SELECT 
                COALESCE(SUM(iv.preco_custo_unitario * iv.quantidade), 0) AS custos_reposicao
            FROM itens_venda iv
            JOIN vendas v ON iv.venda_id = v.id
            WHERE YEAR(v.data_venda) = ? AND MONTH(v.data_venda) = ?
        `, [ano, mes]);
        
        const receitaBruta = parseFloat(vendas[0].receita_bruta) || 0;
        const custosReposicao = parseFloat(custos[0].custos_reposicao) || 0;
        const lucroBruto = receitaBruta - custosReposicao;
        
        // DEBUG: Log dos valores calculados
        console.log(`📊 Saldos ${ano}-${mes}:`);
        console.log(`   Receita bruta: R$ ${receitaBruta.toFixed(2)}`);
        console.log(`   Custos reposição: R$ ${custosReposicao.toFixed(2)}`);
        console.log(`   Lucro bruto: R$ ${lucroBruto.toFixed(2)}`);
        
        // 3. CALCULAR PAGAMENTOS REALIZADOS NO MÊS ATUAL (por origem)
        const dataAtual = new Date();
        const anoAtual = dataAtual.getFullYear();
        const mesAtual = dataAtual.getMonth() + 1;
        
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
        `, [anoAtual, mesAtual]);
        
        const pagamentosReposicao = pagamentos.find(p => p.origem_pagamento === 'reposicao')?.total_pago || 0;
        const pagamentosLucro = pagamentos.find(p => p.origem_pagamento === 'lucro')?.total_pago || 0;
        
        // 4. CALCULAR SALDOS DISPONÍVEIS
        const reposicaoBruta = saldoInicialReposicao + custosReposicao;
        const reposicaoDisponivel = reposicaoBruta - parseFloat(pagamentosReposicao);
        
        const lucroBrutaTotal = saldoInicialLucro + lucroBruto;
        const lucroDisponivel = lucroBrutaTotal - parseFloat(pagamentosLucro);
        
        res.json({
            success: true,
            mes_referencia: mesAno,
            saldos: {
                reposicao: {
                    saldo_inicial: saldoInicialReposicao,
                    custos_mes: custosReposicao,
                    bruta: reposicaoBruta,
                    pagamentos: parseFloat(pagamentosReposicao),
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
                    disponivel: lucroDisponivel,
                    negativo: lucroDisponivel < 0
                },
                receita_bruta: receitaBruta,
                mes_atual: `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
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
        
        // Buscar saldos do mês atual
        const [saldosResponse] = await pool.query(`
            SELECT 
                -- Saldo inicial manual
                COALESCE(si.saldo_reposicao, 0) as saldo_inicial_reposicao,
                COALESCE(si.saldo_lucro, 0) as saldo_inicial_lucro,
                -- Custos e receitas do mês
                COALESCE(SUM(iv.preco_custo_unitario * iv.quantidade), 0) AS custos_mes,
                COALESCE(SUM(iv.subtotal), 0) AS receita_mes
            FROM saldos_iniciais si
            LEFT JOIN vendas v ON YEAR(v.data_venda) = ? AND MONTH(v.data_venda) = ?
            LEFT JOIN itens_venda iv ON iv.venda_id = v.id
            WHERE si.mes_ano = ?
            GROUP BY si.saldo_reposicao, si.saldo_lucro
        `, [anoAtual, mesAtual, `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`]);
        
        const saldoInicialReposicao = saldosResponse.length > 0 ? parseFloat(saldosResponse[0].saldo_inicial_reposicao) : 0;
        const saldoInicialLucro = saldosResponse.length > 0 ? parseFloat(saldosResponse[0].saldo_inicial_lucro) : 0;
        const custosMes = saldosResponse.length > 0 ? parseFloat(saldosResponse[0].custos_mes) : 0;
        const receitaMes = saldosResponse.length > 0 ? parseFloat(saldosResponse[0].receita_mes) : 0;
        
        // Pagamentos já realizados no mês
        const [pagamentosRealizados] = await pool.query(`
            SELECT COALESCE(SUM(valor), 0) as total
            FROM contas_pagar
            WHERE status = 'pago'
            AND origem_pagamento = ?
            AND YEAR(data_pagamento) = ?
            AND MONTH(data_pagamento) = ?
        `, [origemFinal, anoAtual, mesAtual]);
        
        const totalPago = parseFloat(pagamentosRealizados[0].total) || 0;
        
        // Calcular saldo disponível
        let saldoDisponivel;
        if (origemFinal === 'reposicao') {
            saldoDisponivel = saldoInicialReposicao + custosMes - totalPago;
        } else {
            const lucroMes = receitaMes - custosMes;
            saldoDisponivel = saldoInicialLucro + lucroMes - totalPago;
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
        const mesReferenciaAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
        
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

module.exports = router;
