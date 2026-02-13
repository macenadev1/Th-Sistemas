// ==================== RELATORIO DE VENDAS POR PERIODO ====================
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
    const formaPagamento = document.getElementById('filtroFormaPagamentoRelatorio').value;
    
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
        const query = new URLSearchParams({
            data_inicial: dataInicial,
            data_final: dataFinal,
            forma_pagamento: formaPagamento || 'todos'
        });

        const response = await fetch(`${API_URL}/vendas/relatorio?${query.toString()}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao carregar vendas');
        }

        const vendas = data.vendas || [];
        const itens = data.itens || [];
        const formasPagamento = data.formas_pagamento || [];
        
        if (vendas.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📊</div>
                    <h3>Nenhuma venda encontrada no período</h3>
                    <p style="margin-top: 10px;">Tente selecionar um período diferente</p>
                </div>
            `;
            const btnExportar = document.getElementById('btnExportarCSV');
            if (btnExportar) btnExportar.disabled = true;
            return;
        }

        const itensPorVenda = new Map();
        itens.forEach(item => {
            if (!itensPorVenda.has(item.venda_id)) {
                itensPorVenda.set(item.venda_id, []);
            }
            itensPorVenda.get(item.venda_id).push(item);
        });

        const formasPorVenda = new Map();
        formasPagamento.forEach(fp => {
            if (!formasPorVenda.has(fp.venda_id)) {
                formasPorVenda.set(fp.venda_id, []);
            }
            formasPorVenda.get(fp.venda_id).push(fp);
        });

        const vendasComItens = vendas.map(venda => ({
            venda,
            itens: itensPorVenda.get(venda.id) || [],
            formas_pagamento: formasPorVenda.get(venda.id) || []
        }));
        
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
                    ${formaPagamento !== 'todos' ? `<p style="margin: 5px 0 0 0; color: #007bff; font-size: 14px; font-weight: bold;">
                        Filtro: ${(() => {
                            const nomes = { dinheiro: '💵 Dinheiro', debito: '💳 Débito', credito: '💳 Crédito', pix: '📱 PIX' };
                            return nomes[formaPagamento] || formaPagamento;
                        })()}
                    </p>` : ''}
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
        const btnExportar = document.getElementById('btnExportarCSV');
        if (btnExportar) btnExportar.disabled = false;
        
        // Carregar itens das vendas de forma assíncrona
        carregarItensVendasRelatorio(vendasComItens, dataInicial, dataFinal);
        
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
        const btnExportar = document.getElementById('btnExportarCSV');
        if (btnExportar) btnExportar.disabled = true;
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
async function carregarItensVendasRelatorio(vendasComItens, dataInicial, dataFinal) {
    const container = document.getElementById('listaVendasDetalhada');
    
    try {
        const vendasOrdenadas = vendasComItens
            .slice()
            .sort((a, b) => new Date(b.venda.data_venda) - new Date(a.venda.data_venda));
        
        // Salvar dados do relatório para exportação
        window.dadosRelatorioAtual = {
            vendas: vendasOrdenadas,
            periodo: {
                dataInicial: dataInicial,
                dataFinal: dataFinal
            }
        };
        
        // Calcular totais gerais - VENDAS + CUSTOS + LUCROS
        const totalGeralVendas = vendasOrdenadas.reduce((sum, { venda }) => sum + parseFloat(venda.total), 0);
        const totalItensVendidos = vendasOrdenadas.reduce((sum, { venda }) => sum + parseInt(venda.quantidade_itens), 0);
        const quantidadeVendas = vendasOrdenadas.length;
        
        // Calcular custo total e lucro total
        let totalCustos = 0;
        vendasOrdenadas.forEach(({ itens }) => {
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
                        ${vendasOrdenadas.map(({ venda, itens, formas_pagamento }) => {
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
