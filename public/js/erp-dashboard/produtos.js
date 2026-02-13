const API_URL = window.API_URL;

// ==================== VARIAVEIS DE PAGINACAO PRODUTOS ERP ====================
let paginaAtualProdutosERP = 1;
const itensPorPaginaERP = 10;

/**
 * Carregar secao de produtos
 */
export async function carregarProdutosSection() {
    const content = document.getElementById('produtos-content');
    content.innerHTML = '<p style="text-align: center; padding: 20px;">Carregando produtos...</p>';

    try {
        const response = await fetch(`${API_URL}/produtos`);
        if (!response.ok) throw new Error('Erro ao carregar produtos');

        const produtos = await response.json();

        // Renderizar lista inline
        content.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap;">
                <!-- Filtros -->
                <input 
                    type="text" 
                    id="filtroBuscaProdutoERP" 
                    placeholder="🔍 Buscar por nome ou codigo..."
                    onkeyup="resetarPaginaEFiltrarProdutosERP()"
                    style="flex: 1; min-width: 300px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">

                <select id="filtroStatusProdutoERP" onchange="resetarPaginaEFiltrarProdutosERP()" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    <option value="todos">Todos os Status</option>
                    <option value="ativo" selected>Ativos</option>
                    <option value="inativo">Inativos</option>
                    <option value="com_estoque">Com Estoque</option>
                    <option value="sem_estoque">Sem Estoque</option>
                </select>

                <button onclick="limparFiltrosProdutosERP()" class="btn" style="background: #6c757d; color: white; padding: 12px 20px;">
                    🔄 Limpar Filtros
                </button>
            </div>

            <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <strong id="contadorProdutosERP">0 produto(s) encontrado(s)</strong>
            </div>

            <div id="listaProdutosERP" style="display: grid; gap: 10px;">
                <!-- Produtos serao renderizados aqui -->
            </div>

            <!-- Paginacao -->
            <div id="paginacaoProdutosERP" style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                <!-- Controles de paginacao serao renderizados aqui -->
            </div>
        `;

        // Armazenar produtos globalmente para filtros
        window.produtosERPCompletos = produtos;

        // Resetar pagina para 1 e aplicar filtros iniciais (mostrar apenas ativos)
        paginaAtualProdutosERP = 1;
        aplicarFiltrosProdutosERP();
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar produtos</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                <button onclick="carregarProdutosSection()" class="btn btn-primary" style="margin-top: 20px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

/**
 * Resetar pagina e aplicar filtros (chamado quando filtros mudarem)
 */
export function resetarPaginaEFiltrarProdutosERP() {
    paginaAtualProdutosERP = 1;
    aplicarFiltrosProdutosERP();
}

/**
 * Aplicar filtros na lista de produtos do ERP
 */
export function aplicarFiltrosProdutosERP() {
    if (!window.produtosERPCompletos) return;

    const busca = document.getElementById('filtroBuscaProdutoERP').value.toLowerCase();
    const status = document.getElementById('filtroStatusProdutoERP').value;

    let produtosFiltrados = [...window.produtosERPCompletos];

    // Filtro por busca
    if (busca) {
        produtosFiltrados = produtosFiltrados.filter(produto =>
            produto.nome.toLowerCase().includes(busca) ||
            produto.codigo_barras.toLowerCase().includes(busca)
        );
    }

    // Filtro por status
    if (status !== 'todos') {
        produtosFiltrados = produtosFiltrados.filter(produto => {
            if (status === 'ativo') return produto.ativo === 1 || produto.ativo === true;
            if (status === 'inativo') return produto.ativo === 0 || produto.ativo === false;
            if (status === 'com_estoque') return produto.estoque > 0;
            if (status === 'sem_estoque') return produto.estoque <= 0;
            return true;
        });
    }

    // Atualizar contador
    document.getElementById('contadorProdutosERP').textContent = `${produtosFiltrados.length} produto(s) encontrado(s)`;

    // Renderizar produtos COM PAGINACAO
    renderizarProdutosERP(produtosFiltrados);
}

/**
 * Renderizar lista de produtos no ERP com paginacao
 */
export function renderizarProdutosERP(produtos) {
    const container = document.getElementById('listaProdutosERP');

    if (produtos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhum produto encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        document.getElementById('paginacaoProdutosERP').innerHTML = '';
        return;
    }

    // PAGINACAO: Calcular produtos da pagina atual
    const totalPaginas = Math.ceil(produtos.length / itensPorPaginaERP);
    const inicio = (paginaAtualProdutosERP - 1) * itensPorPaginaERP;
    const fim = inicio + itensPorPaginaERP;
    const produtosPagina = produtos.slice(inicio, fim);

    container.innerHTML = produtosPagina.map(produto => {
        const estoqueColor = produto.estoque > 10 ? '#28a745' : produto.estoque > 0 ? '#ffc107' : '#dc3545';
        const estoqueBadge = produto.estoque > 0 ? `${produto.estoque} un.` : 'SEM ESTOQUE';
        const ativoColor = (produto.ativo === 1 || produto.ativo === true) ? '#28a745' : '#dc3545';
        const ativoTexto = (produto.ativo === 1 || produto.ativo === true) ? '✓ Ativo' : '✗ Inativo';
        const temDesconto = produto.desconto_percentual && produto.desconto_percentual > 0;

        return `
            <div onclick="editarProdutoERP(${produto.id})" style="
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
                        <strong style="font-size: 18px;">${produto.nome}</strong>
                        <span style="
                            background: ${estoqueColor}; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">${estoqueBadge}</span>
                        <span style="
                            background: ${ativoColor}; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">${ativoTexto}</span>
                        ${temDesconto ? `<span style="
                            background: #ff9800; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">-${produto.desconto_percentual}%</span>` : ''}
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        <span>🏷️ Codigo: ${produto.codigo_barras}</span>
                        <span style="margin-left: 20px;">💵 R$ ${parseFloat(produto.preco).toFixed(2)}</span>
                        ${temDesconto ? `<span style="margin-left: 10px; text-decoration: line-through; color: #999;">R$ ${(parseFloat(produto.preco) / (1 - produto.desconto_percentual / 100)).toFixed(2)}</span>` : ''}
                    </div>
                </div>
                <div style="color: #007bff; font-size: 24px;">✏️</div>
            </div>
        `;
    }).join('');

    // RENDERIZAR CONTROLES DE PAGINACAO
    renderizarPaginacaoProdutosERP(totalPaginas, produtos);
}

/**
 * Renderizar controles de paginacao para produtos ERP
 */
export function renderizarPaginacaoProdutosERP(totalPaginas, produtos) {
    const paginacao = document.getElementById('paginacaoProdutosERP');

    if (totalPaginas <= 1) {
        paginacao.innerHTML = '';
        return;
    }

    let html = '';

    // Botao anterior
    html += `
        <button 
            onclick="event.stopPropagation(); mudarPaginaProdutosERP(${paginaAtualProdutosERP - 1})" 
            ${paginaAtualProdutosERP === 1 ? 'disabled' : ''}
            style="
                padding: 8px 16px; 
                background: ${paginaAtualProdutosERP === 1 ? '#e9ecef' : '#007bff'}; 
                color: ${paginaAtualProdutosERP === 1 ? '#6c757d' : 'white'}; 
                border: none; 
                border-radius: 6px; 
                cursor: ${paginaAtualProdutosERP === 1 ? 'not-allowed' : 'pointer'}; 
                font-weight: 600;
            ">
            ← Anterior
        </button>
    `;

    // Numeros de pagina (maximo 5 botoes visiveis)
    const maxBotoes = 5;
    let inicio = Math.max(1, paginaAtualProdutosERP - Math.floor(maxBotoes / 2));
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
                onclick="event.stopPropagation(); mudarPaginaProdutosERP(${i})" 
                style="
                    padding: 8px 16px; 
                    background: ${i === paginaAtualProdutosERP ? '#007bff' : 'white'}; 
                    color: ${i === paginaAtualProdutosERP ? 'white' : '#007bff'}; 
                    border: 2px solid #007bff; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    font-weight: ${i === paginaAtualProdutosERP ? '800' : '600'};
                    min-width: 45px;
                ">
                ${i}
            </button>
        `;
    }

    if (fim < totalPaginas) {
        html += `<span style="padding: 8px; color: #666;">...</span>`;
    }

    // Botao proximo
    html += `
        <button 
            onclick="event.stopPropagation(); mudarPaginaProdutosERP(${paginaAtualProdutosERP + 1})" 
            ${paginaAtualProdutosERP === totalPaginas ? 'disabled' : ''}
            style="
                padding: 8px 16px; 
                background: ${paginaAtualProdutosERP === totalPaginas ? '#e9ecef' : '#007bff'}; 
                color: ${paginaAtualProdutosERP === totalPaginas ? '#6c757d' : 'white'}; 
                border: none; 
                border-radius: 6px; 
                cursor: ${paginaAtualProdutosERP === totalPaginas ? 'not-allowed' : 'pointer'}; 
                font-weight: 600;
            ">
            Proximo →
        </button>
    `;

    paginacao.innerHTML = html;
}

/**
 * Mudar pagina de produtos ERP
 */
export function mudarPaginaProdutosERP(novaPagina) {
    paginaAtualProdutosERP = novaPagina;
    aplicarFiltrosProdutosERP();
}

/**
 * Editar produto diretamente do ERP
 */
export function editarProdutoERP(id) {
    // Usar funcao existente de produtos.js
    if (typeof abrirEdicaoProduto === 'function') {
        abrirEdicaoProduto(id);
    } else {
        window.mostrarNotificacao?.('Funcao de edicao nao disponivel', 'error');
    }
}

/**
 * Limpar filtros de produtos ERP
 */
export function limparFiltrosProdutosERP() {
    document.getElementById('filtroBuscaProdutoERP').value = '';
    document.getElementById('filtroStatusProdutoERP').value = 'ativo';
    paginaAtualProdutosERP = 1;
    aplicarFiltrosProdutosERP();
}
