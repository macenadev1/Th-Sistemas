const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { getPool } = require('../config/database');
const { requireAuth, requireAdmin } = require('./auth');

const SALT_ROUNDS = 10;

async function contarAdminsAtivos(pool, excluirId = null) {
    let query = "SELECT COUNT(*) AS total FROM usuarios WHERE role = 'admin' AND ativo = TRUE";
    const params = [];

    if (excluirId) {
        query += ' AND id != ?';
        params.push(excluirId);
    }

    const [rows] = await pool.query(query, params);
    return rows[0]?.total || 0;
}

// Listar usuarios
router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const { busca, ativo, role } = req.query;

        let query = `
            SELECT id, nome, email, role, ativo, data_criacao, data_atualizacao
            FROM usuarios
            WHERE 1 = 1
        `;
        const params = [];

        if (busca) {
            query += ' AND (nome LIKE ? OR email LIKE ?)';
            const buscaParam = `%${busca}%`;
            params.push(buscaParam, buscaParam);
        }

        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo === 'true' ? 1 : 0);
        }

        if (role && ['admin', 'operador'].includes(role)) {
            query += ' AND role = ?';
            params.push(role);
        }

        query += ' ORDER BY nome ASC';

        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar usuários' });
    }
});

// Buscar usuario por id
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT id, nome, email, role, ativo, data_criacao, data_atualizacao
             FROM usuarios
             WHERE id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
    }
});

// Cadastrar usuario
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const { nome, email, senha, role = 'operador', ativo = true } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Email é obrigatório' });
        }

        if (!senha || senha.length < 6) {
            return res.status(400).json({ success: false, message: 'Senha deve ter pelo menos 6 caracteres' });
        }

        if (!['admin', 'operador'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Perfil inválido' });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const [existente] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [emailNormalizado]);
        if (existente.length > 0) {
            return res.status(400).json({ success: false, message: 'Email já cadastrado' });
        }

        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

        const [result] = await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash, role, ativo) VALUES (?, ?, ?, ?, ?)',
            [nome.trim(), emailNormalizado, senhaHash, role, ativo !== false ? 1 : 0]
        );

        res.json({
            success: true,
            message: 'Usuário cadastrado com sucesso',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar usuário' });
    }
});

// Atualizar usuario
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const usuarioId = Number(req.params.id);
        const { nome, email, senha, role, ativo } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Email é obrigatório' });
        }

        if (role && !['admin', 'operador'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Perfil inválido' });
        }

        if (senha && senha.length > 0 && senha.length < 6) {
            return res.status(400).json({ success: false, message: 'Senha deve ter pelo menos 6 caracteres' });
        }

        const [usuarios] = await pool.query('SELECT id, role, ativo FROM usuarios WHERE id = ?', [usuarioId]);
        if (usuarios.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        const usuarioAtual = usuarios[0];
        const emailNormalizado = email.trim().toLowerCase();
        const novoRole = role || usuarioAtual.role;
        const novoAtivo = ativo === undefined ? (usuarioAtual.ativo === 1 || usuarioAtual.ativo === true) : !!ativo;

        const [emailExistente] = await pool.query(
            'SELECT id FROM usuarios WHERE email = ? AND id != ?',
            [emailNormalizado, usuarioId]
        );
        if (emailExistente.length > 0) {
            return res.status(400).json({ success: false, message: 'Email já cadastrado para outro usuário' });
        }

        // Não permitir remover o último admin ativo.
        const deixaraDeSerAdmin = usuarioAtual.role === 'admin' && novoRole !== 'admin';
        const ficaraInativoSendoAdmin = usuarioAtual.role === 'admin' && !novoAtivo;
        if (deixaraDeSerAdmin || ficaraInativoSendoAdmin) {
            const outrosAdmins = await contarAdminsAtivos(pool, usuarioId);
            if (outrosAdmins === 0) {
                return res.status(400).json({ success: false, message: 'Não é possível remover o último administrador ativo' });
            }
        }

        // Não permitir auto-inativação.
        if (req.usuario.id === usuarioId && !novoAtivo) {
            return res.status(400).json({ success: false, message: 'Você não pode desativar seu próprio usuário' });
        }

        let query = 'UPDATE usuarios SET nome = ?, email = ?, role = ?, ativo = ?';
        const params = [nome.trim(), emailNormalizado, novoRole, novoAtivo ? 1 : 0];

        if (senha && senha.trim()) {
            const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
            query += ', senha_hash = ?';
            params.push(senhaHash);
        }

        query += ' WHERE id = ?';
        params.push(usuarioId);

        await pool.query(query, params);

        res.json({ success: true, message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar usuário' });
    }
});

// Desativar usuario (soft delete)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const usuarioId = Number(req.params.id);

        const [usuarios] = await pool.query('SELECT id, role, ativo FROM usuarios WHERE id = ?', [usuarioId]);
        if (usuarios.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        const usuario = usuarios[0];

        if (!(usuario.ativo === 1 || usuario.ativo === true)) {
            return res.json({ success: true, message: 'Usuário já está desativado' });
        }

        if (req.usuario.id === usuarioId) {
            return res.status(400).json({ success: false, message: 'Você não pode desativar seu próprio usuário' });
        }

        if (usuario.role === 'admin') {
            const outrosAdmins = await contarAdminsAtivos(pool, usuarioId);
            if (outrosAdmins === 0) {
                return res.status(400).json({ success: false, message: 'Não é possível desativar o último administrador ativo' });
            }
        }

        await pool.query('UPDATE usuarios SET ativo = FALSE WHERE id = ?', [usuarioId]);

        res.json({ success: true, message: 'Usuário desativado com sucesso' });
    } catch (error) {
        console.error('Erro ao desativar usuário:', error);
        res.status(500).json({ success: false, message: 'Erro ao desativar usuário' });
    }
});

module.exports = router;
