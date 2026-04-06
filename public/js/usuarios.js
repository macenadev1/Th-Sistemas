// ==================== GERENCIAMENTO DE USUARIOS ====================

function getUsuarioLogadoSeguro() {
    if (typeof window.getUsuarioLogado === 'function') {
        return window.getUsuarioLogado();
    }
    return null;
}

function usuarioLogadoEhAdmin() {
    const usuario = getUsuarioLogadoSeguro();
    return !!usuario && usuario.role === 'admin';
}

function protegerAcessoUsuariosNoMenu() {
    const menuUsuarios = document.getElementById('menuUsuariosItem');
    if (!menuUsuarios) return;

    if (!usuarioLogadoEhAdmin()) {
        menuUsuarios.style.display = 'none';
    }
}

async function carregarUsuariosSection() {
    const content = document.getElementById('usuarios-content');
    if (!content) return;

    if (!usuarioLogadoEhAdmin()) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔒</div>
                <p>Acesso restrito</p>
                <p style="font-size: 14px; margin-top: 10px;">Apenas administradores podem gerenciar usuários.</p>
            </div>
        `;
        return;
    }

    content.innerHTML = '<p style="text-align: center; padding: 20px;">Carregando usuários...</p>';

    try {
        const response = await fetch(`${API_URL}/usuarios`);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Erro ao carregar usuários');
        }

        const usuarios = result.data || [];

        content.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap;">
                <input
                    type="text"
                    id="filtroBuscaUsuarioERP"
                    placeholder="🔍 Buscar por nome ou email..."
                    onkeyup="aplicarFiltrosUsuariosERP()"
                    style="flex: 1; min-width: 260px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">

                <select id="filtroRoleUsuarioERP" onchange="aplicarFiltrosUsuariosERP()" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    <option value="todos">Todos os Perfis</option>
                    <option value="admin">Administradores</option>
                    <option value="operador">Operadores</option>
                </select>

                <select id="filtroStatusUsuarioERP" onchange="aplicarFiltrosUsuariosERP()" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    <option value="todos">Todos os Status</option>
                    <option value="ativo" selected>Ativos</option>
                    <option value="inativo">Inativos</option>
                </select>

                <button onclick="limparFiltrosUsuariosERP()" class="btn" style="background: #6c757d; color: white; padding: 12px 20px;">
                    🔄 Limpar Filtros
                </button>
            </div>

            <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <strong id="contadorUsuariosERP">0 usuário(s) encontrado(s)</strong>
            </div>

            <div id="listaUsuariosERP" style="display: grid; gap: 10px;"></div>
        `;

        window.usuariosERPCompletos = usuarios;
        aplicarFiltrosUsuariosERP();
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar usuários</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                <button onclick="carregarUsuariosSection()" class="btn btn-primary" style="margin-top: 20px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function aplicarFiltrosUsuariosERP() {
    if (!window.usuariosERPCompletos) return;

    const busca = document.getElementById('filtroBuscaUsuarioERP')?.value.toLowerCase() || '';
    const role = document.getElementById('filtroRoleUsuarioERP')?.value || 'todos';
    const status = document.getElementById('filtroStatusUsuarioERP')?.value || 'todos';

    let usuariosFiltrados = [...window.usuariosERPCompletos];

    if (busca) {
        usuariosFiltrados = usuariosFiltrados.filter(usuario =>
            usuario.nome.toLowerCase().includes(busca) ||
            usuario.email.toLowerCase().includes(busca)
        );
    }

    if (role !== 'todos') {
        usuariosFiltrados = usuariosFiltrados.filter(usuario => usuario.role === role);
    }

    if (status !== 'todos') {
        usuariosFiltrados = usuariosFiltrados.filter(usuario => {
            const ativo = usuario.ativo === 1 || usuario.ativo === true;
            return status === 'ativo' ? ativo : !ativo;
        });
    }

    const contador = document.getElementById('contadorUsuariosERP');
    if (contador) {
        contador.textContent = `${usuariosFiltrados.length} usuário(s) encontrado(s)`;
    }

    renderizarUsuariosERP(usuariosFiltrados);
}

function renderizarUsuariosERP(usuarios) {
    const container = document.getElementById('listaUsuariosERP');
    if (!container) return;

    if (usuarios.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhum usuário encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        return;
    }

    container.innerHTML = usuarios.map(usuario => {
        const ativo = usuario.ativo === 1 || usuario.ativo === true;
        const statusCor = ativo ? '#28a745' : '#dc3545';
        const statusTexto = ativo ? '✓ Ativo' : '✗ Inativo';
        const roleCor = usuario.role === 'admin' ? '#6f42c1' : '#007bff';
        const roleTexto = usuario.role === 'admin' ? '👑 Admin' : '👨‍💼 Operador';

        return `
            <div onclick="abrirEdicaoUsuario(${usuario.id})" style="
                background: white;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #6f42c1;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.transform='translateX(4px)'"
               onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; this.style.transform='translateX(0)'">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
                        <strong style="font-size: 18px;">${usuario.nome}</strong>
                        <span style="background: ${roleCor}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">${roleTexto}</span>
                        <span style="background: ${statusCor}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">${statusTexto}</span>
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        <span>✉️ ${usuario.email}</span>
                    </div>
                </div>
                <div style="color: #6f42c1; font-size: 24px;">✏️</div>
            </div>
        `;
    }).join('');
}

function limparFiltrosUsuariosERP() {
    const busca = document.getElementById('filtroBuscaUsuarioERP');
    const role = document.getElementById('filtroRoleUsuarioERP');
    const status = document.getElementById('filtroStatusUsuarioERP');

    if (busca) busca.value = '';
    if (role) role.value = 'todos';
    if (status) status.value = 'ativo';

    aplicarFiltrosUsuariosERP();
}

function abrirCadastroUsuario() {
    if (!usuarioLogadoEhAdmin()) {
        mostrarNotificacao('Apenas administrador pode cadastrar usuário', 'error');
        return;
    }

    abrirModal('cadastroUsuarioModal', () => {
        document.getElementById('formCadastroUsuario').reset();
        document.getElementById('roleUsuario').value = 'operador';
        document.getElementById('ativoUsuario').value = 'true';
        document.getElementById('nomeUsuario').focus();
    });
}

async function salvarUsuario(event) {
    event.preventDefault();

    const dados = {
        nome: document.getElementById('nomeUsuario').value.trim(),
        email: document.getElementById('emailUsuario').value.trim(),
        senha: document.getElementById('senhaUsuario').value,
        role: document.getElementById('roleUsuario').value,
        ativo: document.getElementById('ativoUsuario').value === 'true'
    };

    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Erro ao cadastrar usuário');
        }

        mostrarNotificacao('✓ Usuário cadastrado com sucesso!', 'success');
        fecharModal('cadastroUsuarioModal');
        await carregarUsuariosSection();
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

async function abrirEdicaoUsuario(id) {
    if (!usuarioLogadoEhAdmin()) {
        mostrarNotificacao('Apenas administrador pode editar usuário', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`);
        const result = await response.json();

        if (!response.ok || !result.success || !result.data) {
            throw new Error(result.message || 'Usuário não encontrado');
        }

        const usuario = result.data;

        document.getElementById('editarIdUsuario').value = usuario.id;
        document.getElementById('editarNomeUsuario').value = usuario.nome || '';
        document.getElementById('editarEmailUsuario').value = usuario.email || '';
        document.getElementById('editarRoleUsuario').value = usuario.role || 'operador';
        document.getElementById('editarAtivoUsuario').value = (usuario.ativo === 1 || usuario.ativo === true) ? 'true' : 'false';
        document.getElementById('editarSenhaUsuario').value = '';

        abrirModal('editarUsuarioModal', () => {
            document.getElementById('editarNomeUsuario').focus();
        });
    } catch (error) {
        console.error('Erro ao abrir edição de usuário:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

async function salvarEdicaoUsuario(event) {
    event.preventDefault();

    const id = document.getElementById('editarIdUsuario').value;
    const senha = document.getElementById('editarSenhaUsuario').value;

    const dados = {
        nome: document.getElementById('editarNomeUsuario').value.trim(),
        email: document.getElementById('editarEmailUsuario').value.trim(),
        role: document.getElementById('editarRoleUsuario').value,
        ativo: document.getElementById('editarAtivoUsuario').value === 'true'
    };

    if (senha && senha.trim()) {
        dados.senha = senha;
    }

    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Erro ao atualizar usuário');
        }

        mostrarNotificacao('✓ Usuário atualizado com sucesso!', 'success');
        fecharModal('editarUsuarioModal');
        await carregarUsuariosSection();
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

async function desativarUsuarioEdicao() {
    const id = document.getElementById('editarIdUsuario').value;
    const nome = document.getElementById('editarNomeUsuario').value;

    if (!id) return;

    if (!confirm(`Deseja desativar o usuário "${nome}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Erro ao desativar usuário');
        }

        mostrarNotificacao('✓ Usuário desativado com sucesso!', 'success');
        fecharModal('editarUsuarioModal');
        await carregarUsuariosSection();
    } catch (error) {
        console.error('Erro ao desativar usuário:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    protegerAcessoUsuariosNoMenu();
});

window.carregarUsuariosSection = carregarUsuariosSection;
window.aplicarFiltrosUsuariosERP = aplicarFiltrosUsuariosERP;
window.limparFiltrosUsuariosERP = limparFiltrosUsuariosERP;
window.abrirCadastroUsuario = abrirCadastroUsuario;
window.salvarUsuario = salvarUsuario;
window.abrirEdicaoUsuario = abrirEdicaoUsuario;
window.salvarEdicaoUsuario = salvarEdicaoUsuario;
window.desativarUsuarioEdicao = desativarUsuarioEdicao;
