// ==================== HISTÓRICO DE FECHAMENTOS ====================

// Variável global para armazenar histórico completo
let historicoCompleto = [];

// Carregar histórico de fechamentos da API
async function carregarHistoricoFechamentos() {
    try {
        const response = await fetch('http://localhost:3000/api/caixa/fechamentos');
        const data = await response.json();
        return data.success ? data.fechamentos : [];
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        return [];
    }
}

async function abrirHistoricoFechamentos() {
    historicoCompleto = await carregarHistoricoFechamentos();
    
    // Preencher select de operadores
    preencherFiltroOperadores(historicoCompleto);
    
    // Limpar e resetar filtros
    limparFiltrosHistorico();
    
    // Aplicar filtros (vai mostrar todos inicialmente)
    aplicarFiltrosHistorico();
    
    abrirModal('historicoFechamentosModal');
}

function preencherFiltroOperadores(historico) {
    const selectOperador = document.getElementById('filtroOperador');
    const operadores = [...new Set(historico.map(f => f.operador))].sort();
    
    selectOperador.innerHTML = '<option value="todos">Todos</option>';
    operadores.forEach(op => {
        selectOperador.innerHTML += `<option value="${op}">${op}</option>`;
    });
}

function aplicarFiltrosHistorico() {
    const filtroPeriodo = document.getElementById('filtroPeriodo').value;
    const filtroOperador = document.getElementById('filtroOperador').value;
    const filtroStatus = document.getElementById('filtroStatus').value;
    
    // Mostrar/ocultar datas personalizadas
    const datasPersonalizadas = document.getElementById('datasPersonalizadas');
    if (filtroPeriodo === 'personalizado') {
        datasPersonalizadas.style.display = 'block';
    } else {
        datasPersonalizadas.style.display = 'none';
    }
    
    let historicoFiltrado = [...historicoCompleto];
    
    // Filtro por período
    if (filtroPeriodo !== 'todos') {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        historicoFiltrado = historicoFiltrado.filter(fechamento => {
            const dataFechamento = new Date(fechamento.dataHoraFechamento.replace(' ', 'T'));
            dataFechamento.setHours(0, 0, 0, 0);
            
            if (filtroPeriodo === 'hoje') {
                return dataFechamento.getTime() === hoje.getTime();
            } else if (filtroPeriodo === 'ultimos7') {
                const seteDiasAtras = new Date(hoje);
                seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
                return dataFechamento >= seteDiasAtras;
            } else if (filtroPeriodo === 'ultimos30') {
                const trintaDiasAtras = new Date(hoje);
                trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
                return dataFechamento >= trintaDiasAtras;
            } else if (filtroPeriodo === 'personalizado') {
                const dataInicio = document.getElementById('dataInicio').value;
                const dataFim = document.getElementById('dataFim').value;
                
                if (dataInicio && dataFim) {
                    const inicio = new Date(dataInicio);
                    const fim = new Date(dataFim);
                    fim.setHours(23, 59, 59, 999);
                    return dataFechamento >= inicio && dataFechamento <= fim;
                }
                return true;
            }
            return true;
        });
    }
    
    // Filtro por operador
    if (filtroOperador !== 'todos') {
        historicoFiltrado = historicoFiltrado.filter(f => f.operador === filtroOperador);
    }
    
    // Filtro por status
    if (filtroStatus !== 'todos') {
        historicoFiltrado = historicoFiltrado.filter(fechamento => {
            const diferenca = parseFloat(fechamento.diferenca);
            if (filtroStatus === 'correto') return diferenca === 0;
            if (filtroStatus === 'sobra') return diferenca > 0;
            if (filtroStatus === 'falta') return diferenca < 0;
            return true;
        });
    }
    
    // Renderizar histórico filtrado
    renderizarHistorico(historicoFiltrado);
}

function limparFiltrosHistorico() {
    document.getElementById('filtroPeriodo').value = 'todos';
    document.getElementById('filtroOperador').value = 'todos';
    document.getElementById('filtroStatus').value = 'todos';
    document.getElementById('dataInicio').value = '';
    document.getElementById('dataFim').value = '';
    document.getElementById('datasPersonalizadas').style.display = 'none';
    aplicarFiltrosHistorico();
}

function renderizarHistorico(historico) {
    const content = document.getElementById('historicoFechamentosContent');
    
    if (historico.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
                <p style="font-size: 18px; font-weight: 600;">Nenhum fechamento encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';
    
    historico.forEach(fechamento => {
        // Converter valores para número
        const valorAbertura = parseFloat(fechamento.valorAbertura);
        const totalVendas = parseFloat(fechamento.totalVendas);
        const saldoEsperado = parseFloat(fechamento.saldoEsperado);
        const saldoReal = parseFloat(fechamento.saldoReal);
        const diferenca = parseFloat(fechamento.diferenca);
        
        const dataAbertura = new Date(fechamento.dataHoraAbertura.replace(' ', 'T'));
        const dataFechamento = new Date(fechamento.dataHoraFechamento.replace(' ', 'T'));
        
        const dataAberturaFormatada = dataAbertura.toLocaleDateString('pt-BR') + ' ' + 
            dataAbertura.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
        const dataFechamentoFormatada = dataFechamento.toLocaleDateString('pt-BR') + ' ' + 
            dataFechamento.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
        
        const corDiferenca = diferenca === 0 ? '#28a745' : 
                             diferenca > 0 ? '#17a2b8' : '#dc3545';
        const iconeDiferenca = diferenca === 0 ? '✓' : 
                               diferenca > 0 ? '💰' : '⚠️';
        const textoDiferenca = diferenca === 0 ? 'Correto' : 
                               diferenca > 0 ? `Sobra: R$ ${diferenca.toFixed(2)}` : 
                               `Falta: R$ ${Math.abs(diferenca).toFixed(2)}`;
        
        html += `
            <div onclick="verDetalhesFechamento(${fechamento.id})" style="
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                border-left: 5px solid ${corDiferenca};
                cursor: pointer;
                transition: all 0.2s;
            " onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0 0 5px 0; font-size: 18px; color: #333;">
                            👤 ${fechamento.operador}
                        </h3>
                        <p style="margin: 0; font-size: 13px; color: #666;">
                            📅 ${dataAberturaFormatada} → ${dataFechamentoFormatada}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <div style="background: ${corDiferenca}; color: white; padding: 5px 12px; border-radius: 5px; font-size: 14px; font-weight: bold;">
                            ${iconeDiferenca} ${textoDiferenca}
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px;">
                    <div style="background: white; padding: 10px; border-radius: 6px;">
                        <p style="margin: 0; font-size: 12px; color: #666;">Abertura</p>
                        <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #007bff;">
                            R$ ${valorAbertura.toFixed(2)}
                        </p>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 6px;">
                        <p style="margin: 0; font-size: 12px; color: #666;">Vendas</p>
                        <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #28a745;">
                            R$ ${totalVendas.toFixed(2)}
                        </p>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 6px;">
                        <p style="margin: 0; font-size: 12px; color: #666;">Esperado</p>
                        <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #667eea;">
                            R$ ${saldoEsperado.toFixed(2)}
                        </p>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 6px;">
                        <p style="margin: 0; font-size: 12px; color: #666;">Real</p>
                        <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #764ba2;">
                            R$ ${saldoReal.toFixed(2)}
                        </p>
                    </div>
                </div>
                
                <p style="margin: 15px 0 0 0; text-align: center; font-size: 12px; color: #999;">
                    Clique para ver detalhes completos
                </p>
            </div>
        `;
    });
    
    html += '</div>';
    content.innerHTML = html;
}

async function verDetalhesFechamento(id) {
    try {
        const response = await fetch(`http://localhost:3000/api/caixa/fechamentos/${id}`);
        const data = await response.json();
        
        if (!data.success) {
            mostrarNotificacao('Fechamento não encontrado!', 'error');
            return;
        }
        
        const fechamento = data.fechamento;
    
        // Converter valores para número
        const valorAbertura = parseFloat(fechamento.valorAbertura);
        const totalVendas = parseFloat(fechamento.totalVendas);
        const totalReforcos = parseFloat(fechamento.totalReforcos);
        const totalSangrias = parseFloat(fechamento.totalSangrias);
        const saldoEsperado = parseFloat(fechamento.saldoEsperado);
        const saldoReal = parseFloat(fechamento.saldoReal);
        const diferenca = parseFloat(fechamento.diferenca);
        
        // Converter datas do MySQL (formato YYYY-MM-DD HH:MM:SS) para Date local
        // MySQL retorna sem timezone, então precisamos tratar como horário local
        const dataAbertura = new Date(fechamento.dataHoraAbertura.replace(' ', 'T'));
        const dataFechamento = new Date(fechamento.dataHoraFechamento.replace(' ', 'T'));
        
        const dataAberturaFormatada = dataAbertura.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const dataFechamentoFormatada = dataFechamento.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Calcular tempo de operação
        const tempoOperacao = dataFechamento - dataAbertura;
        const horas = Math.floor(tempoOperacao / (1000 * 60 * 60));
        const minutos = Math.floor((tempoOperacao % (1000 * 60 * 60)) / (1000 * 60));
        
        const corDiferenca = diferenca === 0 ? '#28a745' : 
                             diferenca > 0 ? '#17a2b8' : '#dc3545';
        
        let html = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; font-size: 20px; color: #333;">📋 Informações Gerais</h3>
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd;">
                        <span style="font-weight: 600;">Operador:</span>
                        <span>${fechamento.operador}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd;">
                        <span style="font-weight: 600;">Abertura:</span>
                        <span>${dataAberturaFormatada}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd;">
                        <span style="font-weight: 600;">Fechamento:</span>
                        <span>${dataFechamentoFormatada}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                        <span style="font-weight: 600;">Tempo de Operação:</span>
                        <span style="color: #667eea; font-weight: bold;">${horas}h ${minutos}min</span>
                    </div>
                </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; font-size: 20px; color: #333;">💰 Valores</h3>
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd;">
                        <span style="font-weight: 600;">Valor de Abertura:</span>
                        <span style="color: #007bff; font-weight: bold;">R$ ${valorAbertura.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd;">
                        <span style="font-weight: 600;">Total em Vendas:</span>
                        <span style="color: #28a745; font-weight: bold;">R$ ${totalVendas.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd;">
                        <span style="font-weight: 600;">Reforços (+):</span>
                        <span style="color: #17a2b8; font-weight: bold;">R$ ${totalReforcos.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd;">
                        <span style="font-weight: 600;">Sangrias (-):</span>
                        <span style="color: #ff9800; font-weight: bold;">R$ ${totalSangrias.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; border-top: 2px solid #667eea;">
                        <span style="font-weight: 800; font-size: 18px;">Saldo Esperado:</span>
                        <span style="color: #667eea; font-weight: 800; font-size: 18px;">R$ ${saldoEsperado.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                        <span style="font-weight: 800; font-size: 18px;">Saldo Real:</span>
                        <span style="color: #764ba2; font-weight: 800; font-size: 18px;">R$ ${saldoReal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <div style="background: ${corDiferenca}; color: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h3 style="margin: 0 0 10px 0; font-size: 18px;">Diferença</h3>
                <p style="margin: 0; font-size: 28px; font-weight: bold;">
                    ${diferenca === 0 ? '✓ Correto' : 
                      diferenca > 0 ? `💰 Sobra: R$ ${diferenca.toFixed(2)}` : 
                      `⚠️ Falta: R$ ${Math.abs(diferenca).toFixed(2)}`}
                </p>
            </div>
        `;
        
        // Adicionar movimentações se houver
        if (fechamento.movimentacoes && fechamento.movimentacoes.length > 0) {
            html += `
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 20px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 20px; color: #333;">📝 Movimentações</h3>
                    <div style="max-height: 200px; overflow-y: auto;">
            `;
            
            fechamento.movimentacoes.forEach(mov => {
                const dataMov = new Date(mov.dataHora.replace ? mov.dataHora.replace(' ', 'T') : mov.dataHora);
                const horaMov = dataMov.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
                const valorMov = parseFloat(mov.valor) || 0;
                
                let icone = '📝';
                let cor = '#666';
                let tipo = mov.tipo;
                
                if (mov.tipo === 'abertura') { icone = '🔓'; cor = '#28a745'; tipo = 'Abertura'; }
                else if (mov.tipo === 'venda') { icone = '🛒'; cor = '#007bff'; tipo = 'Venda'; }
                else if (mov.tipo === 'reforco') { icone = '💵'; cor = '#17a2b8'; tipo = 'Reforço'; }
                else if (mov.tipo === 'sangria') { icone = '📉'; cor = '#ff9800'; tipo = 'Sangria'; }
                else if (mov.tipo === 'fechamento') { icone = '🔒'; cor = '#dc3545'; tipo = 'Fechamento'; }
                
                html += `
                    <div style="display: flex; justify-content: space-between; padding: 10px; margin-bottom: 8px; background: white; border-radius: 6px; border-left: 3px solid ${cor};">
                        <div style="flex: 1;">
                            <span style="font-weight: bold;">${icone} ${tipo}</span>
                            ${mov.observacao ? `<br><span style="font-size: 12px; color: #666;">${mov.observacao}</span>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; color: ${cor};">R$ ${valorMov.toFixed(2)}</div>
                            <div style="font-size: 11px; color: #999;">${horaMov}</div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
        }
        
        document.getElementById('detalhesFechamentoContent').innerHTML = html;
        abrirModal('detalhesFechamentoModal');
        
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        mostrarNotificacao('Erro ao carregar detalhes do fechamento', 'error');
    }
}

function voltarParaHistorico() {
    // Apenas fecha o modal de detalhes, o histórico permanece aberto
    fecharModal('detalhesFechamentoModal');
}

async function limparHistoricoFechamentos() {
    if (confirm('Deseja realmente limpar todo o histórico de fechamentos?\n\nEsta ação não pode ser desfeita!')) {
        try {
            const response = await fetch('http://localhost:3000/api/caixa/fechamentos', {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (data.success) {
                mostrarNotificacao('Histórico limpo com sucesso!', 'success');
                abrirHistoricoFechamentos();
            } else {
                mostrarNotificacao('Erro ao limpar histórico', 'error');
            }
        } catch (error) {
            console.error('Erro ao limpar histórico:', error);
            mostrarNotificacao('Erro ao limpar histórico', 'error');
        }
    }
}
