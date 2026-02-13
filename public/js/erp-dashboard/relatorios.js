const API_URL = window.API_URL;

// ==================== RELATORIOS ====================

export function abrirRelatorioVendasPeriodo() {
    abrirModal('relatorioVendasPeriodoModal', () => {
        // Setar período padrão: últimos 30 dias
        setarPeriodoRelatorio('mes');
    });
}

/**
 * Setar período pré-definido
 */
export function setarPeriodoRelatorio(tipo, botaoClicado) {
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
export async function gerarRelatorioVendas() {
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
        const response = await fetch(`${API_URL}/vendas`);
        if (!response.ok) throw new Error('Erro ao carregar vendas');
        
        const todasVendas = await response.json();
        
        // Filtrar vendas no período - API já exclui canceladas automaticamente
        let vendas = todasVendas.filter(venda => {
            const dataVenda = new Date(venda.data_venda.replace(' ', 'T'));
            const dataVendaSemHora = new Date(dataVenda.toISOString().split('T')[0]);
            const inicial = new Date(dataInicial);
            const final = new Date(dataFinal);
            
            return dataVendaSemHora >= inicial && dataVendaSemHora <= final;
        });
        
        // Filtrar por forma de pagamento se selecionada
        if (formaPagamento !== 'todos') {
            const vendasFiltradas = [];
            
            for (const venda of vendas) {
                try {
                    const detalhesResponse = await fetch(`${API_URL}/vendas/${venda.id}`);
                    if (detalhesResponse.ok) {
                        const detalhes = await detalhesResponse.json();
                        // Verificar se a venda possui a forma de pagamento selecionada
                        if (detalhes.formas_pagamento && detalhes.formas_pagamento.some(fp => fp.forma_pagamento === formaPagamento)) {
                            vendasFiltradas.push(venda);
                        }
                    }
                } catch (error) {
                    console.error(`Erro ao verificar forma de pagamento da venda ${venda.id}:`, error);
                }
            }
            
            vendas = vendasFiltradas;
        }
        
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
        const btnExportar = document.getElementById('btnExportarCSV');
        if (btnExportar) btnExportar.disabled = true;
    }
}

/**
 * Exportar relatório para CSV
 */
export function exportarRelatorioCSV() {
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

// Função auxiliar para abrir histórico de vendas
export function abrirHistorico() {
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
export function abrirRelatorioCaixaPeriodo() {
    abrirModal('relatorioCaixaPeriodoModal', () => {
        // Setar período padrão: últimos 30 dias
        setarPeriodoRelatorioCaixa('mes');
    });
}

/**
 * Setar período pré-definido para relatório de caixa
 */
export function setarPeriodoRelatorioCaixa(tipo, botaoClicado) {
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
export async function gerarRelatorioCaixa() {
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
            const btnExportar = document.getElementById('btnExportarCaixaCSV');
            if (btnExportar) btnExportar.disabled = true;
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
        const btnExportar = document.getElementById('btnExportarCaixaCSV');
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
        const btnExportar = document.getElementById('btnExportarCaixaCSV');
        if (btnExportar) btnExportar.disabled = true;
    }
}

/**
 * Exportar relatório de caixa para CSV
 */
export function exportarRelatorioCaixaCSV() {
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
export function abrirRelatorioProdutosVendidos() {
    abrirModal('relatorioProdutosVendidosModal', () => {
        // Setar período padrão: últimos 30 dias
        setarPeriodoRelatorioProdutos('mes');
    });
}

/**
 * Setar período pré-definido para relatório de produtos
 */
export function setarPeriodoRelatorioProdutos(tipo, botaoClicado) {
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
export async function gerarRelatorioProdutosVendidos() {
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
        // Buscar todas as vendas no período (apenas não canceladas)
        const response = await fetch(`${API_URL}/vendas`);
        if (!response.ok) throw new Error('Erro ao carregar vendas');
        
        const todasVendas = await response.json();
        
        // Filtrar vendas no período - backend já retorna apenas não canceladas
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
            const btnExportar = document.getElementById('btnExportarProdutosCSV');
            if (btnExportar) btnExportar.disabled = true;
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
export function exportarRelatorioProdutosCSV() {
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
export function abrirRelatorioVendasItem() {
    abrirModal('relatorioVendasItemModal', () => {
        // Setar periodo padrao: ultimos 30 dias
        setarPeriodoRelatorioItem('mes');
    });
}

/**
 * Setar periodo pre-definido para relatorio de itens
 */
export function setarPeriodoRelatorioItem(tipo, botaoClicado) {
    // Remover animacao de todos os botoes de periodo
    const botoesPeriodo = document.querySelectorAll('[id^="btnPeriodo"][id$="Item"]');
    botoesPeriodo.forEach(btn => {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
        btn.innerHTML = btn.innerHTML.replace(' ⏳', '').replace(' ✓', '');
    });

    // Adicionar feedback visual no botao clicado
    if (botaoClicado) {
        const textoOriginal = botaoClicado.innerHTML;
        botaoClicado.innerHTML = textoOriginal + ' ⏳';
        botaoClicado.style.opacity = '0.7';
        botaoClicado.style.transform = 'scale(0.95)';

        // Apos definir o periodo, restaurar botao
        setTimeout(() => {
            botaoClicado.innerHTML = textoOriginal + ' ✓';
            botaoClicado.style.opacity = '1';
            botaoClicado.style.transform = 'scale(1)';

            // Remover checkmark apos 2 segundos
            setTimeout(() => {
                botaoClicado.innerHTML = textoOriginal;
            }, 2000);
        }, 300);
    }

    const hoje = new Date();
    const dataFinal = new Date(hoje);
    let dataInicial = new Date(hoje);

    switch (tipo) {
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
            // Primeiro dia do mes
            dataInicial.setDate(1);
            break;
        case 'ano':
            // Primeiro dia do ano
            dataInicial.setMonth(0, 1);
            break;
    }

    // Formatar datas para input type="date"
    document.getElementById('dataInicialRelatorioItem').value = dataInicial.toISOString().split('T')[0];
    document.getElementById('dataFinalRelatorioItem').value = dataFinal.toISOString().split('T')[0];

    // Mostrar notificacao
    const nomesPeriodo = {
        'hoje': 'Hoje',
        'ontem': 'Ontem',
        'semana': 'Esta Semana',
        'mes': 'Este Mes',
        'ano': 'Este Ano'
    };
    mostrarNotificacao(`✓ Periodo selecionado: ${nomesPeriodo[tipo]}`, 'success');
}

/**
 * Gerar relatorio de vendas por item
 */
export async function gerarRelatorioVendasItem() {
    const dataInicial = document.getElementById('dataInicialRelatorioItem').value;
    const dataFinal = document.getElementById('dataFinalRelatorioItem').value;

    if (!dataInicial || !dataFinal) {
        mostrarNotificacao('⚠️ Selecione as datas inicial e final', 'error');
        return;
    }

    if (new Date(dataInicial) > new Date(dataFinal)) {
        mostrarNotificacao('⚠️ Data inicial nao pode ser maior que data final', 'error');
        return;
    }

    const container = document.getElementById('resultadoRelatorioVendasItem');
    container.innerHTML = '<p style="text-align: center; padding: 40px;"><strong>Carregando relatorio...</strong></p>';

    try {
        const response = await fetch(`${API_URL}/vendas`);
        if (!response.ok) throw new Error('Erro ao carregar vendas');

        const todasVendas = await response.json();

        // Filtrar vendas no periodo - backend ja retorna apenas nao canceladas
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
                    <div style="font-size: 64px; margin-bottom: 20px;">🧾</div>
                    <h3>Nenhuma venda encontrada no periodo</h3>
                    <p style="margin-top: 10px;">Tente selecionar um periodo diferente</p>
                </div>
            `;
            const btnExportar = document.getElementById('btnExportarVendasItemCSV');
            if (btnExportar) btnExportar.disabled = true;
            return;
        }

        // Buscar produtos para mapear categorias
        let produtosCatalogo = [];
        try {
            const produtosResponse = await fetch(`${API_URL}/produtos`);
            if (produtosResponse.ok) {
                produtosCatalogo = await produtosResponse.json();
            }
        } catch (error) {
            console.warn('Erro ao carregar produtos para categorias:', error);
        }

        const categoriaPorCodigo = new Map();
        const categoriaPorNome = new Map();
        produtosCatalogo.forEach(produto => {
            if (produto.codigo_barras) {
                categoriaPorCodigo.set(produto.codigo_barras, produto.categoria_nome || '');
            }
            if (produto.nome) {
                categoriaPorNome.set(produto.nome, produto.categoria_nome || '');
            }
        });

        // Buscar itens de todas as vendas em paralelo
        const promessasItens = vendas.map(venda =>
            fetch(`${API_URL}/vendas/${venda.id}`)
                .then(res => res.json())
                .then(data => ({ venda, itens: data.itens || [] }))
        );

        const vendasComItens = await Promise.all(promessasItens);
        const itensVendidos = vendasComItens.flatMap(v => v.itens || []);

        if (itensVendidos.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🧾</div>
                    <h3>Nenhum item vendido no periodo</h3>
                </div>
            `;
            const btnExportar = document.getElementById('btnExportarVendasItemCSV');
            if (btnExportar) btnExportar.disabled = true;
            return;
        }

        // Agrupar itens por produto
        const itensPorProduto = new Map();

        vendasComItens.forEach(({ venda, itens }) => {
            itens.forEach(item => {
                const codigo = item.codigo_barras || '';
                const chave = codigo ? codigo : item.nome_produto;

                if (!itensPorProduto.has(chave)) {
                    const categoria = categoriaPorCodigo.get(codigo) || categoriaPorNome.get(item.nome_produto) || '-';
                    itensPorProduto.set(chave, {
                        nome: item.nome_produto,
                        codigo: codigo || '-',
                        categoria: categoria,
                        quantidade: 0,
                        totalVendas: 0,
                        totalCustos: 0,
                        vendasIds: new Set(),
                        precoSomado: 0,
                        precoQtde: 0
                    });
                }

                const registro = itensPorProduto.get(chave);
                const quantidade = parseInt(item.quantidade) || 0;
                const subtotal = parseFloat(item.subtotal) || 0;
                const custoUnit = parseFloat(item.preco_custo_unitario) || 0;
                const precoUnit = parseFloat(item.preco_unitario) || 0;

                registro.quantidade += quantidade;
                registro.totalVendas += subtotal;
                registro.totalCustos += custoUnit * quantidade;
                registro.precoSomado += precoUnit * quantidade;
                registro.precoQtde += quantidade;
                registro.vendasIds.add(venda.id);
            });
        });

        const produtos = Array.from(itensPorProduto.values())
            .map(produto => {
                const lucro = produto.totalVendas - produto.totalCustos;
                const margem = produto.totalVendas > 0 ? (lucro / produto.totalVendas) * 100 : 0;
                const precoMedio = produto.precoQtde > 0 ? produto.precoSomado / produto.precoQtde : 0;

                return {
                    nome: produto.nome,
                    codigo: produto.codigo,
                    categoria: produto.categoria,
                    quantidade: produto.quantidade,
                    totalVendas: produto.totalVendas,
                    totalCustos: produto.totalCustos,
                    lucro: lucro,
                    margem: margem,
                    precoMedio: precoMedio,
                    numeroVendas: produto.vendasIds.size
                };
            })
            .sort((a, b) => b.quantidade - a.quantidade);

        const totalItens = produtos.reduce((sum, p) => sum + p.quantidade, 0);
        const totalReceita = produtos.reduce((sum, p) => sum + p.totalVendas, 0);
        const totalCustos = produtos.reduce((sum, p) => sum + p.totalCustos, 0);
        const totalLucro = totalReceita - totalCustos;
        const margemTotal = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;

        // Salvar dados para exportacao
        window.dadosRelatorioVendasItemAtual = {
            produtosBase: produtos,
            produtosFiltrados: produtos,
            periodo: {
                dataInicial: dataInicial,
                dataFinal: dataFinal
            },
            totais: {
                totalItens: totalItens,
                totalReceita: totalReceita,
                totalCustos: totalCustos,
                totalLucro: totalLucro,
                margemTotal: margemTotal
            }
        };

        // Renderizar relatorio
        container.innerHTML = `
            <div class="relatorio-resultado">

                <!-- Cabecalho -->
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #17a2b8;">
                    <h2 style="margin: 0; color: #17a2b8;">🧾 Relatorio de Vendas por Item</h2>
                    <p style="margin: 10px 0 0 0; color: #666;">
                        Periodo: ${new Date(dataInicial).toLocaleDateString('pt-BR')} ate ${new Date(dataFinal).toLocaleDateString('pt-BR')}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #999; font-size: 14px;">
                        Gerado em: ${new Date().toLocaleString('pt-BR')}
                    </p>
                </div>

                <!-- Cards de Estatisticas -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, #17a2b8 0%, #0f6674 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Itens Diferentes</div>
                        <div style="font-size: 36px; font-weight: bold;">${produtos.length}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Quantidade Total</div>
                        <div style="font-size: 36px; font-weight: bold;">${totalItens}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Receita Total</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${totalReceita.toFixed(2)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Lucro Total</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${totalLucro.toFixed(2)}</div>
                    </div>
                </div>

                <!-- Filtros do Relatorio -->
                <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px; align-items: center;">
                    <input
                        type="text"
                        id="filtroTextoRelatorioItem"
                        placeholder="🔍 Buscar por produto ou codigo..."
                        oninput="aplicarFiltrosRelatorioVendasItem()"
                        style="flex: 1; min-width: 220px; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                    <select id="ordenacaoRelatorioItem" onchange="aplicarFiltrosRelatorioVendasItem()" style="padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                        <option value="lucro_desc" selected>Lucro (maior)</option>
                        <option value="lucro_asc">Lucro (menor)</option>
                        <option value="margem_desc">Margem (maior)</option>
                        <option value="margem_asc">Margem (menor)</option>
                        <option value="quantidade_desc">Quantidade (maior)</option>
                        <option value="receita_desc">Receita (maior)</option>
                    </select>
                    <select id="itensPorPaginaRelatorioItem" onchange="aplicarFiltrosRelatorioVendasItem()" style="padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                        <option value="10">10 por pagina</option>
                        <option value="20" selected>20 por pagina</option>
                        <option value="50">50 por pagina</option>
                        <option value="100">100 por pagina</option>
                    </select>
                    <div id="resumoRelatorioVendasItem" style="font-size: 13px; color: #666; min-width: 180px;"></div>
                </div>

                <!-- Tabela de Itens -->
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">📦 Resumo por Item</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: linear-gradient(135deg, #17a2b8 0%, #0f6674 100%); color: white;">
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Produto</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Codigo</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Categoria</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qtd</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Preco Medio</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Receita</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Custo Total</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Lucro</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Margem %</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Vendas</th>
                                </tr>
                            </thead>
                            <tbody id="listaRelatorioVendasItem"></tbody>
                            <tfoot id="totaisRelatorioVendasItem"></tfoot>
                        </table>
                    </div>
                    <div id="paginacaoRelatorioVendasItem" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 20px;"></div>
                </div>
            </div>
        `;

        aplicarFiltrosRelatorioVendasItem();

        // Habilitar botao de exportacao
        const btnExportar = document.getElementById('btnExportarVendasItemCSV');
        if (btnExportar) btnExportar.disabled = false;

        mostrarNotificacao('✅ Relatorio gerado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao gerar relatorio:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao gerar relatorio</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
        const btnExportar = document.getElementById('btnExportarVendasItemCSV');
        if (btnExportar) btnExportar.disabled = true;
    }
}

/**
 * Exportar relatorio de vendas por item para CSV
 */
export function exportarRelatorioVendasItemCSV() {
    if (!window.dadosRelatorioVendasItemAtual || !window.dadosRelatorioVendasItemAtual.produtosBase) {
        mostrarNotificacao('Gere o relatorio primeiro!', 'error');
        return;
    }

    const { produtosBase, periodo, totais } = window.dadosRelatorioVendasItemAtual;

    let csv = 'Produto,Codigo,Categoria,Quantidade,Preco Medio (R$),Receita (R$),Custo Total (R$),Lucro (R$),Margem %,Numero de Vendas\n';

    produtosBase.forEach(produto => {
        csv += `"${produto.nome}",`;
        csv += `${produto.codigo},`;
        csv += `"${produto.categoria || ''}",`;
        csv += `${produto.quantidade},`;
        csv += `${produto.precoMedio.toFixed(2)},`;
        csv += `${produto.totalVendas.toFixed(2)},`;
        csv += `${produto.totalCustos.toFixed(2)},`;
        csv += `${produto.lucro.toFixed(2)},`;
        csv += `${produto.margem.toFixed(1)}%,`;
        csv += `${produto.numeroVendas}\n`;
    });

    csv += '\n';
    csv += `TOTAIS,,${totais.totalItens},,${totais.totalReceita.toFixed(2)},${totais.totalCustos.toFixed(2)},${totais.totalLucro.toFixed(2)},${totais.margemTotal.toFixed(1)}%,\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const nomeArquivo = `relatorio_vendas_item_${periodo.dataInicial}_${periodo.dataFinal}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', nomeArquivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarNotificacao('✅ Arquivo CSV exportado com sucesso!', 'success');
}

// Filtros e paginacao do relatorio de vendas por item
let paginaAtualRelatorioItem = 1;

function obterItensPorPaginaRelatorioItem() {
    const select = document.getElementById('itensPorPaginaRelatorioItem');
    const valor = parseInt(select?.value, 10);
    return Number.isFinite(valor) && valor > 0 ? valor : 20;
}

export function aplicarFiltrosRelatorioVendasItem() {
    if (!window.dadosRelatorioVendasItemAtual || !window.dadosRelatorioVendasItemAtual.produtosBase) {
        return;
    }

    const termo = (document.getElementById('filtroTextoRelatorioItem')?.value || '').toLowerCase();
    const ordenacao = document.getElementById('ordenacaoRelatorioItem')?.value || 'lucro_desc';

    let filtrados = window.dadosRelatorioVendasItemAtual.produtosBase.filter(produto => {
        if (!termo) return true;
        return (
            produto.nome.toLowerCase().includes(termo) ||
            (produto.codigo || '').toLowerCase().includes(termo)
        );
    });

    switch (ordenacao) {
        case 'lucro_asc':
            filtrados.sort((a, b) => a.lucro - b.lucro);
            break;
        case 'margem_desc':
            filtrados.sort((a, b) => b.margem - a.margem);
            break;
        case 'margem_asc':
            filtrados.sort((a, b) => a.margem - b.margem);
            break;
        case 'quantidade_desc':
            filtrados.sort((a, b) => b.quantidade - a.quantidade);
            break;
        case 'receita_desc':
            filtrados.sort((a, b) => b.totalVendas - a.totalVendas);
            break;
        case 'lucro_desc':
        default:
            filtrados.sort((a, b) => b.lucro - a.lucro);
            break;
    }

    window.dadosRelatorioVendasItemAtual.produtosFiltrados = filtrados;
    paginaAtualRelatorioItem = 1;
    renderizarTabelaRelatorioVendasItem();
}

function renderizarTabelaRelatorioVendasItem() {
    const dados = window.dadosRelatorioVendasItemAtual;
    if (!dados || !dados.produtosFiltrados) return;

    const itensPorPagina = obterItensPorPaginaRelatorioItem();
    const totalItens = dados.produtosFiltrados.length;
    const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));

    if (paginaAtualRelatorioItem > totalPaginas) {
        paginaAtualRelatorioItem = totalPaginas;
    }

    const inicio = (paginaAtualRelatorioItem - 1) * itensPorPagina;
    const fim = Math.min(inicio + itensPorPagina, totalItens);
    const itensPagina = dados.produtosFiltrados.slice(inicio, fim);

    const corpo = document.getElementById('listaRelatorioVendasItem');
    const tfoot = document.getElementById('totaisRelatorioVendasItem');
    const resumo = document.getElementById('resumoRelatorioVendasItem');

    if (!corpo || !tfoot) return;

    if (totalItens === 0) {
        corpo.innerHTML = '<tr><td colspan="10" style="padding: 20px; text-align: center; color: #999;">Nenhum item encontrado</td></tr>';
        tfoot.innerHTML = '';
        if (resumo) resumo.textContent = 'Nenhum item encontrado';
        atualizarPaginacaoRelatorioVendasItem(0, 0);
        return;
    }

    corpo.innerHTML = itensPagina.map(produto => {
        const margemCor = produto.margem < 10 ? '#dc3545' : produto.margem < 30 ? '#ffc107' : '#28a745';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: bold;">${produto.nome}</td>
                <td style="padding: 12px; color: #666;">${produto.codigo}</td>
                <td style="padding: 12px; color: #666;">${produto.categoria || '-'}</td>
                <td style="padding: 12px; text-align: center; font-weight: bold; color: #17a2b8;">${produto.quantidade}</td>
                <td style="padding: 12px; text-align: right; color: #666;">R$ ${produto.precoMedio.toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">R$ ${produto.totalVendas.toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; color: #dc3545;">R$ ${produto.totalCustos.toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: ${produto.lucro >= 0 ? '#28a745' : '#dc3545'};">R$ ${produto.lucro.toFixed(2)}</td>
                <td style="padding: 12px; text-align: center; font-weight: bold; color: ${margemCor};">${produto.margem.toFixed(1)}%</td>
                <td style="padding: 12px; text-align: center; color: #666;">${produto.numeroVendas}</td>
            </tr>
        `;
    }).join('');

    const totalQuantidade = dados.produtosFiltrados.reduce((sum, p) => sum + p.quantidade, 0);
    const totalReceita = dados.produtosFiltrados.reduce((sum, p) => sum + p.totalVendas, 0);
    const totalCustos = dados.produtosFiltrados.reduce((sum, p) => sum + p.totalCustos, 0);
    const totalLucro = totalReceita - totalCustos;
    const margemTotal = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;

    tfoot.innerHTML = `
        <tr style="background: #f8f9fa; font-weight: bold;">
            <td colspan="3" style="padding: 12px; text-align: right; border-top: 2px solid #ddd;">TOTAIS:</td>
            <td style="padding: 12px; text-align: center; border-top: 2px solid #ddd; color: #17a2b8;">${totalQuantidade}</td>
            <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd;"></td>
            <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: #28a745;">R$ ${totalReceita.toFixed(2)}</td>
            <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: #dc3545;">R$ ${totalCustos.toFixed(2)}</td>
            <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: ${totalLucro >= 0 ? '#28a745' : '#dc3545'};">R$ ${totalLucro.toFixed(2)}</td>
            <td style="padding: 12px; text-align: center; border-top: 2px solid #ddd; color: #6f42c1;">${margemTotal.toFixed(1)}%</td>
            <td style="padding: 12px; text-align: center; border-top: 2px solid #ddd;"></td>
        </tr>
    `;

    if (resumo) {
        resumo.textContent = `Mostrando ${inicio + 1}-${fim} de ${totalItens} itens`;
    }

    atualizarPaginacaoRelatorioVendasItem(totalItens, totalPaginas);
}

function atualizarPaginacaoRelatorioVendasItem(totalItens, totalPaginas) {
    const container = document.getElementById('paginacaoRelatorioVendasItem');
    if (!container) return;

    if (totalItens === 0 || totalPaginas <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    const paginaAtual = paginaAtualRelatorioItem;
    const maxBotoes = 5;
    let inicio = Math.max(1, paginaAtual - Math.floor(maxBotoes / 2));
    let fim = Math.min(totalPaginas, inicio + maxBotoes - 1);

    if (fim - inicio + 1 < maxBotoes) {
        inicio = Math.max(1, fim - maxBotoes + 1);
    }

    html += `
        <button class="btn" style="padding: 6px 10px;" onclick="mudarPaginaRelatorioVendasItem(${paginaAtual - 1})" ${paginaAtual === 1 ? 'disabled' : ''}>◀</button>
    `;

    for (let i = inicio; i <= fim; i++) {
        html += `
            <button class="btn" style="padding: 6px 10px; ${i === paginaAtual ? 'background: #17a2b8; color: white;' : ''}" onclick="mudarPaginaRelatorioVendasItem(${i})">${i}</button>
        `;
    }

    html += `
        <button class="btn" style="padding: 6px 10px;" onclick="mudarPaginaRelatorioVendasItem(${paginaAtual + 1})" ${paginaAtual === totalPaginas ? 'disabled' : ''}>▶</button>
    `;

    container.innerHTML = html;
}

export function mudarPaginaRelatorioVendasItem(pagina) {
    paginaAtualRelatorioItem = pagina;
    renderizarTabelaRelatorioVendasItem();
}

// ==================== RELATÓRIO DE ESTOQUE BAIXO ====================

// Variáveis globais para filtros
let produtosEstoqueBaixoCompleto = [];

/**
 * Abrir modal de relatório de estoque baixo
 */
export function abrirRelatorioEstoqueBaixo() {
    abrirModal('relatorioEstoqueBaixoModal', () => {
        // Gerar relatório automaticamente ao abrir
        gerarRelatorioEstoqueBaixo();
    });
}

/**
 * Gerar relatório de produtos com estoque baixo
 */
export async function gerarRelatorioEstoqueBaixo() {
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
export function aplicarFiltrosEstoqueBaixo() {
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
export function exportarEstoqueBaixoCSV() {
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

export function abrirRelatorioVendasHorario() {
    abrirModal('relatorioVendasHorarioModal', () => {
        setarPeriodoRelatorioHorario('mes');
    });
}

// ==================== RELATÓRIO DE ESTORNOS ====================

export function abrirRelatorioEstornos() {
    abrirModal('relatorioEstornosModal', () => {
        setarPeriodoRelatorioEstornos('mes');
    });
}

export function setarPeriodoRelatorioEstornos(tipo, botaoClicado) {
    const botoesPeriodo = document.querySelectorAll('[id^="btnPeriodo"][id$="Estornos"]');
    botoesPeriodo.forEach(btn => {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
        btn.innerHTML = btn.innerHTML.replace(' ⏳', '').replace(' ✓', '');
    });
    
    if (botaoClicado) {
        const textoOriginal = botaoClicado.innerHTML;
        botaoClicado.innerHTML = textoOriginal + ' ⏳';
        botaoClicado.style.opacity = '0.7';
        botaoClicado.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            botaoClicado.innerHTML = textoOriginal + ' ✓';
            botaoClicado.style.opacity = '1';
            botaoClicado.style.transform = 'scale(1)';
            
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
            break;
        case 'ontem':
            dataInicial.setDate(hoje.getDate() - 1);
            dataFinal.setDate(hoje.getDate() - 1);
            break;
        case 'semana':
            const diaSemana = hoje.getDay();
            dataInicial.setDate(hoje.getDate() - diaSemana);
            break;
        case 'mes':
            dataInicial.setDate(1);
            break;
        case 'ano':
            dataInicial.setMonth(0, 1);
            break;
    }
    
    const formatarDataLocal = (data) => {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    };

    document.getElementById('dataInicialRelatorioEstornos').value = formatarDataLocal(dataInicial);
    document.getElementById('dataFinalRelatorioEstornos').value = formatarDataLocal(dataFinal);
    
    const nomesPeriodo = {
        'hoje': 'Hoje',
        'ontem': 'Ontem',
        'semana': 'Esta Semana',
        'mes': 'Este Mês',
        'ano': 'Este Ano'
    };
    mostrarNotificacao(`✓ Período selecionado: ${nomesPeriodo[tipo]}`, 'success');
}

export async function gerarRelatorioEstornos() {
    const dataInicial = document.getElementById('dataInicialRelatorioEstornos').value;
    const dataFinal = document.getElementById('dataFinalRelatorioEstornos').value;
    
    if (!dataInicial || !dataFinal) {
        mostrarNotificacao('⚠️ Selecione as datas inicial e final', 'error');
        return;
    }
    
    if (new Date(dataInicial) > new Date(dataFinal)) {
        mostrarNotificacao('⚠️ Data inicial não pode ser maior que data final', 'error');
        return;
    }
    
    const container = document.getElementById('resultadoRelatorioEstornos');
    container.innerHTML = '<p style="text-align: center; padding: 40px;"><strong>Carregando relatório...</strong></p>';
    
    try {
        const response = await fetch(`${API_URL}/contas-pagar/relatorio/estornos?data_inicio=${dataInicial}&data_fim=${dataFinal}`);
        if (!response.ok) throw new Error('Erro ao carregar estornos');
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Erro ao gerar relatório');
        }
        
        const estornos = data.estornos || [];
        const totais = data.totais || { total_estornado: 0, total_reposicao: 0, total_lucro: 0, quantidade: 0 };
        
        if (estornos.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">↩️</div>
                    <h3>Nenhum estorno encontrado no período</h3>
                    <p style="margin-top: 10px;">Tente selecionar um período diferente</p>
                </div>
            `;
            const btnExportar = document.getElementById('btnExportarEstornosCSV');
            if (btnExportar) btnExportar.disabled = true;
            return;
        }
        
        window.dadosRelatorioEstornosAtual = {
            estornos,
            periodo: { dataInicial, dataFinal }
        };
        
        container.innerHTML = `
            <div class="relatorio-resultado">
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #ff9800;">
                    <h2 style="margin: 0; color: #ff9800;">↩️ Relatório de Estornos</h2>
                    <p style="margin: 10px 0 0 0; color: #666;">
                        Período: ${new Date(dataInicial).toLocaleDateString('pt-BR')} até ${new Date(dataFinal).toLocaleDateString('pt-BR')}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #999; font-size: 14px;">
                        Gerado em: ${new Date().toLocaleString('pt-BR')}
                    </p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total de Estornos</div>
                        <div style="font-size: 36px; font-weight: bold;">${totais.quantidade}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total Estornado</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${parseFloat(totais.total_estornado).toFixed(2)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Reposição</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${parseFloat(totais.total_reposicao).toFixed(2)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Lucro</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${parseFloat(totais.total_lucro).toFixed(2)}</div>
                    </div>
                </div>
                
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow-x: auto;">
                    <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">🧾 Detalhamento de Estornos</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%); color: white;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Data/Hora</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Conta</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Fornecedor</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Valor</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Origem</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Motivo</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Usuário</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${estornos.map(estorno => {
                                const dataEstorno = new Date(estorno.data_estorno).toLocaleString('pt-BR');
                                const origem = estorno.origem_pagamento === 'reposicao' ? 'Reposição' : 'Lucro';
                                return `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 12px; white-space: nowrap;">${dataEstorno}</td>
                                        <td style="padding: 12px;">${estorno.conta_descricao}</td>
                                        <td style="padding: 12px;">${estorno.fornecedor_nome || '—'}</td>
                                        <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">R$ ${parseFloat(estorno.valor_estornado).toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: center;">${origem}</td>
                                        <td style="padding: 12px;">${estorno.motivo}</td>
                                        <td style="padding: 12px;">${estorno.usuario_nome || '—'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        const btnExportar = document.getElementById('btnExportarEstornosCSV');
        if (btnExportar) btnExportar.disabled = false;
        
        mostrarNotificacao('✅ Relatório gerado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao gerar relatório de estornos:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao gerar relatório</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
        const btnExportar = document.getElementById('btnExportarEstornosCSV');
        if (btnExportar) btnExportar.disabled = true;
    }
}

export function exportarRelatorioEstornosCSV() {
    if (!window.dadosRelatorioEstornosAtual || !window.dadosRelatorioEstornosAtual.estornos) {
        mostrarNotificacao('Gere o relatório primeiro!', 'error');
        return;
    }
    
    const { estornos, periodo } = window.dadosRelatorioEstornosAtual;
    
    let csv = 'Data/Hora,Conta,Fornecedor,Valor,Origem,Motivo,Usuario\n';
    
    estornos.forEach(estorno => {
        const dataEstorno = new Date(estorno.data_estorno).toLocaleString('pt-BR');
        const origem = estorno.origem_pagamento === 'reposicao' ? 'Reposição' : 'Lucro';
        const contaDesc = (estorno.conta_descricao || '').replace(/"/g, '""');
        const motivo = (estorno.motivo || '').replace(/"/g, '""');
        const fornecedor = (estorno.fornecedor_nome || '').replace(/"/g, '""');
        const usuario = (estorno.usuario_nome || '').replace(/"/g, '""');
        
        csv += `"${dataEstorno}","${contaDesc}","${fornecedor}",${parseFloat(estorno.valor_estornado).toFixed(2)},"${origem}","${motivo}","${usuario}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const nomeArquivo = `relatorio_estornos_${periodo.dataInicial}_${periodo.dataFinal}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', nomeArquivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarNotificacao('✅ Arquivo CSV exportado com sucesso!', 'success');
}


