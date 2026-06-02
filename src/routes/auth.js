const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Constantes
const SALT_ROUNDS = 10;
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 horas
const REMEMBER_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 dias

// Gerar token aleatório
function generateToken() {
    return crypto.randomBytes(64).toString('hex');
}

// Middleware: Verificar autenticação
async function requireAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') || 
                     req.query.token || 
                     req.body?.token;

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token não fornecido',
                requiresLogin: true 
            });
        }

        const pool = getPool();
        
        // Verificar sessão e expiração no próprio MySQL para evitar problemas de timezone entre app e banco.
        const [sessoes] = await pool.query(
            `SELECT s.*, u.nome, u.email, u.role, u.ativo 
             FROM sessoes s 
             JOIN usuarios u ON s.usuario_id = u.id 
             WHERE (
                (s.token = ? AND s.expira_em > NOW())
                OR
                (s.remember_token = ? AND s.remember_expira_em > NOW())
             )
             AND u.ativo = TRUE`,
            [token, token]
        );

        if (sessoes.length === 0) {
            // Limpeza oportunista de possíveis sessões expiradas com este token.
            await pool.query('DELETE FROM sessoes WHERE token = ? OR remember_token = ?', [token, token]);
            return res.status(401).json({ 
                success: false, 
                message: 'Sessão inválida ou expirada',
                requiresLogin: true 
            });
        }

        const sessao = sessoes[0];
        const isRememberToken = sessao.remember_token === token;

        // Renovar sessão normal (não remember)
        if (!isRememberToken) {
            await pool.query(
                'UPDATE sessoes SET expira_em = DATE_ADD(NOW(), INTERVAL 12 HOUR) WHERE id = ?',
                [sessao.id]
            );
        }

        // Adicionar dados do usuário ao request
        req.usuario = {
            id: sessao.usuario_id,
            nome: sessao.nome,
            email: sessao.email,
            role: sessao.role
        };

        next();
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao verificar autenticação' 
        });
    }
}

// Middleware: Verificar se é admin
function requireAdmin(req, res, next) {
    if (req.usuario.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Acesso negado. Apenas administradores.' 
        });
    }
    next();
}

// POST /api/auth/login - Login
router.post('/login', async (req, res) => {
    const pool = getPool();
    
    try {
        const { email, senha, rememberMe } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email e senha são obrigatórios' 
            });
        }

        // Buscar usuário
        const [usuarios] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ? AND ativo = TRUE',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email ou senha incorretos' 
            });
        }

        const usuario = usuarios[0];

        // Verificar senha
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

        if (!senhaCorreta) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email ou senha incorretos' 
            });
        }

        // Criar sessão
        const sessionId = crypto.randomUUID();
        const token = generateToken();
        
        let rememberToken = null;

        if (rememberMe) {
            rememberToken = generateToken();
        }

        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        await pool.query(
            `INSERT INTO sessoes 
            (id, usuario_id, token, remember_token, ip_address, user_agent, expira_em, remember_expira_em) 
            VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 12 HOUR),
                CASE WHEN ? IS NULL THEN NULL ELSE DATE_ADD(NOW(), INTERVAL 30 DAY) END)`,
            [sessionId, usuario.id, token, rememberToken, ipAddress, userAgent, rememberToken]
        );

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                token: rememberMe ? rememberToken : token,
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    role: usuario.role
                },
                expiresIn: rememberMe ? REMEMBER_DURATION : SESSION_DURATION
            }
        });

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao fazer login' 
        });
    }
});

// POST /api/auth/logout - Logout
router.post('/logout', requireAuth, async (req, res) => {
    const pool = getPool();
    
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        await pool.query(
            'DELETE FROM sessoes WHERE token = ? OR remember_token = ?',
            [token, token]
        );

        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao fazer logout' 
        });
    }
});

// GET /api/auth/me - Obter dados do usuário logado
router.get('/me', requireAuth, (req, res) => {
    res.json({
        success: true,
        data: req.usuario
    });
});

// POST /api/auth/refresh - Renovar token
router.post('/refresh', requireAuth, async (req, res) => {
    const pool = getPool();
    
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        // Gerar novo token
        const novoToken = generateToken();
        await pool.query(
            'UPDATE sessoes SET token = ?, expira_em = DATE_ADD(NOW(), INTERVAL 12 HOUR) WHERE token = ? OR remember_token = ?',
            [novoToken, token, token]
        );

        res.json({
            success: true,
            data: {
                token: novoToken,
                expiresIn: SESSION_DURATION
            }
        });

    } catch (error) {
        console.error('Erro ao renovar token:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao renovar token' 
        });
    }
});

// POST /api/auth/usuarios - Criar usuário (apenas admin)
router.post('/usuarios', requireAuth, requireAdmin, async (req, res) => {
    const pool = getPool();

    try {
        const { nome, email, senha, role } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                success: false,
                message: 'Nome, email e senha são obrigatórios'
            });
        }

        const emailNormalizado = String(email).trim().toLowerCase();
        const nomeNormalizado = String(nome).trim();
        const roleNormalizado = role === 'admin' ? 'admin' : 'operador';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailNormalizado)) {
            return res.status(400).json({
                success: false,
                message: 'Email inválido'
            });
        }

        if (String(senha).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'A senha deve ter pelo menos 6 caracteres'
            });
        }

        const [existente] = await pool.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [emailNormalizado]
        );

        if (existente.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Já existe um usuário com este email'
            });
        }

        const senhaHash = await bcrypt.hash(String(senha), SALT_ROUNDS);

        const [result] = await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash, role, ativo) VALUES (?, ?, ?, ?, TRUE)',
            [nomeNormalizado, emailNormalizado, senhaHash, roleNormalizado]
        );

        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            data: {
                id: result.insertId,
                nome: nomeNormalizado,
                email: emailNormalizado,
                role: roleNormalizado
            }
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar usuário'
        });
    }
});

// Limpar sessões expiradas (executar periodicamente)
async function limparSessoesExpiradas() {
    try {
        const pool = getPool();
        const agora = new Date();
        
        await pool.query(
            'DELETE FROM sessoes WHERE expira_em < ? AND (remember_expira_em IS NULL OR remember_expira_em < ?)',
            [agora, agora]
        );
    } catch (error) {
        console.error('Erro ao limpar sessões expiradas:', error);
    }
}

// Executar limpeza a cada hora
setInterval(limparSessoesExpiradas, 60 * 60 * 1000);

// Exportar middlewares e rotas
module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireAdmin = requireAdmin;
