// ==================== ERP DASHBOARD ====================
// Gerenciamento do dashboard e estatísticas

/**
 * Navegação entre seções do ERP
 */
function navegarPara(event, secao) {
    event.preventDefault();
    
    // Remover classe active de todos os itens do menu
    document.querySelectorAll('.erp-menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Adicionar active no item clicado
    event.currentTarget.classList.add('active');
    
    // Ocultar todas as seções
    document.querySelectorAll('.erp-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar seção selecionada
    const secaoElement = document.getElementById(`${secao}-section`);
    if (secaoElement) {
        secaoElement.classList.add('active');
    }
    
    // Atualizar título do header
    const titulos = {
        'dashboard': '📊 Dashboard',
        'produtos': '📦 Produtos',
        'clientes': '👥 Clientes',
        'fornecedores': '🏢 Fornecedores',
        'caixa': '💰 Caixa',
        'vendas': '🛒 Vendas',
        'relatorios': '📈 Relatórios',
        'configuracoes': '⚙️ Configurações'
    };
    
    document.getElementById('pageTitle').textContent = titulos[secao] || secao;
    
    // Carregar dados específicos da seção
    if (secao === 'dashboard') {
        carregarDashboard();
    } else if (secao === 'produtos') {
        carregarProdutosSection();
    } else if (secao === 'clientes') {
        carregarClientesSection();
    } else if (secao === 'fornecedores') {
        carregarFornecedoresSection();
    } else if (secao === 'vendas') {
        carregarVendasSection();
    } else if (secao === 'caixa') {
        carregarCaixaSection();
    }
}

/**
 * Carregar dados do Dashboard
 */
async function carregarDashboard() {
    await Promise.all([
        carregarEstatisticasGerais(),
        carregarVendasRecentes(),
        carregarProdutosEstoqueBaixo()
    ]);
}

/**
 * Carregar estatísticas gerais
 */
async function carregarEstatisticasGerais() {
    try {
        // Vendas de hoje
        const vendasResponse = await fetch(`${API_URL}/vendas`);
        if (vendasResponse.ok) {
            const vendas = await vendasResponse.json();
            const hoje = new Date().toLocaleDateString('pt-BR');
            const vendasHoje = vendas.filter(v => {
                const dataVenda = new Date(v.data_venda.replace(' ', 'T')).toLocaleDateString('pt-BR');
                return dataVenda === hoje;
            });
            
            const totalVendasHoje = vendasHoje.reduce((sum, v) => sum + parseFloat(v.total), 0);
            document.getElementById('vendasHoje').textContent = `R$ ${totalVendasHoje.toFixed(2)}`;
            document.getElementById('qtdVendasHoje').textContent = `${vendasHoje.length} venda(s)`;
        }
        
        // Caixa
        const caixaResponse = await fetch(`${API_URL}/caixa/status`);
        if (caixaResponse.ok) {
            const caixa = await caixaResponse.json();
            if (caixa.aberto && caixa.caixa) {
                const saldo = parseFloat(caixa.caixa.valorAbertura) + 
                             parseFloat(caixa.caixa.totalVendas) + 
                             parseFloat(caixa.caixa.totalReforcos) - 
                             parseFloat(caixa.caixa.totalSangrias);
                document.getElementById('saldoCaixa').textContent = `R$ ${saldo.toFixed(2)}`;
                document.getElementById('statusCaixa').textContent = '✅ Caixa aberto';
            } else {
                document.getElementById('saldoCaixa').textContent = 'R$ 0,00';
                document.getElementById('statusCaixa').textContent = '🔒 Caixa fechado';
            }
        }
        
        // Produtos
        const produtosResponse = await fetch(`${API_URL}/produtos`);
        if (produtosResponse.ok) {
            const produtos = await produtosResponse.json();
            const produtosAtivos = produtos.filter(p => p.ativo);
            const produtosEstoque = produtos.filter(p => p.estoque > 0);
            document.getElementById('totalProdutos').textContent = produtosAtivos.length;
            document.getElementById('produtosEstoque').textContent = `${produtosEstoque.length} em estoque`;
            
            // Alertas (produtos com estoque baixo)
            const produtosEstoqueBaixo = produtos.filter(p => p.estoque > 0 && p.estoque <= 10);
            document.getElementById('totalAlertas').textContent = produtosEstoqueBaixo.length;
        }
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

/**
 * Carregar vendas recentes
 */
async function carregarVendasRecentes() {
    try {
        const response = await fetch(`${API_URL}/vendas`);
        if (!response.ok) return;
        
        const vendas = await response.json();
        const vendasRecentes = vendas.slice(0, 5);
        
        const container = document.getElementById('vendasRecentes');
        
        if (vendasRecentes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhuma venda registrada</p>';
            return;
        }
        
        container.innerHTML = vendasRecentes.map(venda => {
            const data = new Date(venda.data_venda.replace(' ', 'T'));
            const dataFormatada = data.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <div class="venda-item">
                    <div>
                        <strong>Venda #${venda.id}</strong>
                        <br>
                        <small>${dataFormatada} • ${venda.quantidade_itens} item(ns)</small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: #27ae60; font-size: 18px;">R$ ${parseFloat(venda.total).toFixed(2)}</strong>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar vendas recentes:', error);
    }
}

/**
 * Carregar produtos com estoque baixo
 */
async function carregarProdutosEstoqueBaixo() {
    try {
        const response = await fetch(`${API_URL}/produtos`);
        if (!response.ok) return;
        
        const produtos = await response.json();
        const produtosEstoqueBaixo = produtos
            .filter(p => p.estoque > 0 && p.estoque <= 10)
            .slice(0, 5);
        
        const container = document.getElementById('produtosEstoqueBaixo');
        
        if (produtosEstoqueBaixo.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #27ae60; padding: 20px;">✓ Todos os produtos com estoque adequado</p>';
            return;
        }
        
        container.innerHTML = produtosEstoqueBaixo.map(produto => {
            return `
                <div class="produto-item">
                    <div>
                        <strong>${produto.nome}</strong>
                        <br>
                        <small>Código: ${produto.codigo_barras}</small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: #e74c3c; font-size: 18px;">${produto.estoque} un.</strong>
                        <br>
                        <small style="color: #e74c3c;">⚠️ Estoque baixo</small>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar produtos com estoque baixo:', error);
    }
}

/**
 * Carregar seção de produtos
 */
async function carregarProdutosSection() {
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
                    placeholder="🔍 Buscar por nome ou código..."
                    onkeyup="aplicarFiltrosProdutosERP()"
                    style="flex: 1; min-width: 300px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                
                <select id="filtroStatusProdutoERP" onchange="aplicarFiltrosProdutosERP()" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
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
                <!-- Produtos serão renderizados aqui -->
            </div>
        `;
        
        // Armazenar produtos globalmente para filtros
        window.produtosERPCompletos = produtos;
        
        // Aplicar filtros iniciais (mostrar apenas ativos)
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
 * Aplicar filtros na lista de produtos do ERP
 */
function aplicarFiltrosProdutosERP() {
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
    
    // Renderizar produtos
    renderizarProdutosERP(produtosFiltrados);
}

/**
 * Renderizar lista de produtos no ERP
 */
function renderizarProdutosERP(produtos) {
    const container = document.getElementById('listaProdutosERP');
    
    if (produtos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhum produto encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = produtos.map(produto => {
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
               onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; this.style.transform='translateX(0)'">
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
                        <span>🏷️ Código: ${produto.codigo_barras}</span>
                        <span style="margin-left: 20px;">💵 R$ ${parseFloat(produto.preco).toFixed(2)}</span>
                        ${temDesconto ? `<span style="margin-left: 10px; text-decoration: line-through; color: #999;">R$ ${(parseFloat(produto.preco) / (1 - produto.desconto_percentual / 100)).toFixed(2)}</span>` : ''}
                    </div>
                </div>
                <div style="color: #007bff; font-size: 24px;">✏️</div>
            </div>
        `;
    }).join('');
}

/**
 * Editar produto diretamente do ERP
 */
function editarProdutoERP(id) {
    // Usar função existente de produtos.js
    if (typeof abrirEdicaoProduto === 'function') {
        abrirEdicaoProduto(id);
    } else {
        mostrarNotificacao('Função de edição não disponível', 'error');
    }
}

/**
 * Limpar filtros de produtos ERP
 */
function limparFiltrosProdutosERP() {
    document.getElementById('filtroBuscaProdutoERP').value = '';
    document.getElementById('filtroStatusProdutoERP').value = 'ativo';
    aplicarFiltrosProdutosERP();
}

/**
 * Carregar seção de clientes
 */
async function carregarClientesSection() {
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
                <!-- Clientes serão renderizados aqui -->
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

function aplicarFiltrosClientesERP() {
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

function renderizarClientesERP(clientes) {
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
               onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; this.style.transform='translateX(0)'">
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

function editarClienteERP(id) {
    if (typeof abrirEdicaoCliente === 'function') {
        abrirEdicaoCliente(id);
    } else {
        mostrarNotificacao('Função de edição não disponível', 'error');
    }
}

function limparFiltrosClientesERP() {
    document.getElementById('filtroBuscaClienteERP').value = '';
    document.getElementById('filtroStatusClienteERP').value = 'ativo';
    aplicarFiltrosClientesERP();
}

/**
 * Carregar seção de fornecedores
 */
async function carregarFornecedoresSection() {
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
                    placeholder="🔍 Buscar por nome, razão social ou CNPJ..."
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
                <!-- Fornecedores serão renderizados aqui -->
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

function aplicarFiltrosFornecedoresERP() {
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

function renderizarFornecedoresERP(fornecedores) {
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
               onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; this.style.transform='translateX(0)'">
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

function editarFornecedorERP(id) {
    if (typeof abrirEdicaoFornecedor === 'function') {
        abrirEdicaoFornecedor(id);
    } else {
        mostrarNotificacao('Função de edição não disponível', 'error');
    }
}

function limparFiltrosFornecedoresERP() {
    document.getElementById('filtroBuscaFornecedorERP').value = '';
    document.getElementById('filtroStatusFornecedorERP').value = 'ativo';
    aplicarFiltrosFornecedoresERP();
}

/**
 * Carregar seção de vendas
 */
async function carregarVendasSection() {
    const content = document.getElementById('vendas-content');
    content.innerHTML = '<p style="text-align: center; padding: 20px;">Carregando vendas...</p>';
    
    try {
        const response = await fetch(`${API_URL}/vendas`);
        if (!response.ok) throw new Error('Erro ao carregar vendas');
        
        const vendas = await response.json();
        
        content.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap;">
                <input 
                    type="text" 
                    id="filtroBuscaVendaERP" 
                    placeholder="🔍 Buscar por ID da venda..."
                    onkeyup="aplicarFiltrosVendasERP()"
                    style="flex: 1; min-width: 200px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                
                <select id="filtroPeriodoVendaERP" onchange="aplicarFiltrosVendasERP()" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    <option value="todos">Todos os Períodos</option>
                    <option value="hoje" selected>Hoje</option>
                    <option value="7dias">Últimos 7 dias</option>
                    <option value="30dias">Últimos 30 dias</option>
                </select>
                
                <button onclick="limparFiltrosVendasERP()" class="btn" style="background: #6c757d; color: white; padding: 12px 20px;">
                    🔄 Limpar Filtros
                </button>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <strong id="contadorVendasERP">0 venda(s) encontrada(s)</strong>
                <strong id="totalVendasERP" style="color: #28a745;">Total: R$ 0,00</strong>
            </div>
            
            <div id="listaVendasERP" style="display: grid; gap: 10px;">
                <!-- Vendas serão renderizadas aqui -->
            </div>
        `;
        
        window.vendasERPCompletas = vendas;
        aplicarFiltrosVendasERP();
        
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar vendas</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                <button onclick="carregarVendasSection()" class="btn btn-primary" style="margin-top: 20px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function aplicarFiltrosVendasERP() {
    if (!window.vendasERPCompletas) return;
    
    const busca = document.getElementById('filtroBuscaVendaERP').value.toLowerCase();
    const periodo = document.getElementById('filtroPeriodoVendaERP').value;
    
    let vendasFiltradas = [...window.vendasERPCompletas];
    
    // Filtro por ID
    if (busca) {
        vendasFiltradas = vendasFiltradas.filter(venda => 
            venda.id.toString().includes(busca)
        );
    }
    
    // Filtro por período
    if (periodo !== 'todos') {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        vendasFiltradas = vendasFiltradas.filter(venda => {
            const dataVenda = new Date(venda.data_venda.replace(' ', 'T'));
            dataVenda.setHours(0, 0, 0, 0);
            
            if (periodo === 'hoje') {
                return dataVenda.getTime() === hoje.getTime();
            } else if (periodo === '7dias') {
                const seteDiasAtras = new Date(hoje);
                seteDiasAtras.setDate(hoje.getDate() - 7);
                return dataVenda >= seteDiasAtras;
            } else if (periodo === '30dias') {
                const trintaDiasAtras = new Date(hoje);
                trintaDiasAtras.setDate(hoje.getDate() - 30);
                return dataVenda >= trintaDiasAtras;
            }
            return true;
        });
    }
    
    // Calcular total
    const totalVendas = vendasFiltradas.reduce((sum, venda) => sum + parseFloat(venda.total), 0);
    
    document.getElementById('contadorVendasERP').textContent = `${vendasFiltradas.length} venda(s) encontrada(s)`;
    document.getElementById('totalVendasERP').textContent = `Total: R$ ${totalVendas.toFixed(2)}`;
    
    renderizarVendasERP(vendasFiltradas);
}

function renderizarVendasERP(vendas) {
    const container = document.getElementById('listaVendasERP');
    
    if (vendas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhuma venda encontrada</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        return;
    }
    
    // Ordenar vendas da mais recente para a mais antiga
    vendas.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
    
    container.innerHTML = vendas.map(venda => {
        const data = new Date(venda.data_venda.replace(' ', 'T'));
        const dataFormatada = data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div onclick="verDetalhesVendaERP(${venda.id})" style="
                background: white; 
                padding: 20px; 
                border-radius: 8px; 
                border-left: 4px solid #28a745;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.transform='translateX(4px)'" 
               onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; this.style.transform='translateX(0)'">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <strong style="font-size: 18px;">Venda #${venda.id}</strong>
                        <span style="
                            background: #17a2b8; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">${venda.quantidade_itens} item(ns)</span>
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        <span>📅 ${dataFormatada}</span>
                        <span style="margin-left: 20px;">💵 Pago: R$ ${parseFloat(venda.valor_pago).toFixed(2)}</span>
                        ${parseFloat(venda.troco) > 0 ? `<span style="margin-left: 20px;">💰 Troco: R$ ${parseFloat(venda.troco).toFixed(2)}</span>` : ''}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: bold; color: #28a745;">
                        R$ ${parseFloat(venda.total).toFixed(2)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function verDetalhesVendaERP(id) {
    try {
        const response = await fetch(`${API_URL}/vendas/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar detalhes');
        
        const dados = await response.json();
        
        // Criar modal simples para mostrar detalhes
        let detalhesHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 20px auto;">
                <h2 style="margin-bottom: 20px;">📊 Detalhes da Venda #${id}</h2>
                
                <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <strong>Data:</strong> ${new Date(dados.venda.data_venda.replace(' ', 'T')).toLocaleString('pt-BR')}<br>
                    <strong>Itens:</strong> ${dados.venda.quantidade_itens}<br>
                    <strong>Total:</strong> R$ ${parseFloat(dados.venda.total).toFixed(2)}
                </div>
                
                <h3>🛒 Itens da Venda</h3>
                <div style="margin: 15px 0;">
                    ${dados.itens.map(item => `
                        <div style="padding: 10px; border-bottom: 1px solid #ddd;">
                            <strong>${item.nome_produto}</strong><br>
                            <span style="color: #666;">${item.quantidade} x R$ ${parseFloat(item.preco_unitario).toFixed(2)} = R$ ${parseFloat(item.subtotal).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                
                ${dados.formas_pagamento && dados.formas_pagamento.length > 0 ? `
                    <h3 style="margin-top: 20px;">💳 Formas de Pagamento</h3>
                    <div style="margin: 15px 0;">
                        ${dados.formas_pagamento.map(fp => {
                            const icones = { dinheiro: '💵', debito: '💳', credito: '💳', pix: '📱' };
                            const nomes = { dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pix: 'PIX' };
                            return `
                                <div style="padding: 10px; background: #f8f9fa; margin-bottom: 5px; border-radius: 4px;">
                                    ${icones[fp.forma_pagamento]} ${nomes[fp.forma_pagamento]}: <strong>R$ ${parseFloat(fp.valor).toFixed(2)}</strong>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        mostrarNotificacao('Clique para fechar', 'info');
        
        // Criar overlay temporário
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000; overflow: auto;';
        overlay.innerHTML = detalhesHTML;
        overlay.onclick = () => overlay.remove();
        document.body.appendChild(overlay);
        
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        mostrarNotificacao('Erro ao carregar detalhes da venda', 'error');
    }
}

function limparFiltrosVendasERP() {
    document.getElementById('filtroBuscaVendaERP').value = '';
    document.getElementById('filtroPeriodoVendaERP').value = 'hoje';
    aplicarFiltrosVendasERP();
}

/**
 * Carregar seção de caixa
 */
async function carregarCaixaSection() {
    const content = document.getElementById('caixa-content');
    content.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <button onclick="abrirMenuCaixa()" class="btn btn-primary" style="font-size: 18px; padding: 15px 30px;">
                💰 Abrir Gerenciador de Caixa
            </button>
        </div>
    `;
}

/**
 * Verificar conexão com servidor
 */
async function verificarConexaoERP() {
    try {
        const response = await fetch(`${API_URL}/produtos`);
        serverOnline = response.ok;
        
        const badge = document.getElementById('statusBadge');
        if (serverOnline) {
            badge.className = 'status-badge online';
            badge.textContent = '● Online';
        } else {
            badge.className = 'status-badge offline';
            badge.textContent = '● Offline';
        }
    } catch (error) {
        serverOnline = false;
        const badge = document.getElementById('statusBadge');
        badge.className = 'status-badge offline';
        badge.textContent = '● Servidor Offline';
    }
}

// ==================== RELATÓRIOS ====================

/**
 * Abrir modal de relatório de vendas por período
 */
function abrirRelatorioVendasPeriodo() {
    abrirModal('relatorioVendasPeriodoModal', () => {
        // Setar período padrão: últimos 30 dias
        setarPeriodoRelatorio('mes');
    });
}

/**
 * Setar período pré-definido
 */
function setarPeriodoRelatorio(tipo) {
    const hoje = new Date();
    const dataFinal = new Date(hoje);
    let dataInicial = new Date(hoje);
    
    switch(tipo) {
        case 'hoje':
            // Mesmo dia
            break;
        case 'ontem':
            dataInicial.setDate(hoje.getDate() - 1);
            dataFinal.setDate(hoje.getDate() - 1);
            break;
        case 'semana':
            // Domingo a hoje
            const diaSemana = hoje.getDay();
            dataInicial.setDate(hoje.getDate() - diaSemana);
            break;
        case 'mes':
            // Primeiro dia do mês
            dataInicial.setDate(1);
            break;
        case 'ano':
            // Primeiro dia do ano
            dataInicial.setMonth(0, 1);
            break;
    }
    
    // Formatar datas para input type="date"
    document.getElementById('dataInicialRelatorio').value = dataInicial.toISOString().split('T')[0];
    document.getElementById('dataFinalRelatorio').value = dataFinal.toISOString().split('T')[0];
}

/**
 * Gerar relatório de vendas
 */
async function gerarRelatorioVendas() {
    const dataInicial = document.getElementById('dataInicialRelatorio').value;
    const dataFinal = document.getElementById('dataFinalRelatorio').value;
    
    if (!dataInicial || !dataFinal) {
        mostrarNotificacao('⚠️ Selecione as datas inicial e final', 'error');
        return;
    }
    
    if (new Date(dataInicial) > new Date(dataFinal)) {
        mostrarNotificacao('⚠️ Data inicial não pode ser maior que data final', 'error');
        return;
    }
    
    const container = document.getElementById('resultadoRelatorioVendas');
    container.innerHTML = '<p style="text-align: center; padding: 40px;"><strong>Carregando relatório...</strong></p>';
    
    try {
        const response = await fetch(`${API_URL}/vendas`);
        if (!response.ok) throw new Error('Erro ao carregar vendas');
        
        const todasVendas = await response.json();
        
        // Filtrar vendas no período
        const vendas = todasVendas.filter(venda => {
            const dataVenda = new Date(venda.data_venda.replace(' ', 'T'));
            const dataVendaSemHora = new Date(dataVenda.toISOString().split('T')[0]);
            const inicial = new Date(dataInicial);
            const final = new Date(dataFinal);
            
            return dataVendaSemHora >= inicial && dataVendaSemHora <= final;
        });
        
        if (vendas.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📊</div>
                    <h3>Nenhuma venda encontrada no período</h3>
                    <p style="margin-top: 10px;">Tente selecionar um período diferente</p>
                </div>
            `;
            document.getElementById('btnImprimirRelatorio').disabled = true;
            return;
        }
        
        // Calcular estatísticas
        const totalVendas = vendas.length;
        const valorTotal = vendas.reduce((sum, v) => sum + parseFloat(v.total), 0);
        const ticketMedio = valorTotal / totalVendas;
        const totalItens = vendas.reduce((sum, v) => sum + parseInt(v.quantidade_itens), 0);
        
        // Agrupar vendas por dia
        const vendasPorDia = {};
        vendas.forEach(venda => {
            const data = new Date(venda.data_venda.replace(' ', 'T')).toLocaleDateString('pt-BR');
            if (!vendasPorDia[data]) {
                vendasPorDia[data] = { quantidade: 0, valor: 0 };
            }
            vendasPorDia[data].quantidade++;
            vendasPorDia[data].valor += parseFloat(venda.total);
        });
        
        // Renderizar relatório
        container.innerHTML = `
            <div class="relatorio-resultado" id="areaImpressao">
                <style>
                    @media print {
                        body * { visibility: hidden; }
                        #areaImpressao, #areaImpressao * { visibility: visible; }
                        #areaImpressao { position: absolute; left: 0; top: 0; width: 100%; }
                        .btn, button { display: none !important; }
                    }
                </style>
                
                <!-- Cabeçalho -->
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #007bff;">
                    <h2 style="margin: 0; color: #007bff;">📊 Relatório de Vendas por Período</h2>
                    <p style="margin: 10px 0 0 0; color: #666;">
                        Período: ${new Date(dataInicial).toLocaleDateString('pt-BR')} até ${new Date(dataFinal).toLocaleDateString('pt-BR')}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #999; font-size: 14px;">
                        Gerado em: ${new Date().toLocaleString('pt-BR')}
                    </p>
                </div>
                
                <!-- Cards de Estatísticas -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total de Vendas</div>
                        <div style="font-size: 36px; font-weight: bold;">${totalVendas}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Valor Total</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${valorTotal.toFixed(2)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Ticket Médio</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${ticketMedio.toFixed(2)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total de Itens</div>
                        <div style="font-size: 36px; font-weight: bold;">${totalItens}</div>
                    </div>
                </div>
                
                <!-- Vendas por Dia -->
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 30px;">
                    <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">📅 Vendas por Dia</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8f9fa;">
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Data</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Quantidade</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Valor Total</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Média por Venda</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(vendasPorDia)
                                    .sort((a, b) => {
                                        const [diaA, mesA, anoA] = a[0].split('/');
                                        const [diaB, mesB, anoB] = b[0].split('/');
                                        return new Date(anoB, mesB - 1, diaB) - new Date(anoA, mesA - 1, diaA);
                                    })
                                    .map(([data, stats]) => `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 12px;">${data}</td>
                                        <td style="padding: 12px; text-align: center; font-weight: bold; color: #007bff;">${stats.quantidade}</td>
                                        <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">R$ ${stats.valor.toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: right; color: #666;">R$ ${(stats.valor / stats.quantidade).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="background: #f8f9fa; font-weight: bold;">
                                    <td style="padding: 12px; border-top: 2px solid #ddd;">TOTAL</td>
                                    <td style="padding: 12px; text-align: center; border-top: 2px solid #ddd; color: #007bff;">${totalVendas}</td>
                                    <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: #28a745;">R$ ${valorTotal.toFixed(2)}</td>
                                    <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: #666;">R$ ${ticketMedio.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                
                <!-- Lista de Vendas -->
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">🛒 Detalhamento de Vendas</h3>
                    <div style="max-height: 500px; overflow-y: auto;">
                        <div id="listaVendasDetalhada">Carregando itens das vendas...</div>
                    </div>
                </div>
            </div>
        `;
        
        // Habilitar botão de impressão
        document.getElementById('btnImprimirRelatorio').disabled = false;
        
        // Carregar itens das vendas de forma assíncrona
        carregarItensVendasRelatorio(vendas);
        
        mostrarNotificacao('✅ Relatório gerado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao gerar relatório</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
        document.getElementById('btnImprimirRelatorio').disabled = true;
    }
}

/**
 * Imprimir relatório
 */
function imprimirRelatorioVendas() {
    window.print();
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ ERP Dashboard carregado');
    verificarConexaoERP();
    carregarDashboard();
    
    // Verificar conexão periodicamente
    setInterval(verificarConexaoERP, 5000);
    
    // Atualizar dashboard a cada 30 segundos
    setInterval(() => {
        if (document.querySelector('#dashboard-section.active')) {
            carregarDashboard();
        }
    }, 30000);
});

// Função auxiliar para abrir histórico de vendas
function abrirHistorico() {
    const modal = document.getElementById('historicoModal');
    if (modal) {
        abrirModal('historicoModal');
        // Carregar vendas via historico.js se existir
        if (typeof carregarHistoricoVendas === 'function') {
            carregarHistoricoVendas();
        }
    } else {
        mostrarNotificacao('Modal de histórico não encontrado', 'error');
    }
}

/**
 * Carregar itens das vendas para o relatório
 */
async function carregarItensVendasRelatorio(vendas) {
    const container = document.getElementById('listaVendasDetalhada');
    
    try {
        // Ordenar vendas da mais recente para a mais antiga
        const vendasOrdenadas = vendas.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
        
        // Buscar itens de todas as vendas em paralelo
        const promises = vendasOrdenadas.map(venda => 
            fetch(`${API_URL}/vendas/${venda.id}`)
                .then(res => res.json())
                .then(data => ({ venda, itens: data.itens, formas_pagamento: data.formas_pagamento }))
        );
        
        const vendasComItens = await Promise.all(promises);
        
        // Renderizar vendas com seus itens
        container.innerHTML = vendasComItens.map(({ venda, itens, formas_pagamento }) => {
            const data = new Date(venda.data_venda.replace(' ', 'T'));
            const dataFormatada = data.toLocaleString('pt-BR');
            
            // Mapear nomes das formas de pagamento
            const icones = { dinheiro: '💵', debito: '💳', credito: '💳', pix: '📱' };
            const nomes = { dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pix: 'PIX' };
            
            return `
                <div style="padding: 20px; border-bottom: 2px solid #e0e0e0; margin-bottom: 15px; background: #fafafa; border-radius: 8px;">
                    <!-- Cabeçalho da Venda -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ddd;">
                        <div>
                            <div style="font-weight: bold; color: #333; font-size: 18px; margin-bottom: 5px;">
                                🧾 Venda #${venda.id}
                                <span style="background: #007bff; color: white; padding: 3px 10px; border-radius: 12px; font-size: 13px; margin-left: 10px;">
                                    ${venda.quantidade_itens} item(ns)
                                </span>
                            </div>
                            <div style="font-size: 14px; color: #666;">
                                📅 ${dataFormatada}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 24px; font-weight: bold; color: #28a745;">
                                R$ ${parseFloat(venda.total).toFixed(2)}
                            </div>
                            ${parseFloat(venda.troco) > 0 ? `
                                <div style="font-size: 13px; color: #999;">
                                    💰 Troco: R$ ${parseFloat(venda.troco).toFixed(2)}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Itens da Venda -->
                    <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                        <div style="font-weight: bold; color: #555; margin-bottom: 10px; font-size: 14px;">📦 Itens:</div>
                        <table style="width: 100%; font-size: 14px;">
                            <thead>
                                <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd;">
                                    <th style="padding: 8px; text-align: left;">Produto</th>
                                    <th style="padding: 8px; text-align: center;">Qtd</th>
                                    <th style="padding: 8px; text-align: right;">Preço Unit.</th>
                                    <th style="padding: 8px; text-align: right;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itens.map(item => `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 8px;">
                                            <strong>${item.nome_produto}</strong><br>
                                            <span style="font-size: 12px; color: #999;">Cód: ${item.codigo_barras}</span>
                                        </td>
                                        <td style="padding: 8px; text-align: center; font-weight: bold; color: #007bff;">
                                            ${item.quantidade}
                                        </td>
                                        <td style="padding: 8px; text-align: right; color: #666;">
                                            R$ ${parseFloat(item.preco_unitario).toFixed(2)}
                                        </td>
                                        <td style="padding: 8px; text-align: right; font-weight: bold; color: #28a745;">
                                            R$ ${parseFloat(item.subtotal).toFixed(2)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Formas de Pagamento -->
                    ${formas_pagamento && formas_pagamento.length > 0 ? `
                        <div style="background: white; padding: 15px; border-radius: 6px;">
                            <div style="font-weight: bold; color: #555; margin-bottom: 10px; font-size: 14px;">💳 Pagamento:</div>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                ${formas_pagamento.map(fp => `
                                    <div style="background: #f8f9fa; padding: 8px 15px; border-radius: 6px; border-left: 3px solid #28a745;">
                                        <span style="font-size: 16px;">${icones[fp.forma_pagamento]}</span>
                                        <strong style="margin-left: 5px;">${nomes[fp.forma_pagamento]}:</strong>
                                        <span style="color: #28a745; font-weight: bold; margin-left: 5px;">R$ ${parseFloat(fp.valor).toFixed(2)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                <p>Erro ao carregar itens das vendas</p>
            </div>
        `;
    }
}

