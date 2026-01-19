const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// Função auxiliar para converter data para formato MySQL (mantém horário local)
function formatarDataMySQL(dataISO) {
    const data = new Date(dataISO);
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');
    const segundo = String(data.getSeconds()).padStart(2, '0');
    return `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
}

// Verificar status do caixa (se há caixa aberto)
router.get('/status', async (req, res) => {
    const pool = getPool();
    
    try {
        const [caixaAberto] = await pool.query(
            `SELECT 
                id,
                operador,
                data_hora_abertura as dataHoraAbertura,
                valor_abertura as valorAbertura,
                total_vendas as totalVendas,
                total_reforcos as totalReforcos,
                total_sangrias as totalSangrias,
                movimentacoes
            FROM caixa_aberto 
            LIMIT 1`
        );
        
        if (caixaAberto.length > 0) {
            const caixa = caixaAberto[0];
            // Parse do JSON de movimentações apenas se for string
            if (caixa.movimentacoes && typeof caixa.movimentacoes === 'string') {
                caixa.movimentacoes = JSON.parse(caixa.movimentacoes);
            }
            res.json({ aberto: true, caixa });
        } else {
            res.json({ aberto: false });
        }
        
    } catch (error) {
        console.error('Erro ao verificar status do caixa:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao verificar status: ' + error.message 
        });
    }
});

// Abrir caixa
router.post('/abrir', async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Verificar se já tem caixa aberto
        const [caixaExistente] = await connection.query('SELECT id FROM caixa_aberto LIMIT 1');
        
        if (caixaExistente.length > 0) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Já existe um caixa aberto' 
            });
        }
        
        const { operador, valorAbertura, dataHoraAbertura, movimentacoes } = req.body;
        const dataAberturaMySQL = formatarDataMySQL(dataHoraAbertura);
        
        // Inserir caixa aberto
        await connection.query(
            `INSERT INTO caixa_aberto 
            (operador, data_hora_abertura, valor_abertura, total_vendas, total_reforcos, total_sangrias, movimentacoes) 
            VALUES (?, ?, ?, 0, 0, 0, ?)`,
            [operador, dataAberturaMySQL, valorAbertura, JSON.stringify(movimentacoes || [])]
        );
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: 'Caixa aberto com sucesso' 
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao abrir caixa:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao abrir caixa: ' + error.message 
        });
    } finally {
        connection.release();
    }
});

// Atualizar caixa (reforço, sangria, venda)
router.put('/atualizar', async (req, res) => {
    const pool = getPool();
    
    try {
        const { totalVendas, totalReforcos, totalSangrias, movimentacoes } = req.body;
        
        await pool.query(
            `UPDATE caixa_aberto 
            SET total_vendas = ?, total_reforcos = ?, total_sangrias = ?, movimentacoes = ?`,
            [totalVendas, totalReforcos, totalSangrias, JSON.stringify(movimentacoes)]
        );
        
        res.json({ 
            success: true, 
            message: 'Caixa atualizado com sucesso' 
        });
        
    } catch (error) {
        console.error('Erro ao atualizar caixa:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao atualizar caixa: ' + error.message 
        });
    }
});

// Salvar fechamento de caixa
router.post('/fechamentos', async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { 
            operador, 
            dataHoraAbertura, 
            dataHoraFechamento,
            valorAbertura,
            totalVendas,
            totalReforcos,
            totalSangrias,
            saldoEsperado,
            saldoReal,
            diferenca,
            movimentacoes 
        } = req.body;
        
        // Converter datas para formato MySQL
        const dataAberturaMySQL = formatarDataMySQL(dataHoraAbertura);
        const dataFechamentoMySQL = formatarDataMySQL(dataHoraFechamento);
        
        // Inserir fechamento
        const [fechamentoResult] = await connection.query(
            `INSERT INTO fechamentos_caixa 
            (operador, data_hora_abertura, data_hora_fechamento, valor_abertura, 
             total_vendas, total_reforcos, total_sangrias, saldo_esperado, saldo_real, diferenca) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                operador,
                dataAberturaMySQL,
                dataFechamentoMySQL,
                valorAbertura,
                totalVendas,
                totalReforcos,
                totalSangrias,
                saldoEsperado,
                saldoReal,
                diferenca
            ]
        );
        
        const fechamentoId = fechamentoResult.insertId;
        
        // Inserir movimentações
        if (movimentacoes && movimentacoes.length > 0) {
            for (const mov of movimentacoes) {
                const dataHoraMySQL = formatarDataMySQL(mov.dataHora);
                await connection.query(
                    'INSERT INTO movimentacoes_caixa (fechamento_id, tipo, valor, observacao, data_hora) VALUES (?, ?, ?, ?, ?)',
                    [fechamentoId, mov.tipo, mov.valor || 0, mov.observacao || null, dataHoraMySQL]
                );
            }
        }
        
        // Deletar o caixa aberto após salvar o fechamento
        await connection.query('DELETE FROM caixa_aberto');
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: 'Fechamento salvo com sucesso',
            fechamentoId 
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao salvar fechamento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao salvar fechamento: ' + error.message 
        });
    } finally {
        connection.release();
    }
});

// Listar fechamentos
router.get('/fechamentos', async (req, res) => {
    const pool = getPool();
    
    try {
        const [fechamentos] = await pool.query(
            `SELECT 
                id,
                operador,
                data_hora_abertura as dataHoraAbertura,
                data_hora_fechamento as dataHoraFechamento,
                valor_abertura as valorAbertura,
                total_vendas as totalVendas,
                total_reforcos as totalReforcos,
                total_sangrias as totalSangrias,
                saldo_esperado as saldoEsperado,
                saldo_real as saldoReal,
                diferenca
            FROM fechamentos_caixa 
            ORDER BY data_hora_fechamento DESC
            LIMIT 100`
        );
        
        res.json({ success: true, fechamentos });
        
    } catch (error) {
        console.error('Erro ao listar fechamentos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao listar fechamentos: ' + error.message 
        });
    }
});

// Buscar detalhes de um fechamento específico
router.get('/fechamentos/:id', async (req, res) => {
    const pool = getPool();
    
    try {
        const { id } = req.params;
        
        // Buscar fechamento
        const [fechamentos] = await pool.query(
            `SELECT 
                id,
                operador,
                data_hora_abertura as dataHoraAbertura,
                data_hora_fechamento as dataHoraFechamento,
                valor_abertura as valorAbertura,
                total_vendas as totalVendas,
                total_reforcos as totalReforcos,
                total_sangrias as totalSangrias,
                saldo_esperado as saldoEsperado,
                saldo_real as saldoReal,
                diferenca
            FROM fechamentos_caixa 
            WHERE id = ?`,
            [id]
        );
        
        if (fechamentos.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Fechamento não encontrado' 
            });
        }
        
        // Buscar movimentações
        const [movimentacoes] = await pool.query(
            `SELECT 
                tipo,
                valor,
                observacao,
                data_hora as dataHora
            FROM movimentacoes_caixa 
            WHERE fechamento_id = ?
            ORDER BY data_hora ASC`,
            [id]
        );
        
        const fechamento = {
            ...fechamentos[0],
            movimentacoes
        };
        
        res.json({ success: true, fechamento });
        
    } catch (error) {
        console.error('Erro ao buscar fechamento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar fechamento: ' + error.message 
        });
    }
});

// Limpar histórico de fechamentos (cuidado!)
router.delete('/fechamentos', async (req, res) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // As movimentações serão deletadas automaticamente pelo CASCADE
        await connection.query('DELETE FROM fechamentos_caixa');
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: 'Histórico limpo com sucesso' 
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao limpar histórico:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao limpar histórico: ' + error.message 
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
