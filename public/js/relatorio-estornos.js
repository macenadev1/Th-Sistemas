// ==================== RELATORIO DE ESTORNOS ====================
function abrirRelatorioEstornos() {
    abrirModal('relatorioEstornosModal', () => {
        setarPeriodoRelatorioEstornos('mes');
    });
}

function setarPeriodoRelatorioEstornos(tipo, botaoClicado) {
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

async function gerarRelatorioEstornos() {
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

function exportarRelatorioEstornosCSV() {
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
