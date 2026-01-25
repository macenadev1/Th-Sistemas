// ==================== GERENCIAMENTO DE PRODUTOS ====================

// Variáveis globais
let produtosCompletos = [];
let paginaAtualProdutos = 1;
const itensPorPagina = 10;

// ==================== FUNÇÕES AUXILIARES ====================

// Carregar fornecedores para select
async function carregarFornecedoresSelect(selectId, valorSelecionado = null) {
    try {
        const response = await fetch(`${window.API_URL}/fornecedores?ativo=true`);
        const fornecedores = await response.json();
        
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Nenhum --</option>';
        fornecedores.forEach(f => {
            const option = document.createElement('option');
            option.value = f.id;
            option.textContent = f.nome_fantasia;
            if (valorSelecionado && f.id == valorSelecionado) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
    }
}

// Carregar categorias para select
async function carregarCategoriasSelect(selectId, valorSelecionado = null) {
    try {
        const response = await fetch(`${window.API_URL}/categorias/produtos?ativo=true`);
        const categorias = await response.json();
        
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Nenhuma --</option>';
        categorias.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.nome;
            if (valorSelecionado && c.id == valorSelecionado) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
}

// ==================== CADASTRO DE PRODUTOS ====================

function abrirCadastro() {
    abrirModal('cadastroModal', async () => {
        const inputPreco = document.getElementById('precoProduto');
        if (inputPreco) {
            aplicarFormatacaoMoeda(inputPreco);
        }
        
        const inputCusto = document.getElementById('custoProduto');
        if (inputCusto) {
            aplicarFormatacaoMoeda(inputCusto);
        }
        
        // Carregar fornecedores e categorias
        await carregarFornecedoresSelect('fornecedorProduto');
        await carregarCategoriasSelect('categoriaProduto');
        
        const inputCodigo = document.getElementById('codigoBarras');
        if (inputCodigo) {
            inputCodigo.focus();
        }
    });
}

async function salvarProduto(event) {
    event.preventDefault();
    
    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    const codigo = document.getElementById('codigoBarras').value.trim();
    const nome = document.getElementById('nomeProduto').value.trim();
    const inputPreco = document.getElementById('precoProduto');
    const preco = inputPreco.getValorDecimal ? inputPreco.getValorDecimal() : parseFloat(inputPreco.value);
    const inputCusto = document.getElementById('custoProduto');
    const preco_custo = inputCusto.getValorDecimal ? inputCusto.getValorDecimal() : parseFloat(inputCusto.value) || 0;
    const estoque = parseInt(document.getElementById('estoqueProduto').value);
    const estoque_minimo = parseInt(document.getElementById('estoqueMinimoProduto').value) || 0;
    const desconto = parseFloat(document.getElementById('descontoProduto').value) || 0;
    const fornecedor_id = document.getElementById('fornecedorProduto').value || null;
    const categoria_id = document.getElementById('categoriaProduto').value || null;

    try {
        const response = await fetch(`${API_URL}/produtos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                codigo_barras: codigo,
                nome: nome,
                preco: preco,
                preco_custo: preco_custo,
                desconto_percentual: desconto,
                estoque: estoque,
                estoque_minimo: estoque_minimo,
                fornecedor_id: fornecedor_id,
                categoria_id: categoria_id
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
        
        // Configurar event listeners para resetar página quando filtros mudarem
        const filtroBusca = document.getElementById('filtroBuscaProduto');
        const filtroStatus = document.getElementById('filtroStatusProduto');
        
        if (filtroBusca) {
            filtroBusca.removeEventListener('input', resetarPaginaEFiltrar);
            filtroBusca.addEventListener('input', resetarPaginaEFiltrar);
        }
        
        if (filtroStatus) {
            filtroStatus.removeEventListener('change', resetarPaginaEFiltrar);
            filtroStatus.addEventListener('change', resetarPaginaEFiltrar);
        }
        
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

function resetarPaginaEFiltrar() {
    paginaAtualProdutos = 1;
    aplicarFiltrosProdutos();
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
            onclick="event.stopPropagation(); mudarPaginaProdutos(${paginaAtualProdutos - 1})" 
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
                onclick="event.stopPropagation(); mudarPaginaProdutos(${i})" 
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
            onclick="event.stopPropagation(); mudarPaginaProdutos(${paginaAtualProdutos + 1})" 
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
        document.getElementById('editarEstoque').value = produto.estoque;
        document.getElementById('editarEstoqueMinimo').value = produto.estoque_minimo || 0;
        document.getElementById('editarDesconto').value = produto.desconto_percentual || 0;
        document.getElementById('editarAtivo').checked = produto.ativo === 1 || produto.ativo === true;

        // NÃO fechar modal principal - mantém em cascata
        
        abrirModal('editarProdutoModal', async () => {
            const inputPrecoEdicao = document.getElementById('editarPreco');
            if (inputPrecoEdicao) {
                aplicarFormatacaoMoeda(inputPrecoEdicao);
                inputPrecoEdicao.setValorDecimal(parseFloat(produto.preco));
            }
            
            const inputCustoEdicao = document.getElementById('editarCusto');
            if (inputCustoEdicao) {
                aplicarFormatacaoMoeda(inputCustoEdicao);
                inputCustoEdicao.setValorDecimal(parseFloat(produto.preco_custo) || 0);
            }
            
            // Carregar fornecedores e categorias
            await carregarFornecedoresSelect('editarFornecedorProduto', produto.fornecedor_id);
            await carregarCategoriasSelect('editarCategoriaProduto', produto.categoria_id);
            
            // Configurar toggle de ativo/inativo
            const checkboxAtivo = document.getElementById('editarAtivo');
            const statusTexto = document.getElementById('statusTextoEditar');
            
            // Função para atualizar o texto do status
            function atualizarStatusTexto() {
                if (checkboxAtivo.checked) {
                    statusTexto.innerHTML = '✓ Ativo';
                    statusTexto.style.color = '#28a745';
                } else {
                    statusTexto.innerHTML = '✕ Inativo';
                    statusTexto.style.color = '#dc3545';
                }
            }
            
            // Atualizar texto inicial
            atualizarStatusTexto();
            
            // Adicionar listener para mudanças
            checkboxAtivo.addEventListener('change', atualizarStatusTexto);
            
            const inputNome = document.getElementById('editarNome');
            if (inputNome) {
                inputNome.focus();
            }
        });

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
    const inputPrecoEdicao = document.getElementById('editarPreco');
    const preco = inputPrecoEdicao.getValorDecimal ? inputPrecoEdicao.getValorDecimal() : parseFloat(inputPrecoEdicao.value);
    const inputCustoEdicao = document.getElementById('editarCusto');
    const preco_custo = inputCustoEdicao.getValorDecimal ? inputCustoEdicao.getValorDecimal() : parseFloat(inputCustoEdicao.value) || 0;
    const estoque = parseInt(document.getElementById('editarEstoque').value);
    const estoque_minimo = parseInt(document.getElementById('editarEstoqueMinimo').value) || 0;
    const desconto = parseFloat(document.getElementById('editarDesconto').value) || 0;
    const ativo = document.getElementById('editarAtivo').checked;
    const fornecedor_id = document.getElementById('editarFornecedorProduto').value || null;
    const categoria_id = document.getElementById('editarCategoriaProduto').value || null;

    try {
        const response = await fetch(`${API_URL}/produtos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nome, 
                preco,
                preco_custo, 
                desconto_percentual: desconto, 
                estoque,
                estoque_minimo: estoque_minimo, 
                ativo,
                fornecedor_id: fornecedor_id,
                categoria_id: categoria_id
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao atualizar');
        }

        mostrarNotificacao(`✓ Produto "${nome}" atualizado!`, 'success');
        
        // Fechar modal de edição e recarregar lista de produtos
        fecharModal('editarProdutoModal');
        
        // Recarregar produtos e reaplicar filtros
        const response2 = await fetch(`${API_URL}/produtos`);
        if (response2.ok) {
            produtosCompletos = await response2.json();
            aplicarFiltrosProdutos();
        }
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        mostrarNotificacao(error.message, 'error');
    }
}
