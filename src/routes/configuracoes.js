const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

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
                    horasAlerta: config.horas_alerta
                }
            });
        } else {
            // Configurações padrão se não existir
            res.json({
                configuracoes: {
                    tipoAlerta: 'dia_diferente',
                    horasAlerta: 24
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
        const { tipoAlerta, horasAlerta } = req.body;
        
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
                'UPDATE configuracoes SET tipo_alerta = ?, horas_alerta = ?, data_atualizacao = NOW() WHERE id = 1',
                [tipoAlerta, horasAlerta || 24]
            );
        } else {
            // Inserir
            await pool.query(
                'INSERT INTO configuracoes (id, tipo_alerta, horas_alerta) VALUES (1, ?, ?)',
                [tipoAlerta, horasAlerta || 24]
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
