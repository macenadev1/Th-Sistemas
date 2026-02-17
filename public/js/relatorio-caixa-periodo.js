// ==================== RELATORIO DE MOVIMENTO DE CAIXA ====================
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
    const formatarDataLocal = (data) => {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    };

    document.getElementById('dataInicialRelatorioCaixa').value = formatarDataLocal(dataInicial);
    document.getElementById('dataFinalRelatorioCaixa').value = formatarDataLocal(dataFinal);
    
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
