// ==================== GERENCIAMENTO DE CLIENTES ====================

let clientesCompletos = [];
let paginaAtualClientes = 1;
const itensPorPaginaClientes = 10;

// ==================== LISTAGEM DE CLIENTES ====================

async function abrirGerenciarClientes() {
    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    abrirModal('listaClientesModal');
    const content = document.getElementById('clientesContent');
    content.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Carregando clientes...</p>';

    try {
        const response = await fetch(`${window.API_URL}/clientes`);
        if (!response.ok) throw new Error('Erro ao carregar clientes');
        
        clientesCompletos = await response.json();
        
        // Resetar filtros
        limparFiltrosClientes();

    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar clientes</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}

function resetarPaginaEFiltrarClientes() {
    paginaAtualClientes = 1;
    aplicarFiltrosClientes();
}

function aplicarFiltrosClientes() {
    const busca = document.getElementById('filtroBuscaCliente').value.toLowerCase();
    const status = document.getElementById('filtroStatusCliente').value;
    
    let clientesFiltrados = [...clientesCompletos];
    
    // Filtro por busca
    if (busca) {
        clientesFiltrados = clientesFiltrados.filter(cliente => 
            cliente.nome.toLowerCase().includes(busca) ||
            (cliente.cpf_cnpj && cliente.cpf_cnpj.toLowerCase().includes(busca)) ||
            (cliente.telefone && cliente.telefone.toLowerCase().includes(busca))
        );
    }
    
    // Filtro por status
    if (status !== 'todos') {
        clientesFiltrados = clientesFiltrados.filter(cliente => {
            if (status === 'ativo') return cliente.ativo === 1 || cliente.ativo === true;
            if (status === 'inativo') return cliente.ativo === 0 || cliente.ativo === false;
            return true;
        });
    }
    
    // Atualizar contador
    document.getElementById('contadorClientes').textContent = `${clientesFiltrados.length} cliente(s) encontrado(s)`;
    
    // Renderizar clientes filtrados
    renderizarClientes(clientesFiltrados);
}

function limparFiltrosClientes() {
    document.getElementById('filtroBuscaCliente').value = '';
    document.getElementById('filtroStatusCliente').value = 'todos';
    paginaAtualClientes = 1;
    aplicarFiltrosClientes();
}

function renderizarClientes(clientes) {
    const content = document.getElementById('clientesContent');
    const contador = document.getElementById('contadorClientes');
    
    if (clientes.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhum cliente encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        document.getElementById('paginacaoClientes').innerHTML = '';
        return;
    }

    // Calcular paginação
    const totalPaginas = Math.ceil(clientes.length / itensPorPaginaClientes);
    const inicio = (paginaAtualClientes - 1) * itensPorPaginaClientes;
    const fim = inicio + itensPorPaginaClientes;
    const clientesPagina = clientes.slice(inicio, fim);

    let html = '<div style="padding: 10px;">';
    html += '<div style="display: grid; gap: 10px;">';
    
    for (const cliente of clientesPagina) {
        const ativoColor = (cliente.ativo === 1 || cliente.ativo === true) ? '#28a745' : '#dc3545';
        const ativoTexto = (cliente.ativo === 1 || cliente.ativo === true) ? '✓ Ativo' : '✗ Inativo';
        const limiteCredito = parseFloat(cliente.limite_credito) || 0;
        
        html += `
            <div onclick="abrirEdicaoCliente(${cliente.id})" style="
                background: #f8f9fa; 
                padding: 15px; 
                border-radius: 8px; 
                border-left: 4px solid #007bff;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
            " onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <strong style="font-size: 16px;">${cliente.nome}</strong>
                        <span style="
                            background: ${ativoColor}; 
                            color: white; 
                            padding: 2px 8px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">${ativoTexto}</span>
                        ${limiteCredito > 0 ? `<span style="
                            background: #17a2b8; 
                            color: white; 
                            padding: 2px 8px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">💳 R$ ${limiteCredito.toFixed(2)}</span>` : ''}
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        ${cliente.cpf_cnpj ? `<span>📄 ${cliente.cpf_cnpj}</span>` : ''}
                        ${cliente.telefone ? `<span style="margin-left: 15px;">📞 ${cliente.telefone}</span>` : ''}
                        ${cliente.cidade && cliente.estado ? `<span style="margin-left: 15px;">📍 ${cliente.cidade}/${cliente.estado}</span>` : ''}
                    </div>
                </div>
                <div style="color: #007bff; font-size: 20px;">✏️</div>
            </div>
        `;
    }

    html += '</div></div>';
    content.innerHTML = html;
    
    // Renderizar paginação
    renderizarPaginacaoClientes(totalPaginas, clientes);
}

function renderizarPaginacaoClientes(totalPaginas, clientes) {
    const paginacao = document.getElementById('paginacaoClientes');
    
    if (totalPaginas <= 1) {
        paginacao.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botão anterior
    html += `
        <button 
            onclick="event.stopPropagation(); mudarPaginaClientes(${paginaAtualClientes - 1})" 
            ${paginaAtualClientes === 1 ? 'disabled' : ''}
            style="
                padding: 8px 16px; 
                background: ${paginaAtualClientes === 1 ? '#e9ecef' : '#007bff'}; 
                color: ${paginaAtualClientes === 1 ? '#6c757d' : 'white'}; 
                border: none; 
                border-radius: 6px; 
                cursor: ${paginaAtualClientes === 1 ? 'not-allowed' : 'pointer'}; 
                font-weight: 600;
            ">
            ← Anterior
        </button>
    `;
    
    // Números de página
    const maxBotoes = 5;
    let inicio = Math.max(1, paginaAtualClientes - Math.floor(maxBotoes / 2));
    let fim = Math.min(totalPaginas, inicio + maxBotoes - 1);
    
    if (fim - inicio < maxBotoes - 1) {
        inicio = Math.max(1, fim - maxBotoes + 1);
    }
    
    if (inicio > 1) {
        html += `<span style="padding: 8px; color: #666;">...</span>`;
    }
    
    for (let i = inicio; i <= fim; i++) {
        html += `
            <button 
                onclick="event.stopPropagation(); mudarPaginaClientes(${i})" 
                style="
                    padding: 8px 16px; 
                    background: ${i === paginaAtualClientes ? '#007bff' : 'white'}; 
                    color: ${i === paginaAtualClientes ? 'white' : '#007bff'}; 
                    border: 2px solid #007bff; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    font-weight: ${i === paginaAtualClientes ? '800' : '600'};
                    min-width: 45px;
                ">
                ${i}
            </button>
        `;
    }
    
    if (fim < totalPaginas) {
        html += `<span style="padding: 8px; color: #666;">...</span>`;
    }
    
    // Botão próximo
    html += `
        <button 
            onclick="event.stopPropagation(); mudarPaginaClientes(${paginaAtualClientes + 1})" 
            ${paginaAtualClientes === totalPaginas ? 'disabled' : ''}
            style="
                padding: 8px 16px; 
                background: ${paginaAtualClientes === totalPaginas ? '#e9ecef' : '#007bff'}; 
                color: ${paginaAtualClientes === totalPaginas ? '#6c757d' : 'white'}; 
                border: none; 
                border-radius: 6px; 
                cursor: ${paginaAtualClientes === totalPaginas ? 'not-allowed' : 'pointer'}; 
                font-weight: 600;
            ">
            Próximo →
        </button>
    `;
    
    paginacao.innerHTML = html;
}

function mudarPaginaClientes(novaPagina) {
    paginaAtualClientes = novaPagina;
    aplicarFiltrosClientes();
}

// ==================== CADASTRO DE CLIENTES ====================

function abrirCadastroCliente() {
    abrirModal('cadastroClienteModal', () => {
        document.getElementById('formCadastroCliente').reset();
        
        const inputLimite = document.getElementById('limiteCreditoCliente');
        if (inputLimite && !inputLimite.getValorDecimal) {
            aplicarFormatacaoMoeda(inputLimite);
        }
        
        document.getElementById('nomeCliente').focus();
    });
}

async function salvarCliente(event) {
    event.preventDefault();
    
    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    const inputLimite = document.getElementById('limiteCreditoCliente');
    const limiteCredito = inputLimite.getValorDecimal ? inputLimite.getValorDecimal() : parseFloat(inputLimite.value.replace(',', '.')) || 0;

    const dados = {
        nome: document.getElementById('nomeCliente').value.trim(),
        cpf_cnpj: document.getElementById('cpfCnpjCliente').value.trim() || null,
        telefone: document.getElementById('telefoneCliente').value.trim() || null,
        email: document.getElementById('emailCliente').value.trim() || null,
        endereco: document.getElementById('enderecoCliente').value.trim() || null,
        cep: document.getElementById('cepCliente').value.trim() || null,
        cidade: document.getElementById('cidadeCliente').value.trim() || null,
        estado: document.getElementById('estadoCliente').value.trim().toUpperCase() || null,
        limite_credito: limiteCredito,
        observacoes: document.getElementById('observacoesCliente').value.trim() || null
    };

    try {
        const response = await fetch(`${window.API_URL}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao cadastrar cliente');
        }

        mostrarNotificacao(`✓ Cliente "${dados.nome}" cadastrado!`, 'success');
        
        fecharModal('cadastroClienteModal');
        
        // Recarregar lista
        const response2 = await fetch(`${window.API_URL}/clientes`);
        if (response2.ok) {
            clientesCompletos = await response2.json();
            aplicarFiltrosClientes();
        }
    } catch (error) {
        console.error('Erro ao cadastrar cliente:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

// ==================== EDIÇÃO DE CLIENTES ====================

async function abrirEdicaoCliente(id) {
    try {
        const response = await fetch(`${window.API_URL}/clientes/${id}`);
        const cliente = await response.json();
        
        if (!response.ok) {
            mostrarNotificacao('Cliente não encontrado', 'error');
            return;
        }

        document.getElementById('editarIdCliente').value = cliente.id;
        document.getElementById('editarNomeCliente').value = cliente.nome || '';
        document.getElementById('editarCpfCnpjCliente').value = cliente.cpf_cnpj || '';
        document.getElementById('editarTelefoneCliente').value = cliente.telefone || '';
        document.getElementById('editarEmailCliente').value = cliente.email || '';
        document.getElementById('editarEnderecoCliente').value = cliente.endereco || '';
        document.getElementById('editarCepCliente').value = cliente.cep || '';
        document.getElementById('editarCidadeCliente').value = cliente.cidade || '';
        document.getElementById('editarEstadoCliente').value = cliente.estado || '';
        document.getElementById('editarObservacoesCliente').value = cliente.observacoes || '';
        document.getElementById('editarAtivoCliente').checked = cliente.ativo === 1 || cliente.ativo === true;

        abrirModal('editarClienteModal', () => {
            const inputLimiteEdicao = document.getElementById('editarLimiteCreditoCliente');
            if (inputLimiteEdicao) {
                aplicarFormatacaoMoeda(inputLimiteEdicao);
                inputLimiteEdicao.setValorDecimal(parseFloat(cliente.limite_credito) || 0);
            }
            
            // Configurar toggle de ativo/inativo
            const checkboxAtivo = document.getElementById('editarAtivoCliente');
            const statusTexto = document.getElementById('statusTextoEditarCliente');
            
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
            
            document.getElementById('editarNomeCliente').focus();
        });

    } catch (error) {
        console.error('Erro ao carregar cliente:', error);
        mostrarNotificacao('Erro ao carregar cliente', 'error');
    }
}

async function salvarEdicaoCliente(event) {
    event.preventDefault();

    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    const id = document.getElementById('editarIdCliente').value;
    const inputLimiteEdicao = document.getElementById('editarLimiteCreditoCliente');
    const limiteCredito = inputLimiteEdicao.getValorDecimal ? inputLimiteEdicao.getValorDecimal() : parseFloat(inputLimiteEdicao.value.replace(',', '.')) || 0;

    const dados = {
        nome: document.getElementById('editarNomeCliente').value.trim(),
        cpf_cnpj: document.getElementById('editarCpfCnpjCliente').value.trim() || null,
        telefone: document.getElementById('editarTelefoneCliente').value.trim() || null,
        email: document.getElementById('editarEmailCliente').value.trim() || null,
        endereco: document.getElementById('editarEnderecoCliente').value.trim() || null,
        cep: document.getElementById('editarCepCliente').value.trim() || null,
        cidade: document.getElementById('editarCidadeCliente').value.trim() || null,
        estado: document.getElementById('editarEstadoCliente').value.trim().toUpperCase() || null,
        limite_credito: limiteCredito,
        observacoes: document.getElementById('editarObservacoesCliente').value.trim() || null,
        ativo: document.getElementById('editarAtivoCliente').checked
    };

    try {
        const response = await fetch(`${window.API_URL}/clientes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao atualizar cliente');
        }

        mostrarNotificacao(`✓ Cliente "${dados.nome}" atualizado!`, 'success');
        
        fecharModal('editarClienteModal');
        
        // Recarregar lista
        const response2 = await fetch(`${window.API_URL}/clientes`);
        if (response2.ok) {
            clientesCompletos = await response2.json();
            aplicarFiltrosClientes();
        }
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

// Configurar event listeners quando os modais forem carregados
document.addEventListener('modalsLoaded', () => {
    const filtroBuscaCliente = document.getElementById('filtroBuscaCliente');
    const filtroStatusCliente = document.getElementById('filtroStatusCliente');
    
    if (filtroBuscaCliente) {
        filtroBuscaCliente.removeEventListener('input', resetarPaginaEFiltrarClientes);
        filtroBuscaCliente.addEventListener('input', resetarPaginaEFiltrarClientes);
    }
    
    if (filtroStatusCliente) {
        filtroStatusCliente.removeEventListener('change', resetarPaginaEFiltrarClientes);
        filtroStatusCliente.addEventListener('change', resetarPaginaEFiltrarClientes);
    }
});
