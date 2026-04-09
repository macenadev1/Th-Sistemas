const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const { requireAuth } = require('./auth');

function toMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round(number * 100) / 100;
}

function calcularLiquido(salarioBase, bonificacao, descontoManual) {
    return toMoney(toMoney(salarioBase) + toMoney(bonificacao) - toMoney(descontoManual));
}

function contarDiasTrabalhoSegASab(dataInicio, dataFim) {
    const inicio = toDateOnly(dataInicio);
    const fim = toDateOnly(dataFim);
    if (!inicio || !fim || inicio > fim) return 0;

    let total = 0;
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());

    while (cursor <= fim) {
        const diaSemana = cursor.getDay();
        // 0 = domingo, 1..6 = segunda..sabado
        if (diaSemana !== 0) {
            total += 1;
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return total;
}

function toDateOnly(input) {
    if (input instanceof Date && !Number.isNaN(input.getTime())) {
        return new Date(input.getFullYear(), input.getMonth(), input.getDate());
    }

    const raw = String(input || '').trim();
    if (!raw) return null;

    // Formato ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        const value = raw.slice(0, 10);
        const dt = new Date(`${value}T00:00:00`);
        if (!Number.isNaN(dt.getTime())) return dt;
    }

    // Formato BR: DD/MM/YYYY
    const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) {
        const dia = Number(br[1]);
        const mes = Number(br[2]);
        const ano = Number(br[3]);
        const dt = new Date(ano, mes - 1, dia);
        if (!Number.isNaN(dt.getTime())) return dt;
    }

    return null;
}

function calcularSalarioProporcional(salarioIntegral, dataAdmissao, ano, mes, diasPeriodo) {
    const admissao = toDateOnly(dataAdmissao);
    if (!admissao) {
        return {
            diasTrabalhados: diasPeriodo,
            salarioProporcional: toMoney(salarioIntegral)
        };
    }

    const entrouNoMesCompetencia = admissao.getFullYear() === ano && (admissao.getMonth() + 1) === mes;

    if (!entrouNoMesCompetencia) {
        return {
            diasTrabalhados: diasPeriodo,
            salarioProporcional: toMoney(salarioIntegral)
        };
    }

    const diaAdmissao = admissao.getDate();
    const diasTrabalhados = Math.max(1, diasPeriodo - diaAdmissao + 1);
    const salarioProporcional = toMoney((toMoney(salarioIntegral) * diasTrabalhados) / diasPeriodo);

    return {
        diasTrabalhados,
        salarioProporcional
    };
}

function calcularSalarioProporcionalSegASab(salarioIntegral, dataAdmissao, dataInicioPeriodo, dataFimPeriodo) {
    const diasPeriodo = contarDiasTrabalhoSegASab(dataInicioPeriodo, dataFimPeriodo);
    if (diasPeriodo <= 0) {
        return {
            diasPeriodo: 0,
            diasTrabalhados: 0,
            salarioProporcional: 0
        };
    }

    const admissao = toDateOnly(dataAdmissao);
    const inicio = toDateOnly(dataInicioPeriodo);
    const fim = toDateOnly(dataFimPeriodo);

    if (!admissao || !inicio || !fim) {
        return {
            diasPeriodo,
            diasTrabalhados: diasPeriodo,
            salarioProporcional: toMoney(salarioIntegral)
        };
    }

    const inicioTrabalho = admissao > inicio ? admissao : inicio;
    const diasTrabalhados = contarDiasTrabalhoSegASab(inicioTrabalho, fim);
    const salarioProporcional = toMoney((toMoney(salarioIntegral) * diasTrabalhados) / diasPeriodo);

    return {
        diasPeriodo,
        diasTrabalhados,
        salarioProporcional
    };
}

router.get('/', requireAuth, async (req, res) => {
    try {
        const pool = getPool();
        const { ano, status } = req.query;

        let query = `
            SELECT
                f.*,
                u.nome AS usuario_nome,
                COUNT(i.id) AS total_funcionarios,
                SUM(CASE WHEN i.pago = TRUE THEN 1 ELSE 0 END) AS total_pagos
            FROM folha_pagamento f
            LEFT JOIN usuarios u ON f.usuario_id = u.id
            LEFT JOIN itens_folha_pagamento i ON i.folha_id = f.id
            WHERE 1=1
        `;
        const params = [];

        if (ano) {
            query += ' AND f.ano = ?';
            params.push(Number(ano));
        }

        if (status) {
            query += ' AND f.status = ?';
            params.push(status);
        }

        query += ' GROUP BY f.id, u.nome ORDER BY f.ano DESC, f.mes DESC';

        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao listar folhas:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar folhas' });
    }
});

router.get('/:id/detalhes', requireAuth, async (req, res) => {
    try {
        const pool = getPool();

        const [folhaRows] = await pool.query(
            `SELECT id, mes, ano, status, total_bruto, total_descontos, total_liquido, data_geracao, data_pagamento
             FROM folha_pagamento
             WHERE id = ?`,
            [req.params.id]
        );

        if (folhaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Folha não encontrada' });
        }

        const [itens] = await pool.query(
            `SELECT
                i.id,
                i.funcionario_id,
                fn.nome AS funcionario_nome,
                fn.data_admissao,
                i.salario_base_integral,
                i.salario_base,
                i.dias_periodo,
                i.dias_trabalhados,
                i.bonificacao,
                i.desconto_manual,
                i.total_descontos,
                i.liquido,
                i.observacoes,
                i.pago,
                i.conta_pagar_id
             FROM itens_folha_pagamento i
             INNER JOIN funcionarios fn ON fn.id = i.funcionario_id
             WHERE i.folha_id = ?
             ORDER BY fn.nome ASC`,
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                folha: folhaRows[0],
                itens
            }
        });
    } catch (error) {
        console.error('Erro ao buscar detalhes da folha:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar detalhes da folha' });
    }
});

router.post('/gerar', requireAuth, async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        const { mes, ano, dia_fechamento } = req.body;

        const mesNum = Number(mes);
        const anoNum = Number(ano);

        if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
            return res.status(400).json({ success: false, message: 'Mês inválido' });
        }

        if (!Number.isInteger(anoNum) || anoNum < 2020 || anoNum > 2100) {
            return res.status(400).json({ success: false, message: 'Ano inválido' });
        }

        await connection.beginTransaction();

        const [existing] = await connection.query(
            'SELECT id FROM folha_pagamento WHERE mes = ? AND ano = ? FOR UPDATE',
            [mesNum, anoNum]
        );

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Já existe folha para este mês/ano' });
        }

        const ultimoDiaMes = new Date(anoNum, mesNum, 0);
        const maxDiasMes = ultimoDiaMes.getDate();
        const diaFechamento = Number.isInteger(Number(dia_fechamento))
            ? Math.min(Math.max(Number(dia_fechamento), 1), maxDiasMes)
            : maxDiasMes;
        const dataInicioPeriodo = `${anoNum}-${String(mesNum).padStart(2, '0')}-01`;
        const dataFimPeriodo = `${anoNum}-${String(mesNum).padStart(2, '0')}-${String(diaFechamento).padStart(2, '0')}`;
        const diasPeriodo = contarDiasTrabalhoSegASab(dataInicioPeriodo, dataFimPeriodo);
        const dataReferencia = `${anoNum}-${String(mesNum).padStart(2, '0')}-${String(diaFechamento).padStart(2, '0')}`;

        const [funcionarios] = await connection.query(
            `SELECT id, nome, data_admissao, salario_base
             FROM funcionarios
             WHERE ativo = TRUE AND data_admissao <= ?
             ORDER BY nome ASC`,
            [dataReferencia]
        );

        if (funcionarios.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Nenhum funcionário ativo para gerar folha no período' });
        }

        const [folhaResult] = await connection.query(
            `INSERT INTO folha_pagamento (
                mes,
                ano,
                status,
                total_bruto,
                total_descontos,
                total_liquido,
                usuario_id
            ) VALUES (?, ?, 'rascunho', 0, 0, 0, ?)`,
            [mesNum, anoNum, req.usuario.id]
        );

        const folhaId = folhaResult.insertId;

        let totalBruto = 0;
        let totalDescontos = 0;
        let totalLiquido = 0;

        for (const funcionario of funcionarios) {
            const salarioIntegral = toMoney(funcionario.salario_base);
            const proporcional = calcularSalarioProporcionalSegASab(
                salarioIntegral,
                funcionario.data_admissao,
                dataInicioPeriodo,
                dataFimPeriodo
            );
            const salarioBase = proporcional.salarioProporcional;
            const bonificacao = 0;
            const descontoManual = 0;
            const liquido = calcularLiquido(salarioBase, bonificacao, descontoManual);
            const observacaoAdmissao = proporcional.diasTrabalhados < diasPeriodo
                ? `Admissao no mes: ${proporcional.diasTrabalhados}/${diasPeriodo} dias (seg-sab) considerados`
                : null;

            totalBruto += salarioBase + bonificacao;
            totalDescontos += descontoManual;
            totalLiquido += liquido;

            await connection.query(
                `INSERT INTO itens_folha_pagamento (
                    folha_id,
                    funcionario_id,
                    salario_base_integral,
                    salario_base,
                    dias_periodo,
                    dias_trabalhados,
                    bonificacao,
                    desconto_manual,
                    total_descontos,
                    liquido,
                    observacoes,
                    pago
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
                [
                    folhaId,
                    funcionario.id,
                    salarioIntegral,
                    salarioBase,
                    diasPeriodo,
                    proporcional.diasTrabalhados,
                    bonificacao,
                    descontoManual,
                    descontoManual,
                    liquido,
                    observacaoAdmissao
                ]
            );
        }

        await connection.query(
            `UPDATE folha_pagamento
             SET total_bruto = ?, total_descontos = ?, total_liquido = ?
             WHERE id = ?`,
            [toMoney(totalBruto), toMoney(totalDescontos), toMoney(totalLiquido), folhaId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Folha gerada com sucesso',
            data: { id: folhaId }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao gerar folha:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar folha' });
    } finally {
        connection.release();
    }
});

router.put('/:id/item/:itemId', requireAuth, async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        const { bonificacao, desconto_manual, observacoes } = req.body;

        await connection.beginTransaction();

        const [folhaRows] = await connection.query(
            'SELECT id, status FROM folha_pagamento WHERE id = ? FOR UPDATE',
            [req.params.id]
        );

        if (folhaRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Folha não encontrada' });
        }

        if (folhaRows[0].status !== 'rascunho') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Apenas folhas em rascunho podem ser editadas' });
        }

        const [itemRows] = await connection.query(
            `SELECT id, salario_base
             FROM itens_folha_pagamento
             WHERE id = ? AND folha_id = ? FOR UPDATE`,
            [req.params.itemId, req.params.id]
        );

        if (itemRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Item da folha não encontrado' });
        }

        const salarioBase = toMoney(itemRows[0].salario_base);
        const bonus = toMoney(bonificacao);
        const desconto = toMoney(desconto_manual);

        if (desconto < 0 || bonus < 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Bonificação e desconto devem ser maiores ou iguais a zero' });
        }

        const liquido = calcularLiquido(salarioBase, bonus, desconto);

        await connection.query(
            `UPDATE itens_folha_pagamento
             SET bonificacao = ?, desconto_manual = ?, total_descontos = ?, liquido = ?, observacoes = ?
             WHERE id = ?`,
            [bonus, desconto, desconto, liquido, observacoes || null, req.params.itemId]
        );

        const [totalsRows] = await connection.query(
            `SELECT
                COALESCE(SUM(salario_base + bonificacao), 0) AS total_bruto,
                COALESCE(SUM(total_descontos), 0) AS total_descontos,
                COALESCE(SUM(liquido), 0) AS total_liquido
             FROM itens_folha_pagamento
             WHERE folha_id = ?`,
            [req.params.id]
        );

        await connection.query(
            `UPDATE folha_pagamento
             SET total_bruto = ?, total_descontos = ?, total_liquido = ?
             WHERE id = ?`,
            [
                toMoney(totalsRows[0].total_bruto),
                toMoney(totalsRows[0].total_descontos),
                toMoney(totalsRows[0].total_liquido),
                req.params.id
            ]
        );

        await connection.commit();
        res.json({ success: true, message: 'Item da folha atualizado com sucesso' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao atualizar item da folha:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar item da folha' });
    } finally {
        connection.release();
    }
});

router.put('/:id/fechar', requireAuth, async (req, res) => {
    try {
        const pool = getPool();

        const [result] = await pool.query(
            `UPDATE folha_pagamento
             SET status = 'fechada'
             WHERE id = ? AND status = 'rascunho'`,
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'Folha não encontrada ou não está em rascunho' });
        }

        res.json({ success: true, message: 'Folha fechada com sucesso' });
    } catch (error) {
        console.error('Erro ao fechar folha:', error);
        res.status(500).json({ success: false, message: 'Erro ao fechar folha' });
    }
});

router.put('/:id/recalcular-proporcional', requireAuth, async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        const diaFechamentoBody = Number(req.body?.dia_fechamento);
        await connection.beginTransaction();

        const [folhaRows] = await connection.query(
            `SELECT id, mes, ano, status
             FROM folha_pagamento
             WHERE id = ? FOR UPDATE`,
            [req.params.id]
        );

        if (folhaRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Folha não encontrada' });
        }

        const folha = folhaRows[0];
        if (folha.status !== 'rascunho') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Só é possível recalcular folha em rascunho' });
        }

        const ultimoDiaMes = new Date(Number(folha.ano), Number(folha.mes), 0);
        const maxDiasMes = ultimoDiaMes.getDate();
        const diaFechamento = Number.isInteger(diaFechamentoBody)
            ? Math.min(Math.max(diaFechamentoBody, 1), maxDiasMes)
            : null;
        const dataInicioPeriodo = `${folha.ano}-${String(folha.mes).padStart(2, '0')}-01`;
        const dataFimPeriodo = diaFechamento
            ? `${folha.ano}-${String(folha.mes).padStart(2, '0')}-${String(diaFechamento).padStart(2, '0')}`
            : null;

        const [itens] = await connection.query(
            `SELECT
                i.id,
                i.funcionario_id,
                i.salario_base_integral,
                i.dias_periodo,
                i.bonificacao,
                i.desconto_manual,
                fn.data_admissao
             FROM itens_folha_pagamento i
             INNER JOIN funcionarios fn ON fn.id = i.funcionario_id
             WHERE i.folha_id = ? FOR UPDATE`,
            [req.params.id]
        );

        let totalBruto = 0;
        let totalDescontos = 0;
        let totalLiquido = 0;

        for (const item of itens) {
            const salarioIntegral = toMoney(item.salario_base_integral);
            const proporcional = dataFimPeriodo
                ? calcularSalarioProporcionalSegASab(
                    salarioIntegral,
                    item.data_admissao,
                    dataInicioPeriodo,
                    dataFimPeriodo
                )
                : {
                    diasPeriodo: Number(item.dias_periodo) > 0 ? Number(item.dias_periodo) : 30,
                    diasTrabalhados: Number(item.dias_trabalhados) > 0 ? Number(item.dias_trabalhados) : (Number(item.dias_periodo) > 0 ? Number(item.dias_periodo) : 30),
                    salarioProporcional: toMoney(item.salario_base)
                };

            const diasPeriodo = proporcional.diasPeriodo;

            const salarioBase = proporcional.salarioProporcional;
            const bonificacao = toMoney(item.bonificacao);
            const desconto = toMoney(item.desconto_manual);
            const liquido = calcularLiquido(salarioBase, bonificacao, desconto);

            totalBruto += salarioBase + bonificacao;
            totalDescontos += desconto;
            totalLiquido += liquido;

            await connection.query(
                `UPDATE itens_folha_pagamento
                 SET salario_base = ?,
                     dias_periodo = ?,
                     dias_trabalhados = ?,
                     total_descontos = ?,
                     liquido = ?,
                     observacoes = ?
                 WHERE id = ?`,
                [
                    salarioBase,
                    diasPeriodo,
                    proporcional.diasTrabalhados,
                    desconto,
                    liquido,
                    proporcional.diasTrabalhados < diasPeriodo
                        ? `Admissao no mes: ${proporcional.diasTrabalhados}/${diasPeriodo} dias (seg-sab) considerados`
                        : null,
                    item.id
                ]
            );
        }

        await connection.query(
            `UPDATE folha_pagamento
             SET total_bruto = ?, total_descontos = ?, total_liquido = ?
             WHERE id = ?`,
            [toMoney(totalBruto), toMoney(totalDescontos), toMoney(totalLiquido), req.params.id]
        );

        await connection.commit();
        res.json({ success: true, message: 'Folha recalculada com proporcionalidade de admissão' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao recalcular folha:', error);
        res.status(500).json({ success: false, message: 'Erro ao recalcular folha' });
    } finally {
        connection.release();
    }
});

router.put('/:id/pagar', requireAuth, async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        const { data_vencimento, origem_pagamento } = req.body;

        if (origem_pagamento && !['reposicao', 'lucro'].includes(origem_pagamento)) {
            return res.status(400).json({ success: false, message: 'Origem de pagamento inválida' });
        }

        await connection.beginTransaction();

        const [folhaRows] = await connection.query(
            `SELECT id, mes, ano, status
             FROM folha_pagamento
             WHERE id = ? FOR UPDATE`,
            [req.params.id]
        );

        if (folhaRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Folha não encontrada' });
        }

        const folha = folhaRows[0];
        if (folha.status !== 'fechada') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Somente folhas fechadas podem ser pagas' });
        }

        const [itens] = await connection.query(
            `SELECT i.id, i.funcionario_id, i.liquido, i.pago, fn.nome AS funcionario_nome
             FROM itens_folha_pagamento i
             INNER JOIN funcionarios fn ON fn.id = i.funcionario_id
             WHERE i.folha_id = ? FOR UPDATE`,
            [req.params.id]
        );

        const itensPendentes = itens.filter(item => !item.pago);
        if (itensPendentes.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Todos os salários desta folha já foram pagos' });
        }

        const categoriaSalarioQuery = await connection.query(
            `SELECT id FROM categorias_financeiras
             WHERE nome = 'Salários' AND tipo = 'despesa'
             LIMIT 1`
        );
        const categoriaSalariosId = categoriaSalarioQuery[0].length > 0 ? categoriaSalarioQuery[0][0].id : null;

        const vencimento = data_vencimento || `${folha.ano}-${String(folha.mes).padStart(2, '0')}-10`;
        const mesReferencia = `${folha.ano}-${String(folha.mes).padStart(2, '0')}-01`;
        const origem = origem_pagamento || 'lucro';

        for (const item of itensPendentes) {
            const descricao = `Salário ${item.funcionario_nome} - ${String(folha.mes).padStart(2, '0')}/${folha.ano}`;

            const [contaResult] = await connection.query(
                `INSERT INTO contas_pagar (
                    descricao,
                    valor,
                    data_vencimento,
                    status,
                    categoria_id,
                    origem_pagamento,
                    mes_referencia,
                    observacoes,
                    usuario_id
                ) VALUES (?, ?, ?, 'pago', ?, ?, ?, ?, ?)`,
                [
                    descricao,
                    toMoney(item.liquido),
                    vencimento,
                    categoriaSalariosId,
                    origem,
                    mesReferencia,
                    `Gerado automaticamente pela folha #${folha.id}`,
                    req.usuario.id
                ]
            );

            await connection.query(
                `UPDATE contas_pagar
                 SET data_pagamento = CURDATE()
                 WHERE id = ?`,
                [contaResult.insertId]
            );

            await connection.query(
                `UPDATE itens_folha_pagamento
                 SET pago = TRUE, conta_pagar_id = ?
                 WHERE id = ?`,
                [contaResult.insertId, item.id]
            );
        }

        await connection.query(
            `UPDATE folha_pagamento
             SET status = 'paga', data_pagamento = CURDATE()
             WHERE id = ?`,
            [req.params.id]
        );

        await connection.commit();

        res.json({ success: true, message: 'Folha paga com sucesso e lançada em contas a pagar' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao pagar folha:', error);
        res.status(500).json({ success: false, message: 'Erro ao pagar folha' });
    } finally {
        connection.release();
    }
});

module.exports = router;
