// ==================== MÓDULO DE AUTENTICAÇÃO ====================

// Definir API_URL globalmente se não existir (para tela de login standalone)
window.API_URL = window.API_URL || 'http://localhost:3000/api';

// Obter token armazenado
function getToken() {
    return localStorage.getItem('auth_token');
}

// Salvar token
function saveToken(token) {
    localStorage.setItem('auth_token', token);
}

// Remover token
function removeToken() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('usuario_logado');
}

// Obter dados do usuário logado
function getUsuarioLogado() {
    const usuario = localStorage.getItem('usuario_logado');
    return usuario ? JSON.parse(usuario) : null;
}

// Salvar dados do usuário
function saveUsuario(usuario) {
    localStorage.setItem('usuario_logado', JSON.stringify(usuario));
}

// Verificar se está autenticado
async function verificarAutenticacao() {
    const token = getToken();
    
    if (!token) {
        return false;
    }

    try {
        const response = await fetch(`${window.API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success && data.data) {
            saveUsuario(data.data);
            return true;
        } else {
            removeToken();
            return false;
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        removeToken();
        return false;
    }
}

// Redirecionar para login se não autenticado
async function requireAuth() {
    const autenticado = await verificarAutenticacao();
    
    if (!autenticado && window.location.pathname !== '/login.html') {
        window.location.href = '/login.html';
        return false;
    }
    
    return true;
}

// Fazer logout
async function logout() {
    const token = getToken();
    
    if (token) {
        try {
            await fetch(`${window.API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }
    
    removeToken();
    window.location.href = '/login.html';
}

// Função de notificação (reutilizável)
function mostrarNotificacao(mensagem, tipo = 'info') {
    const notif = document.getElementById('notification');
    if (!notif) return;
    
    notif.className = `notification ${tipo} active`;
    notif.textContent = mensagem;
    
    setTimeout(() => {
        notif.classList.remove('active');
    }, 3000);
}

// ==================== LÓGICA DE LOGIN ====================

if (window.location.pathname === '/login.html' || window.location.pathname.endsWith('/login.html')) {
    // Verificar se já está autenticado
    verificarAutenticacao().then(autenticado => {
        if (autenticado) {
            window.location.href = '/';
        }
    });

    // Form de login
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnLogin = document.getElementById('btnLogin');
            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('senha').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            if (!email || !senha) {
                mostrarNotificacao('Preencha todos os campos!', 'error');
                return;
            }

            // Desabilitar botão
            btnLogin.disabled = true;
            btnLogin.innerHTML = 'Entrando<span class="loading"></span>';

            try {
                const response = await fetch(`${window.API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, senha, rememberMe })
                });

                const data = await response.json();

                if (data.success) {
                    saveToken(data.data.token);
                    saveUsuario(data.data.usuario);
                    
                    mostrarNotificacao(`Bem-vindo, ${data.data.usuario.nome}!`, 'success');
                    
                    // Redirecionar após 500ms
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 500);
                } else {
                    mostrarNotificacao(data.message || 'Erro ao fazer login', 'error');
                    btnLogin.disabled = false;
                    btnLogin.innerHTML = 'Entrar';
                }
            } catch (error) {
                console.error('Erro ao fazer login:', error);
                mostrarNotificacao('Erro ao conectar ao servidor', 'error');
                btnLogin.disabled = false;
                btnLogin.innerHTML = 'Entrar';
            }
        });

        // Enter no campo de senha
        document.getElementById('senha').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    }
}

// ==================== VERIFICAÇÃO GLOBAL ====================

// Adicionar verificação em todas as páginas exceto login
if (window.location.pathname !== '/login.html' && !window.location.pathname.endsWith('/login.html')) {
    // Verificar autenticação ao carregar página
    document.addEventListener('DOMContentLoaded', async () => {
        const autenticado = await requireAuth();
        
        if (autenticado) {
            // Adicionar informações do usuário no header (se existir)
            const usuario = getUsuarioLogado();
            if (usuario) {
                atualizarInfoUsuario(usuario);
            }
        }
    });
}

// Atualizar informações do usuário na interface
function atualizarInfoUsuario(usuario) {
    // Verificar se existe elemento para mostrar usuário logado
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.innerHTML = `
            <span style="margin-right: 10px;">👤 ${usuario.nome}</span>
            <span style="background: ${usuario.role === 'admin' ? '#28a745' : '#667eea'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 10px;">
                ${usuario.role === 'admin' ? '👑 Admin' : '👨‍💼 Operador'}
            </span>
            <button onclick="logout()" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                Sair
            </button>
        `;
    }
}

// Adicionar Authorization header em todas as requisições fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const token = getToken();
    
    if (token && args[1]) {
        args[1].headers = args[1].headers || {};
        args[1].headers['Authorization'] = `Bearer ${token}`;
    } else if (token && !args[1]) {
        args[1] = {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
    }
    
    return originalFetch.apply(this, args).then(async response => {
        // Se retornar 401, fazer logout automático
        if (response.status === 401) {
            const data = await response.clone().json();
            if (data.requiresLogin) {
                removeToken();
                window.location.href = '/login.html';
            }
        }
        return response;
    });
};

// Exportar funções globalmente
window.logout = logout;
window.getUsuarioLogado = getUsuarioLogado;
window.verificarAutenticacao = verificarAutenticacao;
