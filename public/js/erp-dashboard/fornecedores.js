const API_URL = window.API_URL;

/**
 * Carregar secao de fornecedores
 */
export async function carregarFornecedoresSection() {
    const content = document.getElementById('fornecedores-content');
    content.innerHTML = '<p style="text-align: center; padding: 20px;">Carregando fornecedores...</p>';

    try {
        const response = await fetch(`${API_URL}/fornecedores`);
        if (!response.ok) throw new Error('Erro ao carregar fornecedores');

        const fornecedores = await response.json();

        content.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap;">
                <input 
                    type="text" 
                    id="filtroBuscaFornecedorERP" 
                    placeholder="🔍 Buscar por nome, razao social ou CNPJ..."
                    onkeyup="aplicarFiltrosFornecedoresERP()"
                    style="flex: 1; min-width: 300px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">

                <select id="filtroStatusFornecedorERP" onchange="aplicarFiltrosFornecedoresERP()" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    <option value="todos">Todos os Status</option>
                    <option value="ativo" selected>Ativos</option>
                    <option value="inativo">Inativos</option>
                </select>

                <button onclick="limparFiltrosFornecedoresERP()" class="btn" style="background: #6c757d; color: white; padding: 12px 20px;">
                    🔄 Limpar Filtros
                </button>
            </div>

            <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <strong id="contadorFornecedoresERP">0 fornecedor(es) encontrado(s)</strong>
            </div>

            <div id="listaFornecedoresERP" style="display: grid; gap: 10px;">
                <!-- Fornecedores serao renderizados aqui -->
            </div>
        `;

        window.fornecedoresERPCompletos = fornecedores;
        aplicarFiltrosFornecedoresERP();
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar fornecedores</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                <button onclick="carregarFornecedoresSection()" class="btn btn-primary" style="margin-top: 20px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

export function aplicarFiltrosFornecedoresERP() {
    if (!window.fornecedoresERPCompletos) return;

    const busca = document.getElementById('filtroBuscaFornecedorERP').value.toLowerCase();
    const status = document.getElementById('filtroStatusFornecedorERP').value;

    let fornecedoresFiltrados = [...window.fornecedoresERPCompletos];

    if (busca) {
        fornecedoresFiltrados = fornecedoresFiltrados.filter(fornecedor =>
            fornecedor.nome_fantasia.toLowerCase().includes(busca) ||
            (fornecedor.razao_social && fornecedor.razao_social.toLowerCase().includes(busca)) ||
            (fornecedor.cnpj && fornecedor.cnpj.toLowerCase().includes(busca))
        );
    }

    if (status !== 'todos') {
        fornecedoresFiltrados = fornecedoresFiltrados.filter(fornecedor => {
            if (status === 'ativo') return fornecedor.ativo === 1 || fornecedor.ativo === true;
            if (status === 'inativo') return fornecedor.ativo === 0 || fornecedor.ativo === false;
            return true;
        });
    }

    document.getElementById('contadorFornecedoresERP').textContent = `${fornecedoresFiltrados.length} fornecedor(es) encontrado(s)`;
    renderizarFornecedoresERP(fornecedoresFiltrados);
}

export function renderizarFornecedoresERP(fornecedores) {
    const container = document.getElementById('listaFornecedoresERP');

    if (fornecedores.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhum fornecedor encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        return;
    }

    container.innerHTML = fornecedores.map(fornecedor => {
        const ativoColor = (fornecedor.ativo === 1 || fornecedor.ativo === true) ? '#28a745' : '#dc3545';
        const ativoTexto = (fornecedor.ativo === 1 || fornecedor.ativo === true) ? '✓ Ativo' : '✗ Inativo';

        return `
            <div onclick="editarFornecedorERP(${fornecedor.id})" style="
                background: white; 
                padding: 20px; 
                border-radius: 8px; 
                border-left: 4px solid #ff9800;
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
                        <strong style="font-size: 18px;">${fornecedor.nome_fantasia}</strong>
                        <span style="
                            background: ${ativoColor}; 
                            color: white; 
                            padding: 3px 10px; 
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
                <div style="color: #ff9800; font-size: 24px;">✏️</div>
            </div>
        `;
    }).join('');
}

export function editarFornecedorERP(id) {
    if (typeof abrirEdicaoFornecedor === 'function') {
        abrirEdicaoFornecedor(id);
    } else {
        window.mostrarNotificacao?.('Funcao de edicao nao disponivel', 'error');
    }
}

export function limparFiltrosFornecedoresERP() {
    document.getElementById('filtroBuscaFornecedorERP').value = '';
    document.getElementById('filtroStatusFornecedorERP').value = 'ativo';
    aplicarFiltrosFornecedoresERP();
}
