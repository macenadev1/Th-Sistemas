const API_URL = window.API_URL;

/**
 * Carregar secao de clientes
 */
export async function carregarClientesSection() {
    const content = document.getElementById('clientes-content');
    content.innerHTML = '<p style="text-align: center; padding: 20px;">Carregando clientes...</p>';

    try {
        const response = await fetch(`${API_URL}/clientes`);
        if (!response.ok) throw new Error('Erro ao carregar clientes');

        const clientes = await response.json();

        content.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap;">
                <input 
                    type="text" 
                    id="filtroBuscaClienteERP" 
                    placeholder="🔍 Buscar por nome, CPF/CNPJ ou telefone..."
                    onkeyup="aplicarFiltrosClientesERP()"
                    style="flex: 1; min-width: 300px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">

                <select id="filtroStatusClienteERP" onchange="aplicarFiltrosClientesERP()" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    <option value="todos">Todos os Status</option>
                    <option value="ativo" selected>Ativos</option>
                    <option value="inativo">Inativos</option>
                </select>

                <button onclick="limparFiltrosClientesERP()" class="btn" style="background: #6c757d; color: white; padding: 12px 20px;">
                    🔄 Limpar Filtros
                </button>
            </div>

            <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <strong id="contadorClientesERP">0 cliente(s) encontrado(s)</strong>
            </div>

            <div id="listaClientesERP" style="display: grid; gap: 10px;">
                <!-- Clientes serao renderizados aqui -->
            </div>
        `;

        window.clientesERPCompletos = clientes;
        aplicarFiltrosClientesERP();
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar clientes</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                <button onclick="carregarClientesSection()" class="btn btn-primary" style="margin-top: 20px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

export function aplicarFiltrosClientesERP() {
    if (!window.clientesERPCompletos) return;

    const busca = document.getElementById('filtroBuscaClienteERP').value.toLowerCase();
    const status = document.getElementById('filtroStatusClienteERP').value;

    let clientesFiltrados = [...window.clientesERPCompletos];

    if (busca) {
        clientesFiltrados = clientesFiltrados.filter(cliente =>
            cliente.nome.toLowerCase().includes(busca) ||
            (cliente.cpf_cnpj && cliente.cpf_cnpj.toLowerCase().includes(busca)) ||
            (cliente.telefone && cliente.telefone.toLowerCase().includes(busca))
        );
    }

    if (status !== 'todos') {
        clientesFiltrados = clientesFiltrados.filter(cliente => {
            if (status === 'ativo') return cliente.ativo === 1 || cliente.ativo === true;
            if (status === 'inativo') return cliente.ativo === 0 || cliente.ativo === false;
            return true;
        });
    }

    document.getElementById('contadorClientesERP').textContent = `${clientesFiltrados.length} cliente(s) encontrado(s)`;
    renderizarClientesERP(clientesFiltrados);
}

export function renderizarClientesERP(clientes) {
    const container = document.getElementById('listaClientesERP');

    if (clientes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhum cliente encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        return;
    }

    container.innerHTML = clientes.map(cliente => {
        const ativoColor = (cliente.ativo === 1 || cliente.ativo === true) ? '#28a745' : '#dc3545';
        const ativoTexto = (cliente.ativo === 1 || cliente.ativo === true) ? '✓ Ativo' : '✗ Inativo';
        const limiteCredito = parseFloat(cliente.limite_credito) || 0;

        return `
            <div onclick="editarClienteERP(${cliente.id})" style="
                background: white; 
                padding: 20px; 
                border-radius: 8px; 
                border-left: 4px solid #007bff;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.transform='translateX(4px)'" 
               onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; this.style.transform='translateX(0)'")>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <strong style="font-size: 18px;">${cliente.nome}</strong>
                        <span style="
                            background: ${ativoColor}; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">${ativoTexto}</span>
                        ${limiteCredito > 0 ? `<span style="
                            background: #17a2b8; 
                            color: white; 
                            padding: 3px 10px; 
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
                <div style="color: #007bff; font-size: 24px;">✏️</div>
            </div>
        `;
    }).join('');
}

export function editarClienteERP(id) {
    if (typeof abrirEdicaoCliente === 'function') {
        abrirEdicaoCliente(id);
    } else {
        window.mostrarNotificacao?.('Funcao de edicao nao disponivel', 'error');
    }
}

export function limparFiltrosClientesERP() {
    document.getElementById('filtroBuscaClienteERP').value = '';
    document.getElementById('filtroStatusClienteERP').value = 'ativo';
    aplicarFiltrosClientesERP();
}
