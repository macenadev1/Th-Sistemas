// ==================== GERENCIAMENTO DE FORNECEDORES ====================

let fornecedoresCompletos = [];
let paginaAtualFornecedores = 1;
const itensPorPaginaFornecedores = 10;

// ==================== LISTAGEM DE FORNECEDORES ====================

async function abrirGerenciarFornecedores() {
    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    abrirModal('listaFornecedoresModal');
    const content = document.getElementById('fornecedoresContent');
    content.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Carregando fornecedores...</p>';

    try {
        const response = await fetch(`${window.API_URL}/fornecedores`);
        if (!response.ok) throw new Error('Erro ao carregar fornecedores');
        
        fornecedoresCompletos = await response.json();
        
        // Resetar filtros
        limparFiltrosFornecedores();

    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar fornecedores</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}

function resetarPaginaEFiltrarFornecedores() {
    paginaAtualFornecedores = 1;
    aplicarFiltrosFornecedores();
}

function aplicarFiltrosFornecedores() {
    const busca = document.getElementById('filtroBuscaFornecedor').value.toLowerCase();
    const status = document.getElementById('filtroStatusFornecedor').value;
    
    let fornecedoresFiltrados = [...fornecedoresCompletos];
    
    // Filtro por busca
    if (busca) {
        fornecedoresFiltrados = fornecedoresFiltrados.filter(fornecedor => 
            fornecedor.nome_fantasia.toLowerCase().includes(busca) ||
            (fornecedor.razao_social && fornecedor.razao_social.toLowerCase().includes(busca)) ||
            (fornecedor.cnpj && fornecedor.cnpj.toLowerCase().includes(busca))
        );
    }
    
    // Filtro por status
    if (status !== 'todos') {
        fornecedoresFiltrados = fornecedoresFiltrados.filter(fornecedor => {
            if (status === 'ativo') return fornecedor.ativo === 1 || fornecedor.ativo === true;
            if (status === 'inativo') return fornecedor.ativo === 0 || fornecedor.ativo === false;
            return true;
        });
    }
    
    // Atualizar contador
    document.getElementById('contadorFornecedores').textContent = `${fornecedoresFiltrados.length} fornecedor(es) encontrado(s)`;
    
    // Renderizar fornecedores filtrados
    renderizarFornecedores(fornecedoresFiltrados);
}

function limparFiltrosFornecedores() {
    document.getElementById('filtroBuscaFornecedor').value = '';
    document.getElementById('filtroStatusFornecedor').value = 'todos';
    paginaAtualFornecedores = 1;
    aplicarFiltrosFornecedores();
}

function renderizarFornecedores(fornecedores) {
    const content = document.getElementById('fornecedoresContent');
    
    if (fornecedores.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhum fornecedor encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        document.getElementById('paginacaoFornecedores').innerHTML = '';
        return;
    }

    // Calcular paginação
    const totalPaginas = Math.ceil(fornecedores.length / itensPorPaginaFornecedores);
    const inicio = (paginaAtualFornecedores - 1) * itensPorPaginaFornecedores;
    const fim = inicio + itensPorPaginaFornecedores;
    const fornecedoresPagina = fornecedores.slice(inicio, fim);

    let html = '<div style="padding: 10px;"><div style="display: grid; gap: 10px;">';
    
    for (const fornecedor of fornecedoresPagina) {
        const ativoColor = (fornecedor.ativo === 1 || fornecedor.ativo === true) ? '#28a745' : '#dc3545';
        const ativoTexto = (fornecedor.ativo === 1 || fornecedor.ativo === true) ? '✓ Ativo' : '✗ Inativo';
        
        html += `
            <div onclick="abrirEdicaoFornecedor(${fornecedor.id})" style="
                background: #f8f9fa; 
                padding: 15px; 
                border-radius: 8px; 
                border-left: 4px solid #ff9800;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
            " onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <strong style="font-size: 16px;">${fornecedor.nome_fantasia}</strong>
                        <span style="
                            background: ${ativoColor}; 
                            color: white; 
                            padding: 2px 8px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">${ativoTexto}</span>
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        ${fornecedor.razao_social ? `<span>🏢 ${fornecedor.razao_social}</span><br>` : ''}
                        ${fornecedor.cnpj ? `<span>📄 ${fornecedor.cnpj}</span>` : ''}
                        ${fornecedor.telefone ? `<span style="margin-left: 15px;">📞 ${fornecedor.telefone}</span>` : ''}
                        ${fornecedor.cidade && fornecedor.estado ? `<span style="margin-left: 15px;">📍 ${fornecedor.cidade}/${fornecedor.estado}</span>` : ''}
                    </div>
                </div>
                <div style="color: #ff9800; font-size: 20px;">✏️</div>
            </div>
        `;
    }

    html += '</div></div>';
    content.innerHTML = html;
    
    renderizarPaginacaoFornecedores(totalPaginas, fornecedores);
}

function renderizarPaginacaoFornecedores(totalPaginas, fornecedores) {
    const paginacao = document.getElementById('paginacaoFornecedores');
    
    if (totalPaginas <= 1) {
        paginacao.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button onclick="event.stopPropagation(); mudarPaginaFornecedores(${paginaAtualFornecedores - 1})" ${paginaAtualFornecedores === 1 ? 'disabled' : ''} style="padding: 8px 16px; background: ${paginaAtualFornecedores === 1 ? '#e9ecef' : '#ff9800'}; color: ${paginaAtualFornecedores === 1 ? '#6c757d' : 'white'}; border: none; border-radius: 6px; cursor: ${paginaAtualFornecedores === 1 ? 'not-allowed' : 'pointer'}; font-weight: 600;">← Anterior</button>`;
    
    const maxBotoes = 5;
    let inicio = Math.max(1, paginaAtualFornecedores - Math.floor(maxBotoes / 2));
    let fim = Math.min(totalPaginas, inicio + maxBotoes - 1);
    
    if (fim - inicio < maxBotoes - 1) {
        inicio = Math.max(1, fim - maxBotoes + 1);
    }
    
    if (inicio > 1) html += `<span style="padding: 8px; color: #666;">...</span>`;
    
    for (let i = inicio; i <= fim; i++) {
        html += `<button onclick="event.stopPropagation(); mudarPaginaFornecedores(${i})" style="padding: 8px 16px; background: ${i === paginaAtualFornecedores ? '#ff9800' : 'white'}; color: ${i === paginaAtualFornecedores ? 'white' : '#ff9800'}; border: 2px solid #ff9800; border-radius: 6px; cursor: pointer; font-weight: ${i === paginaAtualFornecedores ? '800' : '600'}; min-width: 45px;">${i}</button>`;
    }
    
    if (fim < totalPaginas) html += `<span style="padding: 8px; color: #666;">...</span>`;
    
    html += `<button onclick="event.stopPropagation(); mudarPaginaFornecedores(${paginaAtualFornecedores + 1})" ${paginaAtualFornecedores === totalPaginas ? 'disabled' : ''} style="padding: 8px 16px; background: ${paginaAtualFornecedores === totalPaginas ? '#e9ecef' : '#ff9800'}; color: ${paginaAtualFornecedores === totalPaginas ? '#6c757d' : 'white'}; border: none; border-radius: 6px; cursor: ${paginaAtualFornecedores === totalPaginas ? 'not-allowed' : 'pointer'}; font-weight: 600;">Próximo →</button>`;
    
    paginacao.innerHTML = html;
}

function mudarPaginaFornecedores(novaPagina) {
    paginaAtualFornecedores = novaPagina;
    aplicarFiltrosFornecedores();
}

// ==================== CADASTRO DE FORNECEDORES ====================

function abrirCadastroFornecedor() {
    abrirModal('cadastroFornecedorModal', () => {
        document.getElementById('formCadastroFornecedor').reset();
        document.getElementById('nomeFornecedor').focus();
    });
}

async function salvarFornecedor(event) {
    event.preventDefault();
    
    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    const dados = {
        nome_fantasia: document.getElementById('nomeFornecedor').value.trim(),
        razao_social: document.getElementById('razaoSocialFornecedor').value.trim() || null,
        cnpj: document.getElementById('cnpjFornecedor').value.trim() || null,
        telefone: document.getElementById('telefoneFornecedor').value.trim() || null,
        email: document.getElementById('emailFornecedor').value.trim() || null,
        endereco: document.getElementById('enderecoFornecedor').value.trim() || null,
        cep: document.getElementById('cepFornecedor').value.trim() || null,
        cidade: document.getElementById('cidadeFornecedor').value.trim() || null,
        estado: document.getElementById('estadoFornecedor').value.trim().toUpperCase() || null,
        contato_principal: document.getElementById('contatoFornecedor').value.trim() || null,
        observacoes: document.getElementById('observacoesFornecedor').value.trim() || null
    };

    try {
        const response = await fetch(`${window.API_URL}/fornecedores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao cadastrar fornecedor');
        }

        mostrarNotificacao(`✓ Fornecedor "${dados.nome_fantasia}" cadastrado!`, 'success');
        
        fecharModal('cadastroFornecedorModal');
        
        const response2 = await fetch(`${window.API_URL}/fornecedores`);
        if (response2.ok) {
            fornecedoresCompletos = await response2.json();
            aplicarFiltrosFornecedores();
        }
    } catch (error) {
        console.error('Erro ao cadastrar fornecedor:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

// ==================== EDIÇÃO DE FORNECEDORES ====================

async function abrirEdicaoFornecedor(id) {
    try {
        const response = await fetch(`${window.API_URL}/fornecedores/${id}`);
        const fornecedor = await response.json();
        
        if (!response.ok) {
            mostrarNotificacao('Fornecedor não encontrado', 'error');
            return;
        }

        document.getElementById('editarIdFornecedor').value = fornecedor.id;
        document.getElementById('editarNomeFornecedor').value = fornecedor.nome_fantasia || '';
        document.getElementById('editarRazaoSocialFornecedor').value = fornecedor.razao_social || '';
        document.getElementById('editarCnpjFornecedor').value = fornecedor.cnpj || '';
        document.getElementById('editarTelefoneFornecedor').value = fornecedor.telefone || '';
        document.getElementById('editarEmailFornecedor').value = fornecedor.email || '';
        document.getElementById('editarEnderecoFornecedor').value = fornecedor.endereco || '';
        document.getElementById('editarCepFornecedor').value = fornecedor.cep || '';
        document.getElementById('editarCidadeFornecedor').value = fornecedor.cidade || '';
        document.getElementById('editarEstadoFornecedor').value = fornecedor.estado || '';
        document.getElementById('editarContatoFornecedor').value = fornecedor.contato_principal || '';
        document.getElementById('editarObservacoesFornecedor').value = fornecedor.observacoes || '';
        document.getElementById('editarAtivoFornecedor').checked = fornecedor.ativo === 1 || fornecedor.ativo === true;

        abrirModal('editarFornecedorModal', () => {
            const checkboxAtivo = document.getElementById('editarAtivoFornecedor');
            const statusTexto = document.getElementById('statusTextoEditarFornecedor');
            
            function atualizarStatusTexto() {
                if (checkboxAtivo.checked) {
                    statusTexto.innerHTML = '✓ Ativo';
                    statusTexto.style.color = '#28a745';
                } else {
                    statusTexto.innerHTML = '✗ Inativo';
                    statusTexto.style.color = '#dc3545';
                }
            }
            
            atualizarStatusTexto();
            checkboxAtivo.addEventListener('change', atualizarStatusTexto);
            
            document.getElementById('editarNomeFornecedor').focus();
        });

    } catch (error) {
        console.error('Erro ao carregar fornecedor:', error);
        mostrarNotificacao('Erro ao carregar fornecedor', 'error');
    }
}

async function salvarEdicaoFornecedor(event) {
    event.preventDefault();

    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    const id = document.getElementById('editarIdFornecedor').value;

    const dados = {
        nome_fantasia: document.getElementById('editarNomeFornecedor').value.trim(),
        razao_social: document.getElementById('editarRazaoSocialFornecedor').value.trim() || null,
        cnpj: document.getElementById('editarCnpjFornecedor').value.trim() || null,
        telefone: document.getElementById('editarTelefoneFornecedor').value.trim() || null,
        email: document.getElementById('editarEmailFornecedor').value.trim() || null,
        endereco: document.getElementById('editarEnderecoFornecedor').value.trim() || null,
        cep: document.getElementById('editarCepFornecedor').value.trim() || null,
        cidade: document.getElementById('editarCidadeFornecedor').value.trim() || null,
        estado: document.getElementById('editarEstadoFornecedor').value.trim().toUpperCase() || null,
        contato_principal: document.getElementById('editarContatoFornecedor').value.trim() || null,
        observacoes: document.getElementById('editarObservacoesFornecedor').value.trim() || null,
        ativo: document.getElementById('editarAtivoFornecedor').checked
    };

    try {
        const response = await fetch(`${window.API_URL}/fornecedores/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao atualizar fornecedor');
        }

        mostrarNotificacao(`✓ Fornecedor "${dados.nome_fantasia}" atualizado!`, 'success');
        
        fecharModal('editarFornecedorModal');
        
        const response2 = await fetch(`${window.API_URL}/fornecedores`);
        if (response2.ok) {
            fornecedoresCompletos = await response2.json();
            aplicarFiltrosFornecedores();
        }
    } catch (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

// Configurar event listeners
document.addEventListener('modalsLoaded', () => {
    const filtroBuscaFornecedor = document.getElementById('filtroBuscaFornecedor');
    const filtroStatusFornecedor = document.getElementById('filtroStatusFornecedor');
    
    if (filtroBuscaFornecedor) {
        filtroBuscaFornecedor.removeEventListener('input', resetarPaginaEFiltrarFornecedores);
        filtroBuscaFornecedor.addEventListener('input', resetarPaginaEFiltrarFornecedores);
    }
    
    if (filtroStatusFornecedor) {
        filtroStatusFornecedor.removeEventListener('change', resetarPaginaEFiltrarFornecedores);
        filtroStatusFornecedor.addEventListener('change', resetarPaginaEFiltrarFornecedores);
    }
});
