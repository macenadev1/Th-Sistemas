// ==================== RELATORIO DE PRODUTOS MAIS VENDIDOS ====================
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
        const query = new URLSearchParams({
            data_inicial: dataInicial,
            data_final: dataFinal,
            forma_pagamento: 'todos'
        });

        const response = await fetch(`${API_URL}/vendas/relatorio?${query.toString()}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao carregar vendas');
        }

        const vendas = data.vendas || [];
        const itensVendidos = data.itens || [];
        
        if (vendas.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📦</div>
                    <h3>Nenhuma venda encontrada no período</h3>
                    <p style="margin-top: 10px;">Tente selecionar um período diferente</p>
                </div>
            `;
            const btnExportar = document.getElementById('btnExportarProdutosCSV');
            if (btnExportar) btnExportar.disabled = true;
            return;
        }
        
        if (itensVendidos.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📦</div>
                    <h3>Nenhum produto vendido no período</h3>
                </div>
            `;
            const btnExportar = document.getElementById('btnExportarProdutosCSV');
            if (btnExportar) btnExportar.disabled = true;
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
        const btnExportar = document.getElementById('btnExportarProdutosCSV');
        if (btnExportar) btnExportar.disabled = false;
        
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
        const btnExportar = document.getElementById('btnExportarProdutosCSV');
        if (btnExportar) btnExportar.disabled = true;
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

// ==================== RELATORIO DE VENDAS POR ITEM ====================

/**
 * Abrir modal de relatorio de vendas por item
 */
