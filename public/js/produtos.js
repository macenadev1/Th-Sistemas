// ==================== GERENCIAMENTO DE PRODUTOS ====================

// Variáveis globais
let produtosCompletos = [];
let paginaAtualProdutos = 1;
const itensPorPagina = 10;

// ==================== CADASTRO DE PRODUTOS ====================

function abrirCadastro() {
    abrirModal('cadastroModal');
    setTimeout(() => {
        document.getElementById('codigoBarras').focus();
    }, 100);
}

async function salvarProduto(event) {
    event.preventDefault();
    
    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    const codigo = document.getElementById('codigoBarras').value.trim();
    const nome = document.getElementById('nomeProduto').value.trim();
    const preco = parseFloat(document.getElementById('precoProduto').value);
    const estoque = parseInt(document.getElementById('estoqueProduto').value);

    try {
        const response = await fetch(`${API_URL}/produtos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                codigo_barras: codigo,
                nome: nome,
                preco: preco,
                estoque: estoque
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao cadastrar');
        }

        mostrarNotificacao(`✓ Produto "${nome}" cadastrado!`, 'success');
        
        document.getElementById('cadastroForm').reset();
        fecharModal();
        searchInput.focus();
    } catch (error) {
        console.error('Erro ao cadastrar produto:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

// ==================== GERENCIAMENTO DE PRODUTOS ====================

async function abrirGerenciarProdutos() {
    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    abrirModal('produtosModal');
    const content = document.getElementById('produtosContent');
    content.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Carregando produtos...</p>';

    try {
        const response = await fetch(`${API_URL}/produtos`);
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        
        produtosCompletos = await response.json();
        
        // Resetar filtros
        limparFiltrosProdutos();
        
        // Aplicar filtros (mostra todos inicialmente)
        aplicarFiltrosProdutos();

    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar produtos</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}

function aplicarFiltrosProdutos() {
    const busca = document.getElementById('filtroBuscaProduto').value.toLowerCase();
    const status = document.getElementById('filtroStatusProduto').value;
    
    let produtosFiltrados = [...produtosCompletos];
    
    // Filtro por busca (nome ou código de barras)
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
    
    // Resetar para página 1 quando aplicar filtros
    paginaAtualProdutos = 1;
    
    // Renderizar produtos filtrados
    renderizarProdutos(produtosFiltrados);
}

function limparFiltrosProdutos() {
    document.getElementById('filtroBuscaProduto').value = '';
    document.getElementById('filtroStatusProduto').value = 'todos';
    paginaAtualProdutos = 1;
    aplicarFiltrosProdutos();
}

function renderizarProdutos(produtos) {
    const content = document.getElementById('produtosContent');
    const contador = document.getElementById('contadorProdutos');
    
    // Atualizar contador
    contador.textContent = `${produtos.length} produto(s) encontrado(s)`;
    
    if (produtos.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhum produto encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        document.getElementById('paginacaoProdutos').innerHTML = '';
        return;
    }

    // Calcular paginação
    const totalPaginas = Math.ceil(produtos.length / itensPorPagina);
    const inicio = (paginaAtualProdutos - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const produtosPagina = produtos.slice(inicio, fim);

    let html = '<div style="padding: 10px;">';
    html += '<div style="display: grid; gap: 10px;">';
    
    for (const produto of produtosPagina) {
        const estoqueColor = produto.estoque > 10 ? '#28a745' : produto.estoque > 0 ? '#ffc107' : '#dc3545';
        const estoqueBadge = produto.estoque > 0 ? `${produto.estoque} un.` : 'SEM ESTOQUE';
        const ativoColor = (produto.ativo === 1 || produto.ativo === true) ? '#28a745' : '#dc3545';
        const ativoTexto = (produto.ativo === 1 || produto.ativo === true) ? '✓ Ativo' : '✗ Inativo';
        
        html += `
            <div onclick="abrirEdicaoProduto(${produto.id})" style="
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
                        <strong style="font-size: 16px;">${produto.nome}</strong>
                        <span style="
                            background: ${estoqueColor}; 
                            color: white; 
                            padding: 2px 8px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">${estoqueBadge}</span>
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
                        <span>🏷️ Código: ${produto.codigo_barras}</span>
                        <span style="margin-left: 20px;">💵 R$ ${parseFloat(produto.preco).toFixed(2)}</span>
                    </div>
                </div>
                <div style="color: #007bff; font-size: 20px;">✏️</div>
            </div>
        `;
    }

    html += '</div></div>';
    content.innerHTML = html;
    
    // Renderizar paginação
    renderizarPaginacaoProdutos(totalPaginas, produtos);
}

function renderizarPaginacaoProdutos(totalPaginas, produtos) {
    const paginacao = document.getElementById('paginacaoProdutos');
    
    if (totalPaginas <= 1) {
        paginacao.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botão anterior
    html += `
        <button 
            onclick="mudarPaginaProdutos(${paginaAtualProdutos - 1})" 
            ${paginaAtualProdutos === 1 ? 'disabled' : ''}
            style="
                padding: 8px 16px; 
                background: ${paginaAtualProdutos === 1 ? '#e9ecef' : '#007bff'}; 
                color: ${paginaAtualProdutos === 1 ? '#6c757d' : 'white'}; 
                border: none; 
                border-radius: 6px; 
                cursor: ${paginaAtualProdutos === 1 ? 'not-allowed' : 'pointer'}; 
                font-weight: 600;
            ">
            ← Anterior
        </button>
    `;
    
    // Números de página
    const maxBotoes = 5;
    let inicio = Math.max(1, paginaAtualProdutos - Math.floor(maxBotoes / 2));
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
                onclick="mudarPaginaProdutos(${i})" 
                style="
                    padding: 8px 16px; 
                    background: ${i === paginaAtualProdutos ? '#007bff' : 'white'}; 
                    color: ${i === paginaAtualProdutos ? 'white' : '#007bff'}; 
                    border: 2px solid #007bff; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    font-weight: ${i === paginaAtualProdutos ? '800' : '600'};
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
            onclick="mudarPaginaProdutos(${paginaAtualProdutos + 1})" 
            ${paginaAtualProdutos === totalPaginas ? 'disabled' : ''}
            style="
                padding: 8px 16px; 
                background: ${paginaAtualProdutos === totalPaginas ? '#e9ecef' : '#007bff'}; 
                color: ${paginaAtualProdutos === totalPaginas ? '#6c757d' : 'white'}; 
                border: none; 
                border-radius: 6px; 
                cursor: ${paginaAtualProdutos === totalPaginas ? 'not-allowed' : 'pointer'}; 
                font-weight: 600;
            ">
            Próximo →
        </button>
    `;
    
    paginacao.innerHTML = html;
}

function mudarPaginaProdutos(novaPagina) {
    paginaAtualProdutos = novaPagina;
    aplicarFiltrosProdutos();
}

// ==================== EDIÇÃO DE PRODUTOS ====================

async function abrirEdicaoProduto(id) {
    try {
        const response = await fetch(`${API_URL}/produtos`);
        const produtos = await response.json();
        const produto = produtos.find(p => p.id === id);
        
        if (!produto) {
            mostrarNotificacao('Produto não encontrado', 'error');
            return;
        }

        document.getElementById('editarId').value = produto.id;
        document.getElementById('editarCodigoBarras').value = produto.codigo_barras;
        document.getElementById('editarNome').value = produto.nome;
        document.getElementById('editarPreco').value = parseFloat(produto.preco).toFixed(2);
        document.getElementById('editarEstoque').value = produto.estoque;

        document.getElementById('produtosModal').classList.remove('active');
        abrirModal('editarProdutoModal');
        document.getElementById('editarNome').focus();

    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        mostrarNotificacao('Erro ao carregar produto', 'error');
    }
}

async function salvarEdicaoProduto(event) {
    event.preventDefault();

    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    const id = document.getElementById('editarId').value;
    const nome = document.getElementById('editarNome').value.trim();
    const preco = parseFloat(document.getElementById('editarPreco').value);
    const estoque = parseInt(document.getElementById('editarEstoque').value);

    try {
        const response = await fetch(`${API_URL}/produtos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, preco, estoque })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao atualizar');
        }

        mostrarNotificacao(`✓ Produto "${nome}" atualizado!`, 'success');
        
        document.getElementById('editarProdutoModal').classList.remove('active');
        abrirGerenciarProdutos();
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        mostrarNotificacao(error.message, 'error');
    }
}
