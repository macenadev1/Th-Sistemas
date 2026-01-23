const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Constantes
const SALT_ROUNDS = 10;
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutos
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
                     req.body.token;

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token não fornecido',
                requiresLogin: true 
            });
        }

        const pool = getPool();
        
        // Verificar sessão
        const [sessoes] = await pool.query(
            `SELECT s.*, u.nome, u.email, u.role, u.ativo 
             FROM sessoes s 
             JOIN usuarios u ON s.usuario_id = u.id 
             WHERE (s.token = ? OR s.remember_token = ?) 
             AND u.ativo = TRUE`,
            [token, token]
        );

        if (sessoes.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Sessão inválida ou expirada',
                requiresLogin: true 
            });
        }

        const sessao = sessoes[0];
        const agora = new Date();

        // Verificar expiração
        const isRememberToken = sessao.remember_token === token;
        const expiraEm = isRememberToken ? 
            new Date(sessao.remember_expira_em) : 
            new Date(sessao.expira_em);

        if (agora > expiraEm) {
            // Sessão expirada - deletar
            await pool.query('DELETE FROM sessoes WHERE id = ?', [sessao.id]);
            return res.status(401).json({ 
                success: false, 
                message: 'Sessão expirada',
                requiresLogin: true 
            });
        }

        // Renovar sessão normal (não remember)
        if (!isRememberToken) {
            const novaExpiracao = new Date(Date.now() + SESSION_DURATION);
            await pool.query(
                'UPDATE sessoes SET expira_em = ? WHERE id = ?',
                [novaExpiracao, sessao.id]
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
        const expiraEm = new Date(Date.now() + SESSION_DURATION);
        
        let rememberToken = null;
        let rememberExpiraEm = null;

        if (rememberMe) {
            rememberToken = generateToken();
            rememberExpiraEm = new Date(Date.now() + REMEMBER_DURATION);
        }

        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        await pool.query(
            `INSERT INTO sessoes 
            (id, usuario_id, token, remember_token, ip_address, user_agent, expira_em, remember_expira_em) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [sessionId, usuario.id, token, rememberToken, ipAddress, userAgent, expiraEm, rememberExpiraEm]
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
        const novaExpiracao = new Date(Date.now() + SESSION_DURATION);

        await pool.query(
            'UPDATE sessoes SET token = ?, expira_em = ? WHERE token = ?',
            [novoToken, novaExpiracao, token]
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
