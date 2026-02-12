// ==================== GERENCIAMENTO DE CAIXA ====================

// Variáveis globais de caixa (compartilhadas com pdv.js)
let caixaAberto = false;
let caixaData = {
    valorAbertura: 0,
    operador: '',
    dataHoraAbertura: null,
    totalVendas: 0,
    totalReforcos: 0,
    totalSangrias: 0,
    movimentacoes: []
};

// Carregar estado do caixa do servidor
async function carregarEstadoCaixa() {
    try {
        const response = await fetch(`${API_URL}/caixa/status`);
        if (!response.ok) {
            console.error('❌ Resposta da API não OK:', response.status);
            return;
        }
        
        const data = await response.json();
        
        if (data.aberto && data.caixa) {
            caixaAberto = true;
            caixaData = {
                valorAbertura: parseFloat(data.caixa.valorAbertura),
                operador: data.caixa.operador,
                dataHoraAbertura: new Date(data.caixa.dataHoraAbertura),
                totalVendas: parseFloat(data.caixa.totalVendas),
                totalReforcos: parseFloat(data.caixa.totalReforcos),
                totalSangrias: parseFloat(data.caixa.totalSangrias),
                movimentacoes: data.caixa.movimentacoes || []
            };
        } else {
            console.log('⚠️ Caixa está fechado ou dados incompletos');
            caixaAberto = false;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar estado do caixa:', error);
    }
}

// Salvar estado do caixa no servidor
async function salvarEstadoCaixa() {
    if (!serverOnline) return;
    
    try {
        await fetch(`${API_URL}/caixa/atualizar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                totalVendas: caixaData.totalVendas,
                totalReforcos: caixaData.totalReforcos,
                totalSangrias: caixaData.totalSangrias,
                movimentacoes: caixaData.movimentacoes
            })
        });
    } catch (error) {
        console.error('Erro ao salvar estado do caixa:', error);
    }
}

function atualizarStatusCaixa() {
    const statusBadge = document.getElementById('caixaStatus');
    const saldoTexto = document.getElementById('saldoCaixaTexto');
    const btnAbrirCaixa = document.getElementById('btnAbrirCaixa');
    const btnReforcoCaixa = document.getElementById('btnReforcoCaixa');
    const btnSangria = document.getElementById('btnSangria');
    const btnFecharCaixa = document.getElementById('btnFecharCaixa');
    
    if (caixaAberto) {
        const saldoAtual = caixaData.valorAbertura + caixaData.totalVendas + caixaData.totalReforcos - caixaData.totalSangrias;
        
        // Atualizar saldoTexto APENAS se existir (quando modal do caixa estiver aberto)
        if (saldoTexto) {
            console.log('✅ Elemento saldoCaixaTexto encontrado - Atualizando para:', saldoAtual.toFixed(2));
            saldoTexto.innerHTML = `Saldo Atual: <strong style="color: #28a745;">R$ ${saldoAtual.toFixed(2)}</strong>`;
        }
        
        // Verificar se statusBadge existe (no PDV)
        if (statusBadge) {
            // Verificar se deve exibir alerta baseado nas configurações
            let deveAlertar = false;
            let mensagemAlerta = '';
            let diasOuHoras = '';
            
            if (typeof configuracoes !== 'undefined' && configuracoes.tipoAlerta !== 'desabilitado') {
                const agora = new Date();
                const dataAbertura = new Date(caixaData.dataHoraAbertura);
                
                if (configuracoes.tipoAlerta === 'dia_diferente') {
                    // Alertar se for de dia diferente
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    
                    const dataAberturaZerada = new Date(dataAbertura);
                    dataAberturaZerada.setHours(0, 0, 0, 0);
                    
                    if (dataAberturaZerada.getTime() < hoje.getTime()) {
                        deveAlertar = true;
                        const diasDiferenca = Math.floor((hoje - dataAberturaZerada) / (1000 * 60 * 60 * 24));
                        diasOuHoras = `${diasDiferenca} dia(s) atrás`;
                        mensagemAlerta = `⚠️ ATENÇÃO: Caixa aberto desde ${dataAbertura.toLocaleDateString('pt-BR')} às ${dataAbertura.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`;
                    }
                } else if (configuracoes.tipoAlerta === 'horas') {
                    // Alertar após X horas
                    const horasAbertas = (agora - dataAbertura) / (1000 * 60 * 60);
                    const limiteHoras = configuracoes.horasAlerta || 24;
                    
                    if (horasAbertas >= limiteHoras) {
                        deveAlertar = true;
                        diasOuHoras = `${Math.floor(horasAbertas)} hora(s)`;
                        mensagemAlerta = `⚠️ ATENÇÃO: Caixa aberto há mais de ${limiteHoras} hora(s)`;
                    }
                }
            }
            
            if (deveAlertar) {
                // Exibir alerta
                const dataAbertura = new Date(caixaData.dataHoraAbertura);
                statusBadge.style.background = '#ff9800';
                statusBadge.innerHTML = `⚠️ Caixa Aberto desde ${dataAbertura.toLocaleDateString('pt-BR')}`;
                statusBadge.style.animation = 'pulse 2s infinite';
                
                if (saldoTexto) {
                    saldoTexto.innerHTML = `
                        <div style="color: #ff9800; font-weight: bold; margin-bottom: 5px;">
                            ${mensagemAlerta}
                            <br><small>(${diasOuHoras})</small>
                        </div>
                        Saldo Atual: <strong style="color: #28a745;">R$ ${saldoAtual.toFixed(2)}</strong>
                    `;
                }
                
                // Mostrar notificação na primeira vez
                if (!window.alertaCaixaAbertoMostrado) {
                    window.alertaCaixaAbertoMostrado = true;
                    setTimeout(() => {
                        mostrarNotificacao(
                            `${mensagemAlerta}! Recomenda-se fazer o fechamento.`,
                            'error'
                        );
                    }, 1000);
                }
            } else {
                // Caixa aberto normalmente (sem alerta)
                statusBadge.style.background = '#28a745';
                statusBadge.innerHTML = '🔓 Caixa Aberto';
                statusBadge.style.animation = 'none';
            }
        }
        
        // Atualizar saldoTexto se existir (quando modal estiver aberto)
        if (saldoTexto) {
            saldoTexto.innerHTML = `Saldo Atual: <strong style="color: #28a745;">R$ ${saldoAtual.toFixed(2)}</strong>`;
        }
        
        if (btnAbrirCaixa) btnAbrirCaixa.disabled = true;
        if (btnReforcoCaixa) btnReforcoCaixa.disabled = false;
        if (btnSangria) btnSangria.disabled = false;
        if (btnFecharCaixa) btnFecharCaixa.disabled = false;
    } else {
        if (statusBadge) {
            statusBadge.style.background = '#dc3545';
            statusBadge.innerHTML = '🔒 Caixa Fechado';
            statusBadge.style.animation = 'none';
        }
        if (saldoTexto) {
            saldoTexto.innerHTML = `Saldo Atual: <strong style="color: #666;">R$ 0,00</strong>`;
        }
        if (btnAbrirCaixa) btnAbrirCaixa.disabled = false;
        if (btnReforcoCaixa) btnReforcoCaixa.disabled = true;
        if (btnSangria) btnSangria.disabled = true;
        if (btnFecharCaixa) btnFecharCaixa.disabled = true;
    }
}

async function abrirMenuCaixa() {
    await carregarEstadoCaixa();
    console.log('🔍 DEBUG Menu Caixa - caixaAberto:', caixaAberto);
    console.log('🔍 DEBUG Menu Caixa - caixaData:', caixaData);
    abrirModal('menuCaixaModal', () => {
        // Atualizar status DEPOIS que o modal estiver no DOM
        atualizarStatusCaixa();
    });
}

function abrirModalAberturaCaixa() {
    abrirModal('aberturaCaixaModal', () => {
        const input = document.getElementById('valorAbertura');
        if (input && !input.getValorDecimal) {
            aplicarFormatacaoMoeda(input);
        }
        if (input) {
            input.focus();
        }
        const operador = document.getElementById('operadorAbertura');
        if (operador) {
            operador.value = '';
        }
    });
}

async function confirmarAberturaCaixa(event) {
    event.preventDefault();
    
    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }
    
    const inputValor = document.getElementById('valorAbertura');
    const valor = inputValor.getValorDecimal ? inputValor.getValorDecimal() : parseFloat(inputValor.value);
    const operador = document.getElementById('operadorAbertura').value.trim();
    
    if (valor < 0) {
        mostrarNotificacao('Valor inválido!', 'error');
        return;
    }
    
    if (!operador) {
        mostrarNotificacao('Informe o nome do operador!', 'error');
        return;
    }
    
    const movimentacao = {
        tipo: 'abertura',
        valor: valor,
        operador: operador,
        dataHora: new Date(),
        observacao: 'Abertura de caixa'
    };
    
    try {
        const response = await fetch(`${API_URL}/caixa/abrir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operador: operador,
                valorAbertura: valor,
                dataHoraAbertura: new Date(),
                movimentacoes: [movimentacao]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao abrir caixa');
        }
        
        caixaAberto = true;
        caixaData = {
            valorAbertura: valor,
            operador: operador,
            dataHoraAbertura: new Date(),
            totalVendas: 0,
            totalReforcos: 0,
            totalSangrias: 0,
            movimentacoes: [movimentacao]
        };
        
        atualizarStatusCaixa();
        fecharModal('aberturaCaixaModal');
        mostrarNotificacao(`✓ Caixa aberto por ${operador} com R$ ${valor.toFixed(2)}`, 'success');
        
    } catch (error) {
        console.error('Erro ao abrir caixa:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

function abrirModalReforcoCaixa() {
    abrirModal('reforcoCaixaModal', () => {
        const input = document.getElementById('valorReforco');
        if (input && !input.getValorDecimal) {
            aplicarFormatacaoMoeda(input);
        }
        if (input) {
            input.focus();
        }
        const obs = document.getElementById('observacaoReforco');
        if (obs) {
            obs.value = '';
        }
    });
}

function confirmarReforcoCaixa(event) {
    event.preventDefault();
    
    const inputValor = document.getElementById('valorReforco');
    const valor = inputValor.getValorDecimal ? inputValor.getValorDecimal() : parseFloat(inputValor.value);
    const observacao = document.getElementById('observacaoReforco').value.trim();
    
    if (valor <= 0) {
        mostrarNotificacao('Valor deve ser maior que zero!', 'error');
        return;
    }
    
    caixaData.totalReforcos += valor;
    caixaData.movimentacoes.push({
        tipo: 'reforco',
        valor: valor,
        dataHora: new Date(),
        observacao: observacao || 'Reforço de caixa'
    });
    
    salvarEstadoCaixa();
    atualizarStatusCaixa();
    fecharModal('reforcoCaixaModal');
    mostrarNotificacao(`✓ Reforço de R$ ${valor.toFixed(2)} adicionado ao caixa!`, 'success');
}

function abrirModalSangria() {
    abrirModal('sangriaModal', () => {
        const input = document.getElementById('valorSangria');
        if (input && !input.getValorDecimal) {
            aplicarFormatacaoMoeda(input);
        }
        if (input) {
            input.focus();
        }
        const obs = document.getElementById('observacaoSangria');
        if (obs) {
            obs.value = '';
        }
    });
}

function confirmarSangria(event) {
    event.preventDefault();
    
    const inputValor = document.getElementById('valorSangria');
    const valor = inputValor.getValorDecimal ? inputValor.getValorDecimal() : parseFloat(inputValor.value);
    const observacao = document.getElementById('observacaoSangria').value.trim();
    
    if (valor <= 0) {
        mostrarNotificacao('Valor deve ser maior que zero!', 'error');
        return;
    }
    
    const saldoAtual = caixaData.valorAbertura + caixaData.totalVendas + caixaData.totalReforcos - caixaData.totalSangrias;
    
    if (valor > saldoAtual) {
        mostrarNotificacao(`Saldo insuficiente! Saldo atual: R$ ${saldoAtual.toFixed(2)}`, 'error');
        return;
    }
    
    if (!observacao) {
        mostrarNotificacao('Informe o motivo da sangria!', 'error');
        return;
    }
    
    caixaData.totalSangrias += valor;
    caixaData.movimentacoes.push({
        tipo: 'sangria',
        valor: valor,
        dataHora: new Date(),
        observacao: observacao
    });
    
    salvarEstadoCaixa();
    atualizarStatusCaixa();
    fecharModal('sangriaModal');
    mostrarNotificacao(`✓ Sangria de R$ ${valor.toFixed(2)} realizada!`, 'info');
}

async function abrirModalFechamentoCaixa() {
    const saldoEsperado = caixaData.valorAbertura + caixaData.totalVendas + caixaData.totalReforcos - caixaData.totalSangrias;
    
    document.getElementById('fechValorAbertura').textContent = `R$ ${caixaData.valorAbertura.toFixed(2)}`;
    document.getElementById('fechTotalVendas').textContent = `R$ ${caixaData.totalVendas.toFixed(2)}`;
    document.getElementById('fechReforcos').textContent = `R$ ${caixaData.totalReforcos.toFixed(2)}`;
    document.getElementById('fechSangrias').textContent = `R$ ${caixaData.totalSangrias.toFixed(2)}`;
    document.getElementById('fechSaldoEsperado').textContent = `R$ ${saldoEsperado.toFixed(2)}`;
    
    // Buscar formas de pagamento das vendas do período
    await carregarFormasPagamentoCaixa();
    
    document.getElementById('diferencaFechamento').style.display = 'none';
    
    abrirModal('fechamentoCaixaModal', () => {
        const input = document.getElementById('valorFechamento');
        if (input && !input.getValorDecimal) {
            aplicarFormatacaoMoeda(input, () => {
                // Callback do Enter - submeter o form
                const form = input.closest('form');
                if (form) {
                    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            });
        }
        if (input) {
            input.focus();
        }
    });
    
    // Calcular diferença ao digitar
    document.getElementById('valorFechamento').oninput = function() {
        const inputValor = document.getElementById('valorFechamento');
        const valorReal = inputValor.getValorDecimal ? inputValor.getValorDecimal() : (parseFloat(this.value) || 0);
        const diferenca = valorReal - saldoEsperado;
        const divDiferenca = document.getElementById('diferencaFechamento');
        
        if (valorReal > 0 && diferenca !== 0) {
            divDiferenca.style.display = 'block';
            if (diferenca > 0) {
                divDiferenca.style.background = '#d4edda';
                divDiferenca.style.color = '#155724';
                divDiferenca.querySelector('p').textContent = `💰 Sobra de R$ ${diferenca.toFixed(2)}`;
            } else {
                divDiferenca.style.background = '#f8d7da';
                divDiferenca.style.color = '#721c24';
                divDiferenca.querySelector('p').textContent = `⚠️ Falta R$ ${Math.abs(diferenca).toFixed(2)}`;
            }
        } else {
            divDiferenca.style.display = 'none';
        }
    };
}

async function carregarFormasPagamentoCaixa() {
    console.log('🔍 Carregando formas de pagamento do caixa...');
    
    // Atualizar elementos imediatamente com valores padrão
    const fechDinheiroEl = document.getElementById('fechTotalDinheiro');
    const fechMaquininhaEl = document.getElementById('fechTotalMaquininha');
    
    if (fechDinheiroEl) fechDinheiroEl.textContent = 'Carregando...';
    if (fechMaquininhaEl) fechMaquininhaEl.textContent = 'Carregando...';
    
    try {
        // Buscar todas as vendas
        const response = await fetch(`${API_URL}/vendas`);
        if (!response.ok) throw new Error('Erro ao buscar vendas');
        
        const todasVendas = await response.json();
        
        // Filtrar vendas do período do caixa aberto (após a abertura)
        const dataAbertura = new Date(caixaData.dataHoraAbertura);
        const vendasDoCaixa = todasVendas.filter(venda => {
            const dataVenda = new Date(venda.data_venda.replace(' ', 'T'));
            return dataVenda >= dataAbertura;
        });
        
        console.log(`📊 Vendas no período: ${vendasDoCaixa.length}`);
        
        // Buscar formas de pagamento de cada venda
        let totalDinheiro = 0;
        let totalMaquininha = 0;
        
        for (const venda of vendasDoCaixa) {
            const detalhesResponse = await fetch(`${API_URL}/vendas/${venda.id}`);
            if (detalhesResponse.ok) {
                const detalhes = await detalhesResponse.json();
                if (detalhes.formas_pagamento && detalhes.formas_pagamento.length > 0) {
                    detalhes.formas_pagamento.forEach(fp => {
                        const valor = parseFloat(fp.valor);
                        if (fp.forma_pagamento === 'dinheiro') {
                            totalDinheiro += valor;
                        } else {
                            // débito, crédito e pix vão para maquininha
                            totalMaquininha += valor;
                        }
                    });
                }
            }
        }
        
        console.log(`💰 Calculado: Dinheiro R$ ${totalDinheiro.toFixed(2)} | Maquininha R$ ${totalMaquininha.toFixed(2)}`);
        
        // Atualizar campos no modal
        if (fechDinheiroEl) {
            fechDinheiroEl.textContent = `R$ ${totalDinheiro.toFixed(2)}`;
            console.log('✅ Dinheiro atualizado');
        } else {
            console.error('❌ Elemento fechTotalDinheiro não encontrado!');
        }
        
        if (fechMaquininhaEl) {
            fechMaquininhaEl.textContent = `R$ ${totalMaquininha.toFixed(2)}`;
            console.log('✅ Maquininha atualizada');
        } else {
            console.error('❌ Elemento fechTotalMaquininha não encontrado!');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar formas de pagamento:', error);
        if (fechDinheiroEl) fechDinheiroEl.textContent = 'Erro';
        if (fechMaquininhaEl) fechMaquininhaEl.textContent = 'Erro';
    }
}

function confirmarFechamentoCaixa(event) {
    event.preventDefault();
    
    const inputValor = document.getElementById('valorFechamento');
    const valorReal = inputValor.getValorDecimal ? inputValor.getValorDecimal() : parseFloat(inputValor.value);
    
    if (isNaN(valorReal) || valorReal < 0) {
        mostrarNotificacao('Digite um valor válido!', 'error');
        return;
    }
    
    const saldoEsperado = caixaData.valorAbertura + caixaData.totalVendas + caixaData.totalReforcos - caixaData.totalSangrias;
    const diferenca = valorReal - saldoEsperado;
    
    // Preencher dados do modal de confirmação
    document.getElementById('confFechOperador').textContent = caixaData.operador;
    document.getElementById('confFechEsperado').textContent = `R$ ${saldoEsperado.toFixed(2)}`;
    document.getElementById('confFechReal').textContent = `R$ ${valorReal.toFixed(2)}`;
    
    const divDiferenca = document.getElementById('confFechDiferencaDiv');
    const txtDiferenca = document.getElementById('confFechDiferenca');
    
    if (diferenca !== 0) {
        divDiferenca.style.display = 'block';
        if (diferenca > 0) {
            divDiferenca.style.background = '#d4edda';
            divDiferenca.style.borderLeft = '4px solid #28a745';
            txtDiferenca.style.color = '#155724';
            txtDiferenca.textContent = `💰 Sobra: R$ ${diferenca.toFixed(2)}`;
        } else {
            divDiferenca.style.background = '#f8d7da';
            divDiferenca.style.borderLeft = '4px solid #dc3545';
            txtDiferenca.style.color = '#721c24';
            txtDiferenca.textContent = `⚠️ Falta: R$ ${Math.abs(diferenca).toFixed(2)}`;
        }
    } else {
        divDiferenca.style.display = 'none';
    }
    
    // Armazenar dados para uso na confirmação final
    window.dadosFechamentoPendente = {
        valorReal,
        saldoEsperado,
        diferenca
    };
    
    // Abrir modal de confirmação
    abrirModal('confirmacaoFechamentoCaixaModal');
    
    // Adicionar event listener para Enter após abrir o modal
    setTimeout(() => {
        
        // Remover listener antigo se existir
        if (window.enterFechamentoHandler) {
            document.removeEventListener('keydown', window.enterFechamentoHandler);
        }
        
        // Criar novo handler e armazenar referência
        window.enterFechamentoHandler = function(e) {
            const modalConfirmacao = document.getElementById('confirmacaoFechamentoCaixaModal');
            
            // Verificar se o modal ainda está aberto
            if (modalConfirmacao && modalConfirmacao.classList.contains('active') && e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                confirmarFechamentoCaixaFinal();
            }
        };
        
        // Adicionar listener no document para garantir captura
        document.addEventListener('keydown', window.enterFechamentoHandler, true);
    }, 150);
}

function cancelarConfirmacaoFechamentoCaixa() {
    fecharModal('confirmacaoFechamentoCaixaModal');
    window.dadosFechamentoPendente = null;
    
    // Remover event listener do Enter
    if (window.enterFechamentoHandler) {
        document.removeEventListener('keydown', window.enterFechamentoHandler, true);
        window.enterFechamentoHandler = null;
    }
}

function confirmarFechamentoCaixaFinal() {
    if (!window.dadosFechamentoPendente) {
        mostrarNotificacao('Erro: dados de fechamento não encontrados', 'error');
        return;
    }
    
    const { valorReal, saldoEsperado, diferenca } = window.dadosFechamentoPendente;
    
    // Registrar fechamento
    caixaData.movimentacoes.push({
        tipo: 'fechamento',
        valorEsperado: saldoEsperado,
        valorReal: valorReal,
        diferenca: diferenca,
        dataHora: new Date(),
        observacao: 'Fechamento de caixa'
    });
    
    // Salvar fechamento no banco de dados
    const fechamento = {
        operador: caixaData.operador,
        dataHoraAbertura: caixaData.dataHoraAbertura,
        dataHoraFechamento: new Date().toISOString(),
        valorAbertura: caixaData.valorAbertura,
        totalVendas: caixaData.totalVendas,
        totalReforcos: caixaData.totalReforcos,
        totalSangrias: caixaData.totalSangrias,
        saldoEsperado: saldoEsperado,
        saldoReal: valorReal,
        diferenca: diferenca,
        movimentacoes: caixaData.movimentacoes.map(mov => ({
            tipo: mov.tipo,
            valor: mov.valor || 0,
            observacao: mov.observacao || '',
            dataHora: mov.dataHora instanceof Date ? mov.dataHora.toISOString() : mov.dataHora
        }))
    };
    
    // Enviar para a API
    fetch('http://localhost:3000/api/caixa/fechamentos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fechamento)
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            console.error('Erro ao salvar fechamento:', data.message);
        }
    })
    .catch(error => {
        console.error('Erro ao salvar fechamento:', error);
    });
    
    // Mostrar resumo
    let resumo = `✓ Caixa fechado!\n\n`;
    resumo += `Operador: ${caixaData.operador}\n`;
    resumo += `Abertura: R$ ${caixaData.valorAbertura.toFixed(2)}\n`;
    resumo += `Vendas: R$ ${caixaData.totalVendas.toFixed(2)}\n`;
    resumo += `Reforços: R$ ${caixaData.totalReforcos.toFixed(2)}\n`;
    resumo += `Sangrias: R$ ${caixaData.totalSangrias.toFixed(2)}\n`;
    resumo += `\nEsperado: R$ ${saldoEsperado.toFixed(2)}\n`;
    resumo += `Real: R$ ${valorReal.toFixed(2)}`;
    
    if (diferenca !== 0) {
        resumo += diferenca > 0 ? `\n\n💰 Sobra: R$ ${diferenca.toFixed(2)}` : `\n\n⚠️ Falta: R$ ${Math.abs(diferenca).toFixed(2)}`;
    }
    
    // Resetar caixa
    caixaAberto = false;
    const caixaFechadoData = {...caixaData}; // Salvar para relatório se necessário
    caixaData = {
        valorAbertura: 0,
        operador: '',
        dataHoraAbertura: null,
        totalVendas: 0,
        totalReforcos: 0,
        totalSangrias: 0,
        movimentacoes: []
    };
    
    salvarEstadoCaixa();
    atualizarStatusCaixa();
    
    // Fechar ambos os modais
    fecharModal('confirmacaoFechamentoCaixaModal');
    fecharModal('fechamentoCaixaModal');
    
    // Remover event listener do Enter
    if (window.enterFechamentoHandler) {
        document.removeEventListener('keydown', window.enterFechamentoHandler, true);
        window.enterFechamentoHandler = null;
    }
    
    alert(resumo);
    mostrarNotificacao('Caixa fechado com sucesso!', 'success');
    
    // Limpar dados pendentes
    window.dadosFechamentoPendente = null;
}
