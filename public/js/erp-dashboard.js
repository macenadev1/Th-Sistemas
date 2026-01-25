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
        try {
            const caixaResponse = await fetch(`${API_URL}/caixa/status`);
            if (caixaResponse.ok) {
                const caixa = await caixaResponse.json();
                console.log('Status do caixa:', caixa); // Debug
                
                const saldoElement = document.getElementById('saldoCaixa');
                const statusElement = document.getElementById('statusCaixa');
                
                if (saldoElement && statusElement) {
                    if (caixa.aberto && caixa.caixa) {
                        const saldo = parseFloat(caixa.caixa.valorAbertura || 0) + 
                                     parseFloat(caixa.caixa.totalVendas || 0) + 
                                     parseFloat(caixa.caixa.totalReforcos || 0) - 
                                     parseFloat(caixa.caixa.totalSangrias || 0);
                        saldoElement.textContent = `R$ ${saldo.toFixed(2)}`;
                        statusElement.textContent = '✅ Caixa aberto';
                        console.log('Saldo atualizado para:', saldo.toFixed(2)); // Debug
                    } else {
                        saldoElement.textContent = 'R$ 0,00';
                        statusElement.textContent = '🔒 Caixa fechado';
                    }
                }
            } else {
                console.error('Erro ao buscar status do caixa:', caixaResponse.status);
                const statusElement = document.getElementById('statusCaixa');
                if (statusElement) statusElement.textContent = '⚠️ Erro ao carregar';
            }
        } catch (error) {
            console.error('Erro ao carregar status do caixa:', error);
            const statusElement = document.getElementById('statusCaixa');
            if (statusElement) statusElement.textContent = '⚠️ Erro de conexão';
        }
        
        // Produtos
        const produtosResponse = await fetch(`${API_URL}/produtos`);
        if (produtosResponse.ok) {
            const produtos = await produtosResponse.json();
            const produtosAtivos = produtos.filter(p => p.ativo);
            const produtosEstoque = produtos.filter(p => p.estoque > 0);
            document.getElementById('totalProdutos').textContent = produtosAtivos.length;
            document.getElementById('produtosEstoque').textContent = `${produtosEstoque.length} em estoque`;
            
            // Alertas (produtos com estoque baixo ou zerado)
            const produtosEstoqueBaixo = produtos.filter(p => {
                const estoque = parseInt(p.estoque) || 0;
                const estoqueMinimo = parseInt(p.estoque_minimo) || 0;
                // Incluir: estoque zerado OU estoque menor/igual ao mínimo (se mínimo > 0)
                return estoque === 0 || (estoqueMinimo > 0 && estoque <= estoqueMinimo);
            });
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
            .filter(p => {
                const estoque = parseInt(p.estoque) || 0;
                const estoqueMinimo = parseInt(p.estoque_minimo) || 0;
                // Incluir: estoque zerado OU estoque menor/igual ao mínimo (se mínimo > 0)
                return estoque === 0 || (estoqueMinimo > 0 && estoque <= estoqueMinimo);
            })
            .sort((a, b) => {
                // Ordenar por criticidade: estoque zerado primeiro
                const estoqueA = parseInt(a.estoque) || 0;
                const estoqueB = parseInt(b.estoque) || 0;
                if (estoqueA === 0 && estoqueB !== 0) return -1;
                if (estoqueB === 0 && estoqueA !== 0) return 1;
                return estoqueA - estoqueB;
            })
            .slice(0, 5);
        
        const container = document.getElementById('produtosEstoqueBaixo');
        
        if (produtosEstoqueBaixo.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #27ae60; padding: 20px;">✓ Todos os produtos com estoque adequado</p>';
            return;
        }
        
        container.innerHTML = produtosEstoqueBaixo.map(produto => {
            const estoque = parseInt(produto.estoque) || 0;
            const estoqueMinimo = parseInt(produto.estoque_minimo) || 0;
            
            // Determinar status e cor
            let statusIcon = '⚠️';
            let statusText = 'Estoque baixo';
            let statusColor = '#ffc107';
            
            if (estoque === 0) {
                statusIcon = '⛔';
                statusText = 'ESGOTADO';
                statusColor = '#dc3545';
            } else if (estoque <= estoqueMinimo / 2) {
                statusIcon = '🔴';
                statusText = 'Crítico';
                statusColor = '#dc3545';
            }
            
            return `
                <div class="produto-item">
                    <div>
                        <strong>${produto.nome}</strong>
                        <br>
                        <small>Código: ${produto.codigo_barras} | Mín: ${estoqueMinimo}</small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: ${statusColor}; font-size: 18px;">${estoque} un.</strong>
                        <br>
                        <small style="color: ${statusColor};">${statusIcon} ${statusText}</small>
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
    // Carregar estado do caixa
    await carregarEstadoCaixa();
    
    const content = document.getElementById('caixa-content');
    
    const saldoAtual = caixaAberto 
        ? (caixaData.valorAbertura + caixaData.totalVendas + caixaData.totalReforcos - caixaData.totalSangrias)
        : 0;
    
    const statusCor = caixaAberto ? '#28a745' : '#dc3545';
    const statusTexto = caixaAberto ? '🔓 Caixa Aberto' : '🔒 Caixa Fechado';
    const statusBg = caixaAberto ? '#d4edda' : '#f8d7da';
    
    content.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
            <!-- Status do Caixa -->
            <div style="background: ${statusBg}; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; border-left: 4px solid ${statusCor};">
                <h3 style="margin: 0 0 10px 0; color: ${statusCor};">${statusTexto}</h3>
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${statusCor};">
                    Saldo Atual: R$ ${saldoAtual.toFixed(2)}
                </p>
            </div>
            
            <!-- Botões de Ação -->
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button 
                    type="button" 
                    onclick="abrirModalAberturaCaixa()" 
                    id="btnAbrirCaixaSection" 
                    class="btn btn-success" 
                    style="font-size: 18px; padding: 18px;"
                    ${caixaAberto ? 'disabled' : ''}>
                    🔓 Abrir Caixa
                </button>
                
                <button 
                    type="button" 
                    onclick="abrirModalReforcoCaixa()" 
                    id="btnReforcoCaixaSection" 
                    class="btn btn-primary" 
                    style="font-size: 18px; padding: 18px;"
                    ${!caixaAberto ? 'disabled' : ''}>
                    💵 Reforço de Caixa
                </button>
                
                <button 
                    type="button" 
                    onclick="abrirModalSangria()" 
                    id="btnSangriaSection" 
                    class="btn btn-warning" 
                    style="font-size: 18px; padding: 18px; background: #ff9800; border-color: #ff9800;"
                    ${!caixaAberto ? 'disabled' : ''}>
                    📉 Sangria
                </button>
                
                <button 
                    type="button" 
                    onclick="abrirModalFechamentoCaixa()" 
                    id="btnFecharCaixaSection" 
                    class="btn btn-danger" 
                    style="font-size: 18px; padding: 18px;"
                    ${!caixaAberto ? 'disabled' : ''}>
                    🔒 Fechar Caixa
                </button>
                
                <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
                
                <button 
                    type="button" 
                    onclick="abrirHistoricoFechamentos()" 
                    class="btn btn-info" 
                    style="font-size: 18px; padding: 18px; background: #6c757d; border-color: #6c757d;">
                    📊 Histórico de Fechamentos
                </button>
            </div>
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
function setarPeriodoRelatorio(tipo, botaoClicado) {
    // Remover animação de todos os botões de período
    const botoesPeriodo = document.querySelectorAll('[id^="btnPeriodo"]');
    botoesPeriodo.forEach(btn => {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
        btn.innerHTML = btn.innerHTML.replace(' ⏳', '').replace(' ✓', '');
    });
    
    // Adicionar feedback visual no botão clicado
    if (botaoClicado) {
        const textoOriginal = botaoClicado.innerHTML;
        botaoClicado.innerHTML = textoOriginal + ' ⏳';
        botaoClicado.style.opacity = '0.7';
        botaoClicado.style.transform = 'scale(0.95)';
        
        // Após definir o período, restaurar botão
        setTimeout(() => {
            botaoClicado.innerHTML = textoOriginal + ' ✓';
            botaoClicado.style.opacity = '1';
            botaoClicado.style.transform = 'scale(1)';
            
            // Remover checkmark após 2 segundos
            setTimeout(() => {
                botaoClicado.innerHTML = textoOriginal;
            }, 2000);
        }, 300);
    }
    
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
    
    // Mostrar notificação
    const nomesPeriodo = {
        'hoje': 'Hoje',
        'ontem': 'Ontem',
        'semana': 'Esta Semana',
        'mes': 'Este Mês',
        'ano': 'Este Ano'
    };
    mostrarNotificacao(`✓ Período selecionado: ${nomesPeriodo[tipo]}`, 'success');
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
            document.getElementById('btnExportarPDF').disabled = true;
            document.getElementById('btnExportarCSV').disabled = true;
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
        
        // Habilitar botão de exportação
        document.getElementById('btnExportarCSV').disabled = false;
        
        // Carregar itens das vendas de forma assíncrona
        carregarItensVendasRelatorio(vendas, dataInicial, dataFinal);
        
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
        document.getElementById('btnExportarCSV').disabled = true;
    }
}

/**
 * Exportar relatório para CSV
 */
function exportarRelatorioCSV() {
    if (!window.dadosRelatorioAtual || !window.dadosRelatorioAtual.vendas) {
        mostrarNotificacao('Gere o relatório primeiro!', 'error');
        return;
    }

    const { vendas, periodo } = window.dadosRelatorioAtual;
    
    // Cabeçalho do CSV
    let csv = 'Venda ID,Data/Hora,Produto,Código,Quantidade,Preço Unit.,Custo Unit.,Subtotal,Custo Total,Lucro,Margem %,Total Venda,Forma Pagamento\n';
    
    // Dados das vendas
    vendas.forEach(({ venda, itens, formas_pagamento }) => {
        const data = new Date(venda.data_venda.replace(' ', 'T'));
        const dataFormatada = data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Formas de pagamento concatenadas
        const nomes = { dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pix: 'PIX' };
        const pagamentosTexto = formas_pagamento && formas_pagamento.length > 0
            ? formas_pagamento.map(fp => `${nomes[fp.forma_pagamento]}: R$ ${parseFloat(fp.valor).toFixed(2)}`).join('; ')
            : '';
        
        itens.forEach((item, index) => {
            const precoUnit = parseFloat(item.preco_unitario);
            const custoUnit = parseFloat(item.preco_custo_unitario) || 0;
            const quantidade = parseInt(item.quantidade);
            const subtotal = parseFloat(item.subtotal);
            const custoTotal = custoUnit * quantidade;
            const lucro = subtotal - custoTotal;
            const margem = subtotal > 0 ? ((lucro / subtotal) * 100).toFixed(1) : '0.0';
            
            // Escapar aspas duplas no CSV
            const nomeProduto = item.nome_produto.replace(/"/g, '""');
            
            csv += `${venda.id},`;
            csv += `"${dataFormatada}",`;
            csv += `"${nomeProduto}",`;
            csv += `${item.codigo_barras},`;
            csv += `${quantidade},`;
            csv += `${precoUnit.toFixed(2)},`;
            csv += `${custoUnit.toFixed(2)},`;
            csv += `${subtotal.toFixed(2)},`;
            csv += `${custoTotal.toFixed(2)},`;
            csv += `${lucro.toFixed(2)},`;
            csv += `${margem},`;
            csv += index === 0 ? `${parseFloat(venda.total).toFixed(2)},` : ','; // Total venda apenas na primeira linha
            csv += index === 0 ? `"${pagamentosTexto}"` : ''; // Pagamento apenas na primeira linha
            csv += '\n';
        });
    });
    
    // Calcular totais
    const totalGeralVendas = vendas.reduce((sum, { venda }) => sum + parseFloat(venda.total), 0);
    const totalItensVendidos = vendas.reduce((sum, { venda }) => sum + parseInt(venda.quantidade_itens), 0);
    const quantidadeVendas = vendas.length;
    
    let totalCustos = 0;
    vendas.forEach(({ itens }) => {
        itens.forEach(item => {
            const custoPorItem = (parseFloat(item.preco_custo_unitario) || 0) * parseInt(item.quantidade);
            totalCustos += custoPorItem;
        });
    });
    
    const totalLucro = totalGeralVendas - totalCustos;
    const margemPercentual = totalGeralVendas > 0 ? ((totalLucro / totalGeralVendas) * 100).toFixed(1) : '0.0';
    
    // Linha de totais
    csv += '\n';
    csv += `TOTAIS,${quantidadeVendas} venda(s),,${totalItensVendidos},,,,${totalGeralVendas.toFixed(2)},${totalCustos.toFixed(2)},${totalLucro.toFixed(2)},${margemPercentual}%,,\n`;
    
    // Criar arquivo e download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const nomeArquivo = `relatorio_vendas_${periodo.dataInicial}_${periodo.dataFinal}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', nomeArquivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarNotificacao('✅ Arquivo CSV exportado com sucesso!', 'success');
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
async function carregarItensVendasRelatorio(vendas, dataInicial, dataFinal) {
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
        
        // Salvar dados do relatório para exportação
        window.dadosRelatorioAtual = {
            vendas: vendasComItens,
            periodo: {
                dataInicial: dataInicial,
                dataFinal: dataFinal
            }
        };
        
        // Calcular totais gerais - VENDAS + CUSTOS + LUCROS
        const totalGeralVendas = vendasComItens.reduce((sum, { venda }) => sum + parseFloat(venda.total), 0);
        const totalItensVendidos = vendasComItens.reduce((sum, { venda }) => sum + parseInt(venda.quantidade_itens), 0);
        const quantidadeVendas = vendasComItens.length;
        
        // Calcular custo total e lucro total
        let totalCustos = 0;
        vendasComItens.forEach(({ itens }) => {
            itens.forEach(item => {
                const custoPorItem = (parseFloat(item.preco_custo_unitario) || 0) * parseInt(item.quantidade);
                totalCustos += custoPorItem;
            });
        });
        
        const totalLucro = totalGeralVendas - totalCustos;
        const margemPercentual = totalGeralVendas > 0 ? ((totalLucro / totalGeralVendas) * 100).toFixed(1) : '0.0';
        
        // Mapear nomes das formas de pagamento
        const icones = { dinheiro: '💵', debito: '💳', credito: '💳', pix: '📱' };
        const nomes = { dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pix: 'PIX' };
        
        // Renderizar todas as vendas em uma única tabela
        container.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Venda</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Data/Hora</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Produto</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Qtd</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Preço Unit.</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Custo Unit.</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Subtotal</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Custo Total</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Lucro</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Margem %</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Total Venda</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Pagamento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vendasComItens.map(({ venda, itens, formas_pagamento }) => {
                            const data = new Date(venda.data_venda.replace(' ', 'T'));
                            const dataFormatada = data.toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            
                            // Criar string de formas de pagamento
                            let pagamentosTexto = '';
                            if (formas_pagamento && formas_pagamento.length > 0) {
                                pagamentosTexto = formas_pagamento.map(fp => 
                                    `${icones[fp.forma_pagamento]} ${nomes[fp.forma_pagamento]}: R$ ${parseFloat(fp.valor).toFixed(2)}`
                                ).join('<br>');
                            }
                            
                            // Renderizar cada item da venda como uma linha
                            return itens.map((item, index) => {
                                // Calcular lucratividade do item
                                const precoUnit = parseFloat(item.preco_unitario);
                                const custoUnit = parseFloat(item.preco_custo_unitario) || 0;
                                const quantidade = parseInt(item.quantidade);
                                const subtotal = parseFloat(item.subtotal);
                                const custoTotal = custoUnit * quantidade;
                                const lucro = subtotal - custoTotal;
                                const margem = subtotal > 0 ? ((lucro / subtotal) * 100).toFixed(1) : '0.0';
                                
                                // Cores para margem
                                let margemCor = '#28a745'; // Verde (boa margem)
                                if (parseFloat(margem) < 10) margemCor = '#dc3545'; // Vermelho (margem baixa)
                                else if (parseFloat(margem) < 30) margemCor = '#ffc107'; // Amarelo (margem média)
                                
                                return `
                                <tr style="border-bottom: 1px solid #eee; ${index === 0 ? 'border-top: 2px solid #007bff;' : ''}">
                                    ${index === 0 ? `
                                        <td rowspan="${itens.length}" style="padding: 12px; font-weight: bold; background: #f8f9fa; color: #007bff; border-right: 1px solid #ddd; vertical-align: top;">
                                            🧾 #${venda.id}<br>
                                            <span style="font-size: 11px; color: #666; font-weight: normal;">${venda.quantidade_itens} item(ns)</span>
                                        </td>
                                        <td rowspan="${itens.length}" style="padding: 12px; background: #f8f9fa; border-right: 1px solid #ddd; vertical-align: top; white-space: nowrap;">
                                            ${dataFormatada}
                                        </td>
                                    ` : ''}
                                    <td style="padding: 12px;">
                                        <strong>${item.nome_produto}</strong><br>
                                        <span style="font-size: 11px; color: #999;">Cód: ${item.codigo_barras}</span>
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-weight: bold; color: #007bff;">
                                        ${quantidade}
                                    </td>
                                    <td style="padding: 12px; text-align: right; color: #666;">
                                        R$ ${precoUnit.toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: right; color: #999; font-size: 13px;">
                                        R$ ${custoUnit.toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">
                                        R$ ${subtotal.toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: right; color: #dc3545; font-size: 13px;">
                                        R$ ${custoTotal.toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: right; font-weight: bold; color: ${lucro >= 0 ? '#28a745' : '#dc3545'};">
                                        R$ ${lucro.toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-weight: bold; color: ${margemCor}; font-size: 13px;">
                                        ${margem}%
                                    </td>
                                    ${index === 0 ? `
                                        <td rowspan="${itens.length}" style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; color: #28a745; background: #f8f9fa; border-left: 1px solid #ddd; vertical-align: top;">
                                            R$ ${parseFloat(venda.total).toFixed(2)}
                                            ${parseFloat(venda.troco) > 0 ? `<br><span style="font-size: 11px; color: #999; font-weight: normal;">Troco: R$ ${parseFloat(venda.troco).toFixed(2)}</span>` : ''}
                                        </td>
                                        <td rowspan="${itens.length}" style="padding: 12px; background: #f8f9fa; font-size: 12px; border-left: 1px solid #ddd; vertical-align: top;">
                                            ${pagamentosTexto}
                                        </td>
                                    ` : ''}
                                </tr>
                            `;
                            }).join('');
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; font-weight: bold; font-size: 16px;">
                            <td colspan="2" style="padding: 15px; text-align: left; border-top: 3px solid #ddd;">
                                📊 TOTAL GERAL
                            </td>
                            <td style="padding: 15px; text-align: left; border-top: 3px solid #ddd;">
                                ${quantidadeVendas} venda(s)
                            </td>
                            <td style="padding: 15px; text-align: center; border-top: 3px solid #ddd;">
                                ${totalItensVendidos}
                            </td>
                            <td colspan="2" style="padding: 15px; text-align: right; border-top: 3px solid #ddd;">
                                <!-- Espaço -->
                            </td>
                            <td style="padding: 15px; text-align: right; border-top: 3px solid #ddd; font-size: 20px;">
                                R$ ${totalGeralVendas.toFixed(2)}
                            </td>
                            <td style="padding: 15px; text-align: right; border-top: 3px solid #ddd; font-size: 16px; color: #ffe6e6;">
                                R$ ${totalCustos.toFixed(2)}
                            </td>
                            <td style="padding: 15px; text-align: right; border-top: 3px solid #ddd; font-size: 18px;">
                                R$ ${totalLucro.toFixed(2)}
                            </td>
                            <td style="padding: 15px; text-align: center; border-top: 3px solid #ddd; font-size: 18px;">
                                ${margemPercentual}%
                            </td>
                            <td colspan="2" style="padding: 15px; border-top: 3px solid #ddd;">
                                <!-- Espaço -->
                            </td>
                        </tr>
                        <tr style="background: #f8f9fa; font-size: 14px; color: #333;">
                            <td colspan="6" style="padding: 12px; text-align: right; font-weight: bold;">
                                💰 Resumo Financeiro:
                            </td>
                            <td style="padding: 12px; text-align: right;">
                                <strong style="color: #28a745;">Receita</strong>
                            </td>
                            <td style="padding: 12px; text-align: right;">
                                <strong style="color: #dc3545;">Custos</strong>
                            </td>
                            <td style="padding: 12px; text-align: right;">
                                <strong style="color: #007bff;">Lucro Líquido</strong>
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                <strong style="color: #6f42c1;">Margem</strong>
                            </td>
                            <td colspan="2" style="padding: 12px;">
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                <p>Erro ao carregar itens das vendas</p>
            </div>
        `;
    }
}

// ==================== RELATÓRIOS DE CAIXA ====================

/**
 * Abrir modal de relatório de caixa por período
 */
function abrirRelatorioCaixaPeriodo() {
    abrirModal('relatorioCaixaPeriodoModal', () => {
        // Setar período padrão: últimos 30 dias
        setarPeriodoRelatorioCaixa('mes');
    });
}

/**
 * Setar período pré-definido para relatório de caixa
 */
function setarPeriodoRelatorioCaixa(tipo, botaoClicado) {
    // Remover animação de todos os botões de período
    const botoesPeriodo = document.querySelectorAll('[id^="btnPeriodo"][id$="Caixa"]');
    botoesPeriodo.forEach(btn => {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
        btn.innerHTML = btn.innerHTML.replace(' ⏳', '').replace(' ✓', '');
    });
    
    // Adicionar feedback visual no botão clicado
    if (botaoClicado) {
        const textoOriginal = botaoClicado.innerHTML;
        botaoClicado.innerHTML = textoOriginal + ' ⏳';
        botaoClicado.style.opacity = '0.7';
        botaoClicado.style.transform = 'scale(0.95)';
        
        // Após definir o período, restaurar botão
        setTimeout(() => {
            botaoClicado.innerHTML = textoOriginal + ' ✓';
            botaoClicado.style.opacity = '1';
            botaoClicado.style.transform = 'scale(1)';
            
            // Remover checkmark após 2 segundos
            setTimeout(() => {
                botaoClicado.innerHTML = textoOriginal;
            }, 2000);
        }, 300);
    }
    
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
    document.getElementById('dataInicialRelatorioCaixa').value = dataInicial.toISOString().split('T')[0];
    document.getElementById('dataFinalRelatorioCaixa').value = dataFinal.toISOString().split('T')[0];
    
    // Mostrar notificação
    const nomesPeriodo = {
        'hoje': 'Hoje',
        'ontem': 'Ontem',
        'semana': 'Esta Semana',
        'mes': 'Este Mês',
        'ano': 'Este Ano'
    };
    mostrarNotificacao(`✓ Período selecionado: ${nomesPeriodo[tipo]}`, 'success');
}

/**
 * Gerar relatório de movimento de caixa
 */
async function gerarRelatorioCaixa() {
    const dataInicial = document.getElementById('dataInicialRelatorioCaixa').value;
    const dataFinal = document.getElementById('dataFinalRelatorioCaixa').value;
    
    if (!dataInicial || !dataFinal) {
        mostrarNotificacao('⚠️ Selecione as datas inicial e final', 'error');
        return;
    }
    
    if (new Date(dataInicial) > new Date(dataFinal)) {
        mostrarNotificacao('⚠️ Data inicial não pode ser maior que data final', 'error');
        return;
    }
    
    const container = document.getElementById('resultadoRelatorioCaixa');
    container.innerHTML = '<p style="text-align: center; padding: 40px;"><strong>Carregando relatório...</strong></p>';
    
    try {
        const response = await fetch(`${API_URL}/caixa/fechamentos`);
        if (!response.ok) throw new Error('Erro ao carregar fechamentos');
        
        const data = await response.json();
        console.log('📊 Dados retornados da API:', data);
        const todosFechamentos = data.fechamentos || [];
        console.log('📊 Total de fechamentos:', todosFechamentos.length);
        
        // Filtrar fechamentos no período
        const fechamentos = todosFechamentos.filter(fechamento => {
            // Validar se data existe e é válida
            if (!fechamento.dataHoraFechamento) {
                console.warn('⚠️ Fechamento sem data:', fechamento);
                return false;
            }
            
            const dataFechamento = new Date(fechamento.dataHoraFechamento);
            
            // Verificar se data é válida
            if (isNaN(dataFechamento.getTime())) {
                console.warn('⚠️ Data inválida:', fechamento.dataHoraFechamento);
                return false;
            }
            
            const dataFechamentoSemHora = new Date(dataFechamento.toISOString().split('T')[0]);
            const inicial = new Date(dataInicial);
            const final = new Date(dataFinal);
            
            console.log('📅 Comparando:', {
                fechamento: dataFechamentoSemHora.toISOString().split('T')[0],
                inicial: inicial.toISOString().split('T')[0],
                final: final.toISOString().split('T')[0],
                match: dataFechamentoSemHora >= inicial && dataFechamentoSemHora <= final
            });
            
            return dataFechamentoSemHora >= inicial && dataFechamentoSemHora <= final;
        });
        
        console.log('📊 Fechamentos após filtro:', fechamentos.length);
        
        if (fechamentos.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">💰</div>
                    <h3>Nenhum fechamento de caixa encontrado no período</h3>
                    <p style="margin-top: 10px;">Tente selecionar um período diferente</p>
                </div>
            `;
            document.getElementById('btnExportarCaixaCSV').disabled = true;
            return;
        }
        
        // Salvar dados para exportação CSV
        window.dadosRelatorioCaixaAtual = {
            fechamentos: fechamentos,
            periodo: {
                dataInicial: dataInicial,
                dataFinal: dataFinal
            }
        };
        
        // Calcular estatísticas
        const totalFechamentos = fechamentos.length;
        const totalAberturas = fechamentos.reduce((sum, f) => sum + parseFloat(f.valorAbertura), 0);
        const totalVendas = fechamentos.reduce((sum, f) => sum + parseFloat(f.totalVendas), 0);
        const totalReforcos = fechamentos.reduce((sum, f) => sum + parseFloat(f.totalReforcos), 0);
        const totalSangrias = fechamentos.reduce((sum, f) => sum + parseFloat(f.totalSangrias), 0);
        const totalDiferencas = fechamentos.reduce((sum, f) => sum + parseFloat(f.diferenca), 0);
        
        // Renderizar relatório
        container.innerHTML = `
            <div class="relatorio-resultado">
                
                <!-- Cabeçalho -->
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #ff9800;">
                    <h2 style="margin: 0; color: #ff9800;">💰 Relatório de Movimento de Caixa</h2>
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
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total de Fechamentos</div>
                        <div style="font-size: 36px; font-weight: bold;">${totalFechamentos}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total em Vendas</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${totalVendas.toFixed(2)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total em Reforços</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${totalReforcos.toFixed(2)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total em Sangrias</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${totalSangrias.toFixed(2)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, ${totalDiferencas >= 0 ? '#43e97b 0%, #38f9d7' : '#fa709a 0%, #ff6b6b'} 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Diferenças Total</div>
                        <div style="font-size: 36px; font-weight: bold;">${totalDiferencas >= 0 ? '+' : ''}R$ ${totalDiferencas.toFixed(2)}</div>
                    </div>
                </div>
                
                <!-- Tabela de Fechamentos -->
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow-x: auto;">
                    <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">📋 Detalhamento de Fechamentos</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%); color: white;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">ID</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Operador</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Data/Hora Abertura</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Data/Hora Fechamento</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Vlr. Abertura</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Vendas</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Reforços</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Sangrias</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Saldo Esperado</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Saldo Real</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Diferença</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fechamentos.map(f => {
                                const dataAbertura = new Date(f.dataHoraAbertura).toLocaleString('pt-BR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                });
                                const dataFechamento = new Date(f.dataHoraFechamento).toLocaleString('pt-BR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                });
                                const diferenca = parseFloat(f.diferenca);
                                const diferencaCor = diferenca === 0 ? '#666' : diferenca > 0 ? '#28a745' : '#dc3545';
                                const diferencaIcone = diferenca === 0 ? '=' : diferenca > 0 ? '↑' : '↓';
                                
                                return `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 12px; font-weight: bold; color: #007bff;">#${f.id}</td>
                                        <td style="padding: 12px;">${f.operador}</td>
                                        <td style="padding: 12px; text-align: center; white-space: nowrap;">${dataAbertura}</td>
                                        <td style="padding: 12px; text-align: center; white-space: nowrap;">${dataFechamento}</td>
                                        <td style="padding: 12px; text-align: right;">R$ ${parseFloat(f.valorAbertura).toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">R$ ${parseFloat(f.totalVendas).toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: right; color: #17a2b8;">R$ ${parseFloat(f.totalReforcos).toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: right; color: #ff9800;">R$ ${parseFloat(f.totalSangrias).toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: right; font-weight: bold;">R$ ${parseFloat(f.saldoEsperado).toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: right; font-weight: bold;">R$ ${parseFloat(f.saldoReal).toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: right; font-weight: bold; color: ${diferencaCor};">
                                            ${diferencaIcone} R$ ${Math.abs(diferenca).toFixed(2)}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background: #f8f9fa; font-weight: bold;">
                                <td colspan="4" style="padding: 12px; text-align: right; border-top: 2px solid #ddd;">TOTAIS:</td>
                                <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd;">R$ ${totalAberturas.toFixed(2)}</td>
                                <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: #28a745;">R$ ${totalVendas.toFixed(2)}</td>
                                <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: #17a2b8;">R$ ${totalReforcos.toFixed(2)}</td>
                                <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: #ff9800;">R$ ${totalSangrias.toFixed(2)}</td>
                                <td colspan="2" style="padding: 12px; border-top: 2px solid #ddd;"></td>
                                <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: ${totalDiferencas >= 0 ? '#28a745' : '#dc3545'};">
                                    ${totalDiferencas >= 0 ? '+' : ''}R$ ${totalDiferencas.toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
        
        // Habilitar botão de exportação
        document.getElementById('btnExportarCaixaCSV').disabled = false;
        
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
        document.getElementById('btnExportarCaixaCSV').disabled = true;
    }
}

/**
 * Exportar relatório de caixa para CSV
 */
function exportarRelatorioCaixaCSV() {
    if (!window.dadosRelatorioCaixaAtual || !window.dadosRelatorioCaixaAtual.fechamentos) {
        mostrarNotificacao('Gere o relatório primeiro!', 'error');
        return;
    }

    const { fechamentos, periodo } = window.dadosRelatorioCaixaAtual;
    
    // Cabeçalho do CSV
    let csv = 'ID,Operador,Data/Hora Abertura,Data/Hora Fechamento,Valor Abertura,Total Vendas,Total Reforços,Total Sangrias,Saldo Esperado,Saldo Real,Diferença\n';
    
    // Dados dos fechamentos
    fechamentos.forEach(f => {
        const dataAbertura = new Date(f.dataHoraAbertura).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const dataFechamento = new Date(f.dataHoraFechamento).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        
        csv += `${f.id},"${f.operador}","${dataAbertura}","${dataFechamento}",`;
        csv += `${parseFloat(f.valorAbertura).toFixed(2)},`;
        csv += `${parseFloat(f.totalVendas).toFixed(2)},`;
        csv += `${parseFloat(f.totalReforcos).toFixed(2)},`;
        csv += `${parseFloat(f.totalSangrias).toFixed(2)},`;
        csv += `${parseFloat(f.saldoEsperado).toFixed(2)},`;
        csv += `${parseFloat(f.saldoReal).toFixed(2)},`;
        csv += `${parseFloat(f.diferenca).toFixed(2)}\n`;
    });
    
    // Calcular totais
    const totalAberturas = fechamentos.reduce((sum, f) => sum + parseFloat(f.valorAbertura), 0);
    const totalVendas = fechamentos.reduce((sum, f) => sum + parseFloat(f.totalVendas), 0);
    const totalReforcos = fechamentos.reduce((sum, f) => sum + parseFloat(f.totalReforcos), 0);
    const totalSangrias = fechamentos.reduce((sum, f) => sum + parseFloat(f.totalSangrias), 0);
    const totalDiferencas = fechamentos.reduce((sum, f) => sum + parseFloat(f.diferenca), 0);
    
    // Linha de totais
    csv += '\n';
    csv += `TOTAIS,${fechamentos.length} fechamento(s),,,`;
    csv += `${totalAberturas.toFixed(2)},`;
    csv += `${totalVendas.toFixed(2)},`;
    csv += `${totalReforcos.toFixed(2)},`;
    csv += `${totalSangrias.toFixed(2)},,,`;
    csv += `${totalDiferencas.toFixed(2)}\n`;
    
    // Criar arquivo e download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const nomeArquivo = `relatorio_caixa_${periodo.dataInicial}_${periodo.dataFinal}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', nomeArquivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarNotificacao('✅ Arquivo CSV exportado com sucesso!', 'success');
}

// ==================== RELATÓRIOS DE PRODUTOS MAIS VENDIDOS ====================

/**
 * Abrir modal de relatório de produtos mais vendidos
 */
function abrirRelatorioProdutosVendidos() {
    abrirModal('relatorioProdutosVendidosModal', () => {
        // Setar período padrão: últimos 30 dias
        setarPeriodoRelatorioProdutos('mes');
    });
}

/**
 * Setar período pré-definido para relatório de produtos
 */
function setarPeriodoRelatorioProdutos(tipo, botaoClicado) {
    // Remover animação de todos os botões de período
    const botoesPeriodo = document.querySelectorAll('[id^="btnPeriodo"][id$="Produtos"]');
    botoesPeriodo.forEach(btn => {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
        btn.innerHTML = btn.innerHTML.replace(' ⏳', '').replace(' ✓', '');
    });
    
    // Adicionar feedback visual no botão clicado
    if (botaoClicado) {
        const textoOriginal = botaoClicado.innerHTML;
        botaoClicado.innerHTML = textoOriginal + ' ⏳';
        botaoClicado.style.opacity = '0.7';
        botaoClicado.style.transform = 'scale(0.95)';
        
        // Após definir o período, restaurar botão
        setTimeout(() => {
            botaoClicado.innerHTML = textoOriginal + ' ✓';
            botaoClicado.style.opacity = '1';
            botaoClicado.style.transform = 'scale(1)';
            
            // Remover checkmark após 2 segundos
            setTimeout(() => {
                botaoClicado.innerHTML = textoOriginal;
            }, 2000);
        }, 300);
    }
    
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
    document.getElementById('dataInicialRelatorioProdutos').value = dataInicial.toISOString().split('T')[0];
    document.getElementById('dataFinalRelatorioProdutos').value = dataFinal.toISOString().split('T')[0];
    
    // Mostrar notificação
    const nomesPeriodo = {
        'hoje': 'Hoje',
        'ontem': 'Ontem',
        'semana': 'Esta Semana',
        'mes': 'Este Mês',
        'ano': 'Este Ano'
    };
    mostrarNotificacao(`✓ Período selecionado: ${nomesPeriodo[tipo]}`, 'success');
}

/**
 * Gerar relatório de produtos mais vendidos
 */
async function gerarRelatorioProdutosVendidos() {
    const dataInicial = document.getElementById('dataInicialRelatorioProdutos').value;
    const dataFinal = document.getElementById('dataFinalRelatorioProdutos').value;
    
    if (!dataInicial || !dataFinal) {
        mostrarNotificacao('⚠️ Selecione as datas inicial e final', 'error');
        return;
    }
    
    if (new Date(dataInicial) > new Date(dataFinal)) {
        mostrarNotificacao('⚠️ Data inicial não pode ser maior que data final', 'error');
        return;
    }
    
    const container = document.getElementById('resultadoRelatorioProdutos');
    container.innerHTML = '<p style="text-align: center; padding: 40px;"><strong>Carregando relatório...</strong></p>';
    
    try {
        // Buscar todas as vendas no período
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
                    <div style="font-size: 64px; margin-bottom: 20px;">📦</div>
                    <h3>Nenhuma venda encontrada no período</h3>
                    <p style="margin-top: 10px;">Tente selecionar um período diferente</p>
                </div>
            `;
            document.getElementById('btnExportarProdutosCSV').disabled = true;
            return;
        }
        
        // Buscar itens de todas as vendas em paralelo
        const promessasItens = vendas.map(venda => 
            fetch(`${API_URL}/vendas/${venda.id}`)
                .then(res => res.json())
                .then(data => data.itens || [])
        );
        
        const todasItens = await Promise.all(promessasItens);
        const itensVendidos = todasItens.flat();
        
        if (itensVendidos.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📦</div>
                    <h3>Nenhum produto vendido no período</h3>
                </div>
            `;
            document.getElementById('btnExportarProdutosCSV').disabled = true;
            return;
        }
        
        // Agrupar produtos e calcular estatísticas
        const produtosMap = {};
        
        itensVendidos.forEach(item => {
            const nomeProduto = item.nome_produto;
            if (!produtosMap[nomeProduto]) {
                produtosMap[nomeProduto] = {
                    nome: nomeProduto,
                    quantidadeTotal: 0,
                    totalVendas: 0,
                    numeroVendas: 0,
                    precos: []
                };
            }
            
            produtosMap[nomeProduto].quantidadeTotal += parseInt(item.quantidade);
            produtosMap[nomeProduto].totalVendas += parseFloat(item.subtotal);
            produtosMap[nomeProduto].numeroVendas++;
            produtosMap[nomeProduto].precos.push(parseFloat(item.preco_unitario));
        });
        
        // Converter para array e ordenar por quantidade
        const produtos = Object.values(produtosMap)
            .map(p => ({
                ...p,
                precoMedio: p.precos.reduce((sum, preco) => sum + preco, 0) / p.precos.length
            }))
            .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal)
            .slice(0, 50); // Top 50
        
        // Salvar dados para exportação
        window.dadosRelatorioProdutosAtual = {
            produtos: produtos,
            periodo: {
                dataInicial: dataInicial,
                dataFinal: dataFinal
            }
        };
        
        // Calcular totais gerais
        const totalQuantidade = produtos.reduce((sum, p) => sum + p.quantidadeTotal, 0);
        const totalVendas = produtos.reduce((sum, p) => sum + p.totalVendas, 0);
        
        // Renderizar relatório
        container.innerHTML = `
            <div class="relatorio-resultado">
                
                <!-- Cabeçalho -->
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #667eea;">
                    <h2 style="margin: 0; color: #667eea;">📦 Relatório de Produtos Mais Vendidos</h2>
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
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Produtos Diferentes</div>
                        <div style="font-size: 36px; font-weight: bold;">${produtos.length}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Quantidade Total Vendida</div>
                        <div style="font-size: 36px; font-weight: bold;">${totalQuantidade}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Receita Total</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${totalVendas.toFixed(2)}</div>
                    </div>
                </div>
                
                <!-- Ranking de Produtos -->
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">🏆 Ranking de Produtos</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Posição</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Produto</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Quantidade Vendida</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Total Vendas</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Preço Médio</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">% do Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${produtos.map((produto, index) => {
                                    const posicao = index + 1;
                                    const percentual = (produto.quantidadeTotal / totalQuantidade * 100).toFixed(1);
                                    const barWidth = Math.min(percentual, 100);
                                    
                                    let icone = '';
                                    if (posicao === 1) icone = '🥇';
                                    else if (posicao === 2) icone = '🥈';
                                    else if (posicao === 3) icone = '🥉';
                                    else icone = `${posicao}º`;
                                    
                                    return `
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding: 12px; text-align: center; font-size: 20px; font-weight: bold;">${icone}</td>
                                            <td style="padding: 12px;">
                                                <div style="font-weight: bold; margin-bottom: 5px;">${produto.nome}</div>
                                                <div style="background: #e3f2fd; height: 8px; border-radius: 4px; overflow: hidden;">
                                                    <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); width: ${barWidth}%; height: 100%; transition: width 0.5s;"></div>
                                                </div>
                                            </td>
                                            <td style="padding: 12px; text-align: center; font-weight: bold; color: #667eea; font-size: 18px;">${produto.quantidadeTotal}</td>
                                            <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">R$ ${produto.totalVendas.toFixed(2)}</td>
                                            <td style="padding: 12px; text-align: right; color: #666;">R$ ${produto.precoMedio.toFixed(2)}</td>
                                            <td style="padding: 12px; text-align: center; color: #666;">${percentual}%</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="background: #f8f9fa; font-weight: bold;">
                                    <td colspan="2" style="padding: 12px; text-align: right; border-top: 2px solid #ddd;">TOTAL:</td>
                                    <td style="padding: 12px; text-align: center; border-top: 2px solid #ddd; color: #667eea;">${totalQuantidade}</td>
                                    <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: #28a745;">R$ ${totalVendas.toFixed(2)}</td>
                                    <td colspan="2" style="padding: 12px; border-top: 2px solid #ddd;"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Habilitar botão de exportação
        document.getElementById('btnExportarProdutosCSV').disabled = false;
        
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
        document.getElementById('btnExportarProdutosCSV').disabled = true;
    }
}

/**
 * Exportar relatório de produtos para CSV
 */
function exportarRelatorioProdutosCSV() {
    if (!window.dadosRelatorioProdutosAtual || !window.dadosRelatorioProdutosAtual.produtos) {
        mostrarNotificacao('Gere o relatório primeiro!', 'error');
        return;
    }

    const { produtos, periodo } = window.dadosRelatorioProdutosAtual;
    
    // Cabeçalho do CSV
    let csv = 'Posição,Produto,Quantidade Vendida,Total Vendas (R$),Preço Médio (R$),% do Total\n';
    
    // Calcular total para percentuais
    const totalQuantidade = produtos.reduce((sum, p) => sum + p.quantidadeTotal, 0);
    
    // Dados dos produtos
    produtos.forEach((produto, index) => {
        const percentual = (produto.quantidadeTotal / totalQuantidade * 100).toFixed(1);
        
        csv += `${index + 1}º,"${produto.nome}",`;
        csv += `${produto.quantidadeTotal},`;
        csv += `${produto.totalVendas.toFixed(2)},`;
        csv += `${produto.precoMedio.toFixed(2)},`;
        csv += `${percentual}%\n`;
    });
    
    // Linha de totais
    const totalVendas = produtos.reduce((sum, p) => sum + p.totalVendas, 0);
    csv += '\n';
    csv += `TOTAL,${produtos.length} produto(s),${totalQuantidade},${totalVendas.toFixed(2)},,100%\n`;
    
    // Criar arquivo e download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const nomeArquivo = `produtos_mais_vendidos_${periodo.dataInicial}_${periodo.dataFinal}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', nomeArquivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarNotificacao('✅ Arquivo CSV exportado com sucesso!', 'success');
}

// ==================== RELATÓRIO DE ESTOQUE BAIXO ====================

// Variáveis globais para filtros
let produtosEstoqueBaixoCompleto = [];

/**
 * Abrir modal de relatório de estoque baixo
 */
function abrirRelatorioEstoqueBaixo() {
    abrirModal('relatorioEstoqueBaixoModal', () => {
        // Gerar relatório automaticamente ao abrir
        gerarRelatorioEstoqueBaixo();
    });
}

/**
 * Gerar relatório de produtos com estoque baixo
 */
async function gerarRelatorioEstoqueBaixo() {
    const container = document.getElementById('resultadoEstoqueBaixo');
    container.innerHTML = '<p style="text-align: center; padding: 40px;"><strong>Carregando produtos...</strong></p>';
    
    try {
        const response = await fetch(`${API_URL}/produtos`);
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        
        const todosProdutos = await response.json();
        
        // Filtrar apenas produtos ativos
        produtosEstoqueBaixoCompleto = todosProdutos.filter(p => p.ativo === 1 || p.ativo === true);
        
        // Aplicar filtros e renderizar
        aplicarFiltrosEstoqueBaixo();
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao gerar relatório</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Aplicar filtros de busca e situação
 */
function aplicarFiltrosEstoqueBaixo() {
    const container = document.getElementById('resultadoEstoqueBaixo');
    const busca = document.getElementById('buscaEstoqueBaixo').value.toLowerCase();
    const situacao = document.getElementById('filtroSituacaoEstoque').value;
    
    // Filtrar produtos
    let produtosFiltrados = produtosEstoqueBaixoCompleto.filter(produto => {
        // Filtro de busca
        const matchBusca = !busca || 
            produto.nome.toLowerCase().includes(busca) || 
            produto.codigo_barras.toLowerCase().includes(busca);
        
        if (!matchBusca) return false;
        
        // Filtro de situação
        const estoque = parseInt(produto.estoque) || 0;
        const estoqueMinimo = parseInt(produto.estoque_minimo) || 0;
        
        switch(situacao) {
            case 'critico':
                return estoque === 0;
            case 'baixo':
                return estoque > 0 && estoque < estoqueMinimo;
            case 'alerta':
                return estoque === estoqueMinimo && estoqueMinimo > 0;
            case 'todos':
                return estoque <= estoqueMinimo;
            default:
                return true;
        }
    });
    
    // Ordenar por criticidade: 0 estoque primeiro, depois menor estoque
    produtosFiltrados.sort((a, b) => {
        const estoqueA = parseInt(a.estoque) || 0;
        const estoqueB = parseInt(b.estoque) || 0;
        
        if (estoqueA === 0 && estoqueB !== 0) return -1;
        if (estoqueB === 0 && estoqueA !== 0) return 1;
        
        return estoqueA - estoqueB;
    });
    
    if (produtosFiltrados.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #28a745;">
                <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
                <h3>Nenhum produto com estoque baixo!</h3>
                <p style="margin-top: 10px; color: #666;">Todos os produtos estão com estoque adequado.</p>
            </div>
        `;
        document.getElementById('btnExportarEstoqueBaixoCSV').disabled = true;
        return;
    }
    
    // Salvar dados para exportação
    window.dadosEstoqueBaixoAtual = produtosFiltrados;
    
    // Calcular estatísticas
    const criticos = produtosFiltrados.filter(p => parseInt(p.estoque) === 0).length;
    const baixos = produtosFiltrados.filter(p => {
        const est = parseInt(p.estoque);
        const min = parseInt(p.estoque_minimo) || 0;
        return est > 0 && est < min;
    }).length;
    const alertas = produtosFiltrados.filter(p => {
        const est = parseInt(p.estoque);
        const min = parseInt(p.estoque_minimo) || 0;
        return est === min && min > 0;
    }).length;
    
    // Renderizar relatório
    container.innerHTML = `
        <div class="relatorio-resultado">
            
            <!-- Cards de Estatísticas -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">⛔ Estoque Zerado</div>
                    <div style="font-size: 48px; font-weight: bold;">${criticos}</div>
                </div>
                <div style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">⚠️ Estoque Baixo</div>
                    <div style="font-size: 48px; font-weight: bold;">${baixos}</div>
                </div>
                <div style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">🔔 Em Alerta</div>
                    <div style="font-size: 48px; font-weight: bold;">${alertas}</div>
                </div>
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">📦 Total de Produtos</div>
                    <div style="font-size: 48px; font-weight: bold;">${produtosFiltrados.length}</div>
                </div>
            </div>
            
            <!-- Lista de Produtos -->
            <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
                    📋 Produtos para Reposição
                </h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Código</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Produto</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Estoque Atual</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Estoque Mínimo</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Necessário</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Fornecedor</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Categoria</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${produtosFiltrados.map(produto => {
                                const estoque = parseInt(produto.estoque) || 0;
                                const estoqueMinimo = parseInt(produto.estoque_minimo) || 0;
                                const necessario = Math.max(0, estoqueMinimo - estoque);
                                
                                let statusIcon = '';
                                let statusColor = '';
                                let statusText = '';
                                let rowBg = '';
                                
                                if (estoque === 0) {
                                    statusIcon = '⛔';
                                    statusColor = '#dc3545';
                                    statusText = 'CRÍTICO';
                                    rowBg = '#ffe6e6';
                                } else if (estoque < estoqueMinimo) {
                                    statusIcon = '⚠️';
                                    statusColor = '#ffc107';
                                    statusText = 'BAIXO';
                                    rowBg = '#fff9e6';
                                } else {
                                    statusIcon = '🔔';
                                    statusColor = '#17a2b8';
                                    statusText = 'ALERTA';
                                    rowBg = '#e6f7ff';
                                }
                                
                                return `
                                    <tr style="border-bottom: 1px solid #eee; background: ${rowBg}; transition: all 0.2s;"
                                        onmouseover="this.style.background='#f0f0f0'"
                                        onmouseout="this.style.background='${rowBg}'">
                                        <td style="padding: 12px;">
                                            <div style="display: flex; align-items: center; gap: 5px;">
                                                <span style="font-size: 20px;">${statusIcon}</span>
                                                <span style="font-weight: bold; color: ${statusColor}; font-size: 12px;">${statusText}</span>
                                            </div>
                                        </td>
                                        <td style="padding: 12px; font-family: monospace; color: #666;">${produto.codigo_barras}</td>
                                        <td style="padding: 12px; font-weight: 500;">${produto.nome}</td>
                                        <td style="padding: 12px; text-align: center; font-size: 18px; font-weight: bold; color: ${statusColor};">
                                            ${estoque}
                                        </td>
                                        <td style="padding: 12px; text-align: center; color: #666;">${estoqueMinimo}</td>
                                        <td style="padding: 12px; text-align: center; font-weight: bold; color: #28a745; font-size: 16px;">
                                            ${necessario > 0 ? `+${necessario}` : '—'}
                                        </td>
                                        <td style="padding: 12px; color: #666;">
                                            ${produto.fornecedor_nome ? `🏭 ${produto.fornecedor_nome}` : '—'}
                                        </td>
                                        <td style="padding: 12px; color: #666;">
                                            ${produto.categoria_nome ? `🏷️ ${produto.categoria_nome}` : '—'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    // Habilitar botão de exportação
    document.getElementById('btnExportarEstoqueBaixoCSV').disabled = false;
    
    mostrarNotificacao(`✅ ${produtosFiltrados.length} produto(s) encontrado(s)`, 'success');
}

/**
 * Exportar relatório de estoque baixo para CSV
 */
function exportarEstoqueBaixoCSV() {
    if (!window.dadosEstoqueBaixoAtual || window.dadosEstoqueBaixoAtual.length === 0) {
        mostrarNotificacao('Gere o relatório primeiro!', 'error');
        return;
    }

    const produtos = window.dadosEstoqueBaixoAtual;
    
    // Cabeçalho do CSV
    let csv = 'Status,Código,Produto,Estoque Atual,Estoque Mínimo,Necessário Repor,Fornecedor,Categoria\n';
    
    // Dados dos produtos
    produtos.forEach(produto => {
        const estoque = parseInt(produto.estoque) || 0;
        const estoqueMinimo = parseInt(produto.estoque_minimo) || 0;
        const necessario = Math.max(0, estoqueMinimo - estoque);
        
        let status = '';
        if (estoque === 0) status = 'CRÍTICO';
        else if (estoque < estoqueMinimo) status = 'BAIXO';
        else status = 'ALERTA';
        
        csv += `${status},"${produto.codigo_barras}","${produto.nome}",`;
        csv += `${estoque},${estoqueMinimo},${necessario},`;
        csv += `"${produto.fornecedor_nome || ''}","${produto.categoria_nome || ''}"\n`;
    });
    
    // Criar arquivo e download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `estoque_baixo_${dataAtual}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', nomeArquivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarNotificacao('✅ Arquivo CSV exportado com sucesso!', 'success');
}

async function carregarItensVendasRelatorio(vendas, dataInicial, dataFinal) {
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
        
        // Salvar dados do relatório para exportação
        window.dadosRelatorioAtual = {
            vendas: vendasComItens,
            periodo: {
                dataInicial: dataInicial,
                dataFinal: dataFinal
            }
        };
        
        // Calcular totais gerais - VENDAS + CUSTOS + LUCROS
        const totalGeralVendas = vendasComItens.reduce((sum, { venda }) => sum + parseFloat(venda.total), 0);
        const totalItensVendidos = vendasComItens.reduce((sum, { venda }) => sum + parseInt(venda.quantidade_itens), 0);
        const quantidadeVendas = vendasComItens.length;
        
        // Calcular custo total e lucro total
        let totalCustos = 0;
        vendasComItens.forEach(({ itens }) => {
            itens.forEach(item => {
                const custoPorItem = (parseFloat(item.preco_custo_unitario) || 0) * parseInt(item.quantidade);
                totalCustos += custoPorItem;
            });
        });
        
        const totalLucro = totalGeralVendas - totalCustos;
        const margemPercentual = totalGeralVendas > 0 ? ((totalLucro / totalGeralVendas) * 100).toFixed(1) : '0.0';
        
        // Mapear nomes das formas de pagamento
        const icones = { dinheiro: '💵', debito: '💳', credito: '💳', pix: '📱' };
        const nomes = { dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pix: 'PIX' };
        
        // Renderizar todas as vendas em uma única tabela
        container.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Venda</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Data/Hora</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Produto</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Qtd</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Preço Unit.</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Custo Unit.</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Subtotal</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Custo Total</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Lucro</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Margem %</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Total Venda</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; position: sticky; top: 0;">Pagamento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vendasComItens.map(({ venda, itens, formas_pagamento }) => {
                            const data = new Date(venda.data_venda.replace(' ', 'T'));
                            const dataFormatada = data.toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            
                            // Criar string de formas de pagamento
                            let pagamentosTexto = '';
                            if (formas_pagamento && formas_pagamento.length > 0) {
                                pagamentosTexto = formas_pagamento.map(fp => 
                                    `${icones[fp.forma_pagamento]} ${nomes[fp.forma_pagamento]}: R$ ${parseFloat(fp.valor).toFixed(2)}`
                                ).join('<br>');
                            }
                            
                            // Renderizar cada item da venda como uma linha
                            return itens.map((item, index) => {
                                // Calcular lucratividade do item
                                const precoUnit = parseFloat(item.preco_unitario);
                                const custoUnit = parseFloat(item.preco_custo_unitario) || 0;
                                const quantidade = parseInt(item.quantidade);
                                const subtotal = parseFloat(item.subtotal);
                                const custoTotal = custoUnit * quantidade;
                                const lucro = subtotal - custoTotal;
                                const margem = subtotal > 0 ? ((lucro / subtotal) * 100).toFixed(1) : '0.0';
                                
                                // Cores para margem
                                let margemCor = '#28a745'; // Verde (boa margem)
                                if (parseFloat(margem) < 10) margemCor = '#dc3545'; // Vermelho (margem baixa)
                                else if (parseFloat(margem) < 30) margemCor = '#ffc107'; // Amarelo (margem média)
                                
                                return `
                                <tr style="border-bottom: 1px solid #eee; ${index === 0 ? 'border-top: 2px solid #007bff;' : ''}">
                                    ${index === 0 ? `
                                        <td rowspan="${itens.length}" style="padding: 12px; font-weight: bold; background: #f8f9fa; color: #007bff; border-right: 1px solid #ddd; vertical-align: top;">
                                            🧾 #${venda.id}<br>
                                            <span style="font-size: 11px; color: #666; font-weight: normal;">${venda.quantidade_itens} item(ns)</span>
                                        </td>
                                        <td rowspan="${itens.length}" style="padding: 12px; background: #f8f9fa; border-right: 1px solid #ddd; vertical-align: top; white-space: nowrap;">
                                            ${dataFormatada}
                                        </td>
                                    ` : ''}
                                    <td style="padding: 12px;">
                                        <strong>${item.nome_produto}</strong><br>
                                        <span style="font-size: 11px; color: #999;">Cód: ${item.codigo_barras}</span>
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-weight: bold; color: #007bff;">
                                        ${quantidade}
                                    </td>
                                    <td style="padding: 12px; text-align: right; color: #666;">
                                        R$ ${precoUnit.toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: right; color: #999; font-size: 13px;">
                                        R$ ${custoUnit.toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">
                                        R$ ${subtotal.toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: right; color: #dc3545; font-size: 13px;">
                                        R$ ${custoTotal.toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: right; font-weight: bold; color: ${lucro >= 0 ? '#28a745' : '#dc3545'};">
                                        R$ ${lucro.toFixed(2)}
                                    </td>
                                    <td style="padding: 12px; text-align: center; font-weight: bold; color: ${margemCor}; font-size: 13px;">
                                        ${margem}%
                                    </td>
                                    ${index === 0 ? `
                                        <td rowspan="${itens.length}" style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; color: #28a745; background: #f8f9fa; border-left: 1px solid #ddd; vertical-align: top;">
                                            R$ ${parseFloat(venda.total).toFixed(2)}
                                            ${parseFloat(venda.troco) > 0 ? `<br><span style="font-size: 11px; color: #999; font-weight: normal;">Troco: R$ ${parseFloat(venda.troco).toFixed(2)}</span>` : ''}
                                        </td>
                                        <td rowspan="${itens.length}" style="padding: 12px; background: #f8f9fa; font-size: 12px; border-left: 1px solid #ddd; vertical-align: top;">
                                            ${pagamentosTexto}
                                        </td>
                                    ` : ''}
                                </tr>
                            `;
                            }).join('');
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; font-weight: bold; font-size: 16px;">
                            <td colspan="2" style="padding: 15px; text-align: left; border-top: 3px solid #ddd;">
                                📊 TOTAL GERAL
                            </td>
                            <td style="padding: 15px; text-align: left; border-top: 3px solid #ddd;">
                                ${quantidadeVendas} venda(s)
                            </td>
                            <td style="padding: 15px; text-align: center; border-top: 3px solid #ddd;">
                                ${totalItensVendidos}
                            </td>
                            <td colspan="2" style="padding: 15px; text-align: right; border-top: 3px solid #ddd;">
                                <!-- Espaço -->
                            </td>
                            <td style="padding: 15px; text-align: right; border-top: 3px solid #ddd; font-size: 20px;">
                                R$ ${totalGeralVendas.toFixed(2)}
                            </td>
                            <td style="padding: 15px; text-align: right; border-top: 3px solid #ddd; font-size: 16px; color: #ffe6e6;">
                                R$ ${totalCustos.toFixed(2)}
                            </td>
                            <td style="padding: 15px; text-align: right; border-top: 3px solid #ddd; font-size: 18px;">
                                R$ ${totalLucro.toFixed(2)}
                            </td>
                            <td style="padding: 15px; text-align: center; border-top: 3px solid #ddd; font-size: 18px;">
                                ${margemPercentual}%
                            </td>
                            <td colspan="2" style="padding: 15px; border-top: 3px solid #ddd;">
                                <!-- Espaço -->
                            </td>
                        </tr>
                        <tr style="background: #f8f9fa; font-size: 14px; color: #333;">
                            <td colspan="6" style="padding: 12px; text-align: right; font-weight: bold;">
                                💰 Resumo Financeiro:
                            </td>
                            <td style="padding: 12px; text-align: right;">
                                <strong style="color: #28a745;">Receita</strong>
                            </td>
                            <td style="padding: 12px; text-align: right;">
                                <strong style="color: #dc3545;">Custos</strong>
                            </td>
                            <td style="padding: 12px; text-align: right;">
                                <strong style="color: #007bff;">Lucro Líquido</strong>
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                <strong style="color: #6f42c1;">Margem</strong>
                            </td>
                            <td colspan="2" style="padding: 12px;">
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                <p>Erro ao carregar itens das vendas</p>
            </div>
        `;
    }
}

