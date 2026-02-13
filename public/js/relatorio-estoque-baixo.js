// ==================== RELATORIO DE ESTOQUE BAIXO ====================
// Variaveis globais para filtros
let produtosEstoqueBaixoCompleto = [];

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
        const btnExportar = document.getElementById('btnExportarEstoqueBaixoCSV');
        if (btnExportar) btnExportar.disabled = true;
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
    const btnExportar = document.getElementById('btnExportarEstoqueBaixoCSV');
    if (btnExportar) btnExportar.disabled = false;
    
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

window.abrirRelatorioEstoqueBaixo = abrirRelatorioEstoqueBaixo;
window.gerarRelatorioEstoqueBaixo = gerarRelatorioEstoqueBaixo;
window.aplicarFiltrosEstoqueBaixo = aplicarFiltrosEstoqueBaixo;
window.exportarEstoqueBaixoCSV = exportarEstoqueBaixoCSV;
