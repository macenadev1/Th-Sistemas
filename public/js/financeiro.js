// ==================== MÓDULO FINANCEIRO - CONTAS A PAGAR ====================

let contasCompletas = [];
let paginaAtualContas = 1;
const itensPorPaginaContas = 10;

// ==================== LISTAGEM DE CONTAS A PAGAR ====================

async function abrirGerenciarContasPagar() {
    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    abrirModal('listaContasPagarModal');
    const content = document.getElementById('contasPagarContent');
    content.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Carregando contas...</p>';

    try {
        await carregarContasPagar();
        await carregarEstatisticasContas();
    } catch (error) {
        console.error('Erro ao carregar contas:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar contas a pagar</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}

async function carregarContasPagar() {
    const response = await fetch(`${window.API_URL}/contas-pagar`);
    if (!response.ok) throw new Error('Erro ao carregar contas');
    
    const data = await response.json();
    contasCompletas = data.contas || [];
    
    // Resetar filtros
    limparFiltrosContas();
}

async function carregarEstatisticasContas() {
    try {
        const response = await fetch(`${window.API_URL}/contas-pagar/stats/resumo`);
        const data = await response.json();
        
        if (data.success && data.stats) {
            const stats = data.stats;
            
            document.getElementById('totalPendente').textContent = `R$ ${parseFloat(stats.total_pendente || 0).toFixed(2)}`;
            document.getElementById('qtdPendente').textContent = `${stats.qtd_pendente || 0} conta(s)`;
            
            document.getElementById('totalVencido').textContent = `R$ ${parseFloat(stats.total_vencido || 0).toFixed(2)}`;
            document.getElementById('qtdVencido').textContent = `${stats.qtd_vencido || 0} conta(s)`;
            
            document.getElementById('totalPagoMes').textContent = `R$ ${parseFloat(stats.total_pago_mes || 0).toFixed(2)}`;
            document.getElementById('qtdPagoMes').textContent = `${stats.qtd_pago_mes || 0} conta(s)`;
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

function resetarPaginaEFiltrarContas() {
    paginaAtualContas = 1;
    aplicarFiltrosContas();
}

function aplicarFiltrosContas() {
    const busca = document.getElementById('filtroBuscaConta').value.toLowerCase();
    const status = document.getElementById('filtroStatusConta').value;
    const dataInicio = document.getElementById('filtroDataInicio').value;
    const dataFim = document.getElementById('filtroDataFim').value;
    
    let contasFiltradas = [...contasCompletas];
    
    // Filtro por busca (descrição ou fornecedor)
    if (busca) {
        contasFiltradas = contasFiltradas.filter(conta => 
            conta.descricao.toLowerCase().includes(busca) ||
            (conta.fornecedor_nome && conta.fornecedor_nome.toLowerCase().includes(busca))
        );
    }
    
    // Filtro por status
    if (status !== 'todos') {
        contasFiltradas = contasFiltradas.filter(conta => conta.status === status);
    }
    
    // Filtro por data de vencimento
    if (dataInicio) {
        contasFiltradas = contasFiltradas.filter(conta => {
            const dataVencimento = new Date(conta.data_vencimento);
            const dataInicioDate = new Date(dataInicio);
            return dataVencimento >= dataInicioDate;
        });
    }
    
    if (dataFim) {
        contasFiltradas = contasFiltradas.filter(conta => {
            const dataVencimento = new Date(conta.data_vencimento);
            const dataFimDate = new Date(dataFim);
            return dataVencimento <= dataFimDate;
        });
    }
    
    // Atualizar contador
    document.getElementById('contadorContas').textContent = `${contasFiltradas.length} conta(s) encontrada(s)`;
    
    // Renderizar contas filtradas
    renderizarContas(contasFiltradas);
}

function limparFiltrosContas() {
    document.getElementById('filtroBuscaConta').value = '';
    document.getElementById('filtroStatusConta').value = 'todos';
    document.getElementById('filtroDataInicio').value = '';
    document.getElementById('filtroDataFim').value = '';
    paginaAtualContas = 1;
    aplicarFiltrosContas();
}

function renderizarContas(contas) {
    const content = document.getElementById('contasPagarContent');
    
    if (contas.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">💰</div>
                <p>Nenhuma conta encontrada</p>
                <p style="font-size: 14px; margin-top: 10px;">Cadastre uma nova conta ou ajuste os filtros</p>
            </div>
        `;
        document.getElementById('paginacaoContas').innerHTML = '';
        return;
    }

    // Calcular paginação
    const totalPaginas = Math.ceil(contas.length / itensPorPaginaContas);
    const inicio = (paginaAtualContas - 1) * itensPorPaginaContas;
    const fim = inicio + itensPorPaginaContas;
    const contasPagina = contas.slice(inicio, fim);

    let html = '<div style="padding: 10px;"><div style="display: grid; gap: 10px;">';
    
    for (const conta of contasPagina) {
        const dataVencimento = new Date(conta.data_vencimento);
        const hoje = new Date();
        const diasParaVencer = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));
        
        let statusColor, statusTexto, statusBg, alertaVencimento = '';
        
        switch(conta.status) {
            case 'pago':
                statusColor = '#28a745';
                statusTexto = '✓ Pago';
                statusBg = '#d4edda';
                break;
            case 'vencido':
                statusColor = '#dc3545';
                statusTexto = '⚠️ Vencido';
                statusBg = '#f8d7da';
                alertaVencimento = `<span style="color: #dc3545; font-weight: bold;">Venceu há ${Math.abs(diasParaVencer)} dia(s)</span>`;
                break;
            case 'cancelado':
                statusColor = '#6c757d';
                statusTexto = '✕ Cancelado';
                statusBg = '#e2e3e5';
                break;
            default: // pendente
                statusColor = '#ffc107';
                statusTexto = '⏳ Pendente';
                statusBg = '#fff3cd';
                if (diasParaVencer <= 3) {
                    alertaVencimento = `<span style="color: #ff9800; font-weight: bold;">Vence em ${diasParaVencer} dia(s)</span>`;
                } else {
                    alertaVencimento = `<span style="color: #666;">Vence em ${diasParaVencer} dia(s)</span>`;
                }
        }
        
        html += `
            <div style="
                background: ${statusBg}; 
                padding: 15px; 
                border-radius: 8px; 
                border-left: 4px solid ${statusColor};
                transition: all 0.2s;
            ">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <strong style="font-size: 16px;">${conta.descricao}</strong>
                            <span style="
                                background: ${statusColor}; 
                                color: white; 
                                padding: 3px 10px; 
                                border-radius: 12px; 
                                font-size: 12px; 
                                font-weight: bold;
                            ">${statusTexto}</span>
                        </div>
                        <div style="font-size: 14px; color: #666; line-height: 1.6;">
                            ${conta.fornecedor_nome ? `<div>🏢 Fornecedor: ${conta.fornecedor_nome}</div>` : ''}
                            ${conta.categoria_nome ? `<div>🏷️ Categoria: ${conta.categoria_nome}</div>` : ''}
                            <div>📅 Vencimento: ${dataVencimento.toLocaleDateString('pt-BR')} ${alertaVencimento ? `- ${alertaVencimento}` : ''}</div>
                            ${conta.data_pagamento ? `<div>✅ Pago em: ${new Date(conta.data_pagamento).toLocaleDateString('pt-BR')}</div>` : ''}
                        </div>
                    </div>
                    <div style="text-align: right; margin-left: 15px;">
                        <div style="font-size: 24px; font-weight: bold; color: ${statusColor}; margin-bottom: 10px;">
                            R$ ${parseFloat(conta.valor).toFixed(2)}
                        </div>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end;">
                            ${conta.status === 'pendente' || conta.status === 'vencido' ? `
                                <button onclick="pagarConta(${conta.id})" class="btn btn-success" style="font-size: 12px; padding: 5px 10px;" title="Pagar">
                                    💳 Pagar
                                </button>
                                <button onclick="editarConta(${conta.id})" class="btn btn-primary" style="font-size: 12px; padding: 5px 10px;" title="Editar">
                                    ✏️
                                </button>
                            ` : ''}
                            ${conta.status !== 'pago' ? `
                                <button onclick="excluirConta(${conta.id})" class="btn btn-danger" style="font-size: 12px; padding: 5px 10px;" title="Excluir">
                                    🗑️
                                </button>
                            ` : ''}
                            ${conta.status === 'pago' ? `
                                <button onclick="verDetalhesConta(${conta.id})" class="btn btn-info" style="font-size: 12px; padding: 5px 10px;" title="Ver Detalhes">
                                    👁️
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    html += '</div></div>';
    content.innerHTML = html;
    
    renderizarPaginacaoContas(totalPaginas, contas);
}

function renderizarPaginacaoContas(totalPaginas, contas) {
    const paginacao = document.getElementById('paginacaoContas');
    
    if (totalPaginas <= 1) {
        paginacao.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button onclick="mudarPaginaContas(${paginaAtualContas - 1})" ${paginaAtualContas === 1 ? 'disabled' : ''} style="padding: 8px 16px; background: ${paginaAtualContas === 1 ? '#e9ecef' : '#007bff'}; color: ${paginaAtualContas === 1 ? '#6c757d' : 'white'}; border: none; border-radius: 6px; cursor: ${paginaAtualContas === 1 ? 'not-allowed' : 'pointer'}; font-weight: 600;">← Anterior</button>`;
    
    const maxBotoes = 5;
    let inicio = Math.max(1, paginaAtualContas - Math.floor(maxBotoes / 2));
    let fim = Math.min(totalPaginas, inicio + maxBotoes - 1);
    
    if (fim - inicio < maxBotoes - 1) {
        inicio = Math.max(1, fim - maxBotoes + 1);
    }
    
    if (inicio > 1) html += `<span style="padding: 8px; color: #666;">...</span>`;
    
    for (let i = inicio; i <= fim; i++) {
        html += `<button onclick="mudarPaginaContas(${i})" style="padding: 8px 16px; background: ${i === paginaAtualContas ? '#007bff' : 'white'}; color: ${i === paginaAtualContas ? 'white' : '#007bff'}; border: 2px solid #007bff; border-radius: 6px; cursor: pointer; font-weight: ${i === paginaAtualContas ? '800' : '600'}; min-width: 45px;">${i}</button>`;
    }
    
    if (fim < totalPaginas) html += `<span style="padding: 8px; color: #666;">...</span>`;
    
    html += `<button onclick="mudarPaginaContas(${paginaAtualContas + 1})" ${paginaAtualContas === totalPaginas ? 'disabled' : ''} style="padding: 8px 16px; background: ${paginaAtualContas === totalPaginas ? '#e9ecef' : '#007bff'}; color: ${paginaAtualContas === totalPaginas ? '#6c757d' : 'white'}; border: none; border-radius: 6px; cursor: ${paginaAtualContas === totalPaginas ? 'not-allowed' : 'pointer'}; font-weight: 600;">Próximo →</button>`;
    
    paginacao.innerHTML = html;
}

function mudarPaginaContas(novaPagina) {
    paginaAtualContas = novaPagina;
    aplicarFiltrosContas();
}

// ==================== CADASTRO DE CONTA A PAGAR ====================

function abrirCadastroContaPagar() {
    abrirModal('cadastroContaPagarModal', async () => {
        document.getElementById('formCadastroContaPagar').reset();
        
        const inputValor = document.getElementById('valorContaPagar');
        if (inputValor && !inputValor.getValorDecimal) {
            aplicarFormatacaoMoeda(inputValor);
        }
        
        // Carregar fornecedores e categorias
        await carregarFornecedoresSelectConta('fornecedorContaPagar');
        await carregarCategoriasFinanceirasSelect('categoriaContaPagar');
        
        // Setar data de vencimento padrão (hoje + 30 dias)
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + 30);
        document.getElementById('dataVencimentoContaPagar').value = dataVencimento.toISOString().split('T')[0];
        
        document.getElementById('descricaoContaPagar').focus();
    });
}

// ==================== VERIFICAÇÃO DE SALDO DISPONÍVEL ====================

async function atualizarSaldoOrigemCadastro() {
    const origem = document.getElementById('origemPagamentoContaPagar').value;
    const mesReferencia = document.getElementById('mesReferenciaContaPagar').value;
    const saldoDiv = document.getElementById('saldoDisponivelCadastro');
    const valorSaldo = document.getElementById('valorSaldoDisponivelCadastro');
    const alertaSaldo = document.getElementById('alertaSaldoNegativoCadastro');
    
    // Limpar visualização se não houver origem ou mês selecionado
    if (!origem || !mesReferencia) {
        saldoDiv.style.display = 'none';
        return;
    }
    
    try {
        // Extrair ano e mês
        const [ano, mes] = mesReferencia.split('-');
        
        // Buscar saldos do mês
        const response = await fetch(`${window.API_URL}/contas-pagar/saldos-mes/${ano}/${mes}`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Erro ao carregar saldos');
        }
        
        const saldos = data.saldos;
        const saldoOrigem = origem === 'reposicao' ? saldos.reposicao : saldos.lucro;
        
        // Exibir saldo disponível
        saldoDiv.style.display = 'block';
        valorSaldo.textContent = `R$ ${saldoOrigem.disponivel.toFixed(2)}`;
        
        // Verificar se saldo é negativo
        if (saldoOrigem.negativo) {
            valorSaldo.style.color = '#dc3545';
            alertaSaldo.style.display = 'block';
        } else {
            valorSaldo.style.color = '#28a745';
            alertaSaldo.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Erro ao carregar saldo:', error);
        saldoDiv.style.display = 'none';
        mostrarNotificacao('Erro ao verificar saldo disponível', 'error');
    }
}

async function atualizarSaldoOrigemEdicao() {
    const origem = document.getElementById('editarOrigemPagamentoConta').value;
    const mesReferencia = document.getElementById('editarMesReferenciaConta').value;
    const saldoDiv = document.getElementById('saldoDisponivelEdicao');
    const valorSaldo = document.getElementById('valorSaldoDisponivelEdicao');
    const alertaSaldo = document.getElementById('alertaSaldoNegativoEdicao');
    
    // Limpar visualização se não houver origem ou mês selecionado
    if (!origem || !mesReferencia) {
        saldoDiv.style.display = 'none';
        return;
    }
    
    try {
        // Extrair ano e mês
        const [ano, mes] = mesReferencia.split('-');
        
        // Buscar saldos do mês
        const response = await fetch(`${window.API_URL}/contas-pagar/saldos-mes/${ano}/${mes}`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Erro ao carregar saldos');
        }
        
        const saldos = data.saldos;
        const saldoOrigem = origem === 'reposicao' ? saldos.reposicao : saldos.lucro;
        
        // Exibir saldo disponível
        saldoDiv.style.display = 'block';
        valorSaldo.textContent = `R$ ${saldoOrigem.disponivel.toFixed(2)}`;
        
        // Verificar se saldo é negativo
        if (saldoOrigem.negativo) {
            valorSaldo.style.color = '#dc3545';
            alertaSaldo.style.display = 'block';
        } else {
            valorSaldo.style.color = '#28a745';
            alertaSaldo.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Erro ao carregar saldo:', error);
        saldoDiv.style.display = 'none';
        mostrarNotificacao('Erro ao verificar saldo disponível', 'error');
    }
}

// ==================== CADASTRO DE CONTA ====================

async function salvarContaPagar(event) {
    event.preventDefault();
    
    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    const inputValor = document.getElementById('valorContaPagar');
    const valor = inputValor.getValorDecimal ? inputValor.getValorDecimal() : parseFloat(inputValor.value.replace(',', '.')) || 0;

    const dados = {
        descricao: document.getElementById('descricaoContaPagar').value.trim(),
        categoria_financeira_id: document.getElementById('categoriaContaPagar').value || null,
        fornecedor_id: document.getElementById('fornecedorContaPagar').value || null,
        valor: valor,
        data_vencimento: document.getElementById('dataVencimentoContaPagar').value,
        origem_pagamento: document.getElementById('origemPagamentoContaPagar').value,
        mes_referencia: document.getElementById('mesReferenciaContaPagar').value + '-01', // Adiciona dia 01
        observacoes: document.getElementById('observacoesContaPagar').value.trim() || null
    };

    if (!dados.descricao || dados.valor <= 0 || !dados.data_vencimento) {
        mostrarNotificacao('⚠️ Preencha os campos obrigatórios (descrição, valor e data de vencimento)', 'error');
        return;
    }

    if (!dados.origem_pagamento || !dados.mes_referencia) {
        mostrarNotificacao('⚠️ Selecione a origem do pagamento e o mês de referência', 'error');
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/contas-pagar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao cadastrar conta');
        }

        mostrarNotificacao(`✓ Conta "${dados.descricao}" cadastrada!`, 'success');
        
        fecharModal('cadastroContaPagarModal');
        
        // Recarregar lista
        await carregarContasPagar();
        await carregarEstatisticasContas();
        aplicarFiltrosContas();
    } catch (error) {
        console.error('Erro ao cadastrar conta:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

// ==================== EDIÇÃO DE CONTA ====================

async function editarConta(id) {
    try {
        const response = await fetch(`${window.API_URL}/contas-pagar/${id}`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            mostrarNotificacao('Conta não encontrada', 'error');
            return;
        }

        const conta = data.conta;

        document.getElementById('editarIdConta').value = conta.id;
        document.getElementById('editarDescricaoConta').value = conta.descricao || '';
        
        // Converter data para formato YYYY-MM-DD (input type="date" aceita apenas este formato)
        if (conta.data_vencimento) {
            const dataVenc = new Date(conta.data_vencimento);
            const dataFormatada = `${dataVenc.getFullYear()}-${String(dataVenc.getMonth() + 1).padStart(2, '0')}-${String(dataVenc.getDate()).padStart(2, '0')}`;
            document.getElementById('editarDataVencimentoConta').value = dataFormatada;
        } else {
            document.getElementById('editarDataVencimentoConta').value = '';
        }
        
        document.getElementById('editarStatusConta').value = conta.status || 'pendente';
        document.getElementById('editarObservacoesConta').value = conta.observacoes || '';
        
        // Carregar origem e mês de referência
        document.getElementById('editarOrigemPagamentoConta').value = conta.origem_pagamento || '';
        if (conta.mes_referencia) {
            // Converter data para formato YYYY-MM
            const mesRef = new Date(conta.mes_referencia);
            const mesFormatado = `${mesRef.getFullYear()}-${String(mesRef.getMonth() + 1).padStart(2, '0')}`;
            document.getElementById('editarMesReferenciaConta').value = mesFormatado;
        }

        abrirModal('editarContaPagarModal', async () => {
            const inputValorEdicao = document.getElementById('editarValorConta');
            if (inputValorEdicao) {
                aplicarFormatacaoMoeda(inputValorEdicao);
                inputValorEdicao.setValorDecimal(parseFloat(conta.valor) || 0);
            }
            
            // Carregar fornecedores e categorias
            await carregarFornecedoresSelectConta('editarFornecedorConta', conta.fornecedor_id);
            await carregarCategoriasFinanceirasSelect('editarCategoriaConta', conta.categoria_financeira_id);
            
            // Atualizar saldo se origem e mês já estiverem preenchidos
            if (conta.origem_pagamento && conta.mes_referencia) {
                await atualizarSaldoOrigemEdicao();
            }
            
            document.getElementById('editarDescricaoConta').focus();
        });

    } catch (error) {
        console.error('Erro ao carregar conta:', error);
        mostrarNotificacao('Erro ao carregar conta', 'error');
    }
}

async function salvarEdicaoConta(event) {
    event.preventDefault();

    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    const id = document.getElementById('editarIdConta').value;
    const inputValorEdicao = document.getElementById('editarValorConta');
    const valor = inputValorEdicao.getValorDecimal ? inputValorEdicao.getValorDecimal() : parseFloat(inputValorEdicao.value.replace(',', '.')) || 0;

    const dados = {
        descricao: document.getElementById('editarDescricaoConta').value.trim(),
        categoria_financeira_id: document.getElementById('editarCategoriaConta').value || null,
        fornecedor_id: document.getElementById('editarFornecedorConta').value || null,
        valor: valor,
        data_vencimento: document.getElementById('editarDataVencimentoConta').value,
        observacoes: document.getElementById('editarObservacoesConta').value.trim() || null,
        origem_pagamento: document.getElementById('editarOrigemPagamentoConta').value,
        mes_referencia: document.getElementById('editarMesReferenciaConta').value ? 
            document.getElementById('editarMesReferenciaConta').value + '-01' : null
    };

    if (!dados.descricao || dados.valor <= 0 || !dados.data_vencimento) {
        mostrarNotificacao('⚠️ Preencha os campos obrigatórios', 'error');
        return;
    }

    // Validar origem e mês
    if (!dados.origem_pagamento || !dados.mes_referencia) {
        mostrarNotificacao('⚠️ Selecione a origem do pagamento e o mês de referência', 'error');
        return;
    }

    try {
        const response = await fetch(`${window.API_URL}/contas-pagar/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao atualizar conta');
        }

        mostrarNotificacao(`✓ Conta "${dados.descricao}" atualizada!`, 'success');
        
        fecharModal('editarContaPagarModal');
        
        // Recarregar lista
        await carregarContasPagar();
        await carregarEstatisticasContas();
        aplicarFiltrosContas();
    } catch (error) {
        console.error('Erro ao atualizar conta:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

// ==================== PAGAR CONTA ====================

async function pagarConta(id) {
    // Buscar dados da conta
    try {
        const response = await fetch(`${window.API_URL}/contas-pagar/${id}`);
        const data = await response.json();
        
        if (!data.success) {
            mostrarNotificacao('Conta não encontrada', 'error');
            return;
        }

        const conta = data.conta;
        
        const formas = {
            'dinheiro': 'Dinheiro',
            'debito': 'Débito',
            'credito': 'Crédito',
            'pix': 'PIX',
            'boleto': 'Boleto',
            'transferencia': 'Transferência'
        };
        
        let opcoesHtml = '';
        for (const [key, label] of Object.entries(formas)) {
            opcoesHtml += `<option value="${key}">${label}</option>`;
        }
        
        // Verificar se conta já tem origem cadastrada
        const origemAtual = conta.origem_atual;
        const origemLabel = origemAtual === 'reposicao' ? '💼 Reposição' : origemAtual === 'lucro' ? '💵 Lucro' : null;
        
        const formaPagamento = await new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2>💳 Pagar Conta</h2>
                        <p style="margin-top: 10px;">${conta.descricao}</p>
                        <p style="font-size: 24px; font-weight: bold; color: #28a745; margin-top: 10px;">
                            R$ ${parseFloat(conta.valor).toFixed(2)}
                        </p>
                    </div>
                    <div style="padding: 20px;">
                        ${origemAtual ? `
                            <div class="form-group">
                                <label>💰 Origem do Pagamento:</label>
                                <div style="padding: 12px; background: #e3f2fd; border-radius: 6px; border: 2px solid #2196f3;">
                                    <strong style="color: #1976d2;">${origemLabel}</strong>
                                    <small style="color: #666; display: block; margin-top: 5px;">
                                        ✓ Origem já definida no cadastro
                                    </small>
                                </div>
                            </div>
                        ` : `
                            <div class="form-group">
                                <label>💰 Origem do Pagamento:</label>
                                <select id="origemPagamentoConta" required style="padding: 12px; font-size: 16px;">
                                    <option value="">-- Selecione --</option>
                                    <option value="reposicao">💼 Reposição (Estoque)</option>
                                    <option value="lucro">💵 Lucro (Livre)</option>
                                </select>
                                <small style="color: #666; display: block; margin-top: 5px;">
                                    De onde será deduzido o pagamento?
                                </small>
                            </div>
                        `}
                        <div class="form-group">
                            <label>Forma de Pagamento:</label>
                            <select id="formaPagamentoConta" required style="padding: 12px; font-size: 16px;">
                                <option value="">-- Selecione --</option>
                                ${opcoesHtml}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Data do Pagamento:</label>
                            <input type="date" id="dataPagamentoConta" value="${new Date().toISOString().split('T')[0]}" required style="padding: 12px; font-size: 16px;">
                        </div>
                        <div class="form-group">
                            <label>Observações (opcional):</label>
                            <textarea id="obsPagamentoConta" rows="3" placeholder="Ex: Comprovante nº 12345"></textarea>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-success" onclick="this.closest('.modal').dispatchEvent(new CustomEvent('confirmar'))" style="flex: 1; font-size: 16px;">
                            ✓ Confirmar Pagamento
                        </button>
                        <button type="button" class="btn btn-danger" onclick="this.closest('.modal').dispatchEvent(new CustomEvent('cancelar'))" style="flex: 1;">
                            Cancelar
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.addEventListener('confirmar', () => {
                // Se conta já tem origem, usar ela; senão, pegar do select
                const origemInput = document.getElementById('origemPagamentoConta');
                const origem = origemAtual || (origemInput ? origemInput.value : null);
                const forma = document.getElementById('formaPagamentoConta').value;
                const data = document.getElementById('dataPagamentoConta').value;
                const obs = document.getElementById('obsPagamentoConta').value;
                
                // Validar origem do pagamento (só se não houver origem_atual)
                if (!origem) {
                    mostrarNotificacao('⚠️ Selecione a origem do pagamento (Reposição ou Lucro)!', 'error');
                    return; // Mantém o modal aberto para correção
                }
                
                // Validar forma de pagamento
                if (!forma) {
                    mostrarNotificacao('⚠️ Selecione a forma de pagamento!', 'error');
                    return; // Mantém o modal aberto para correção
                }
                
                // Validar data de pagamento
                if (!data) {
                    mostrarNotificacao('⚠️ Selecione a data do pagamento!', 'error');
                    return; // Mantém o modal aberto para correção
                }
                
                // Validações OK - fechar modal e resolver Promise
                modal.remove();
                resolve({ origem, forma, data, obs });
            });
            
            modal.addEventListener('cancelar', () => {
                modal.remove();
                resolve(null);
            });
        });
        
        if (!formaPagamento) return; // Usuário cancelou
        
        // Enviar pagamento
        const responsePagar = await fetch(`${window.API_URL}/contas-pagar/${id}/pagar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({                origem_pagamento: formaPagamento.origem,                data_pagamento: formaPagamento.data,
                forma_pagamento: formaPagamento.forma,
                observacoes: formaPagamento.obs
            })
        });

        const result = await responsePagar.json();

        if (!responsePagar.ok) {
            throw new Error(result.error || 'Erro ao pagar conta');
        }

        mostrarNotificacao(`✓ Conta paga com sucesso!`, 'success');
        
        // Recarregar lista
        await carregarContasPagar();
        await carregarEstatisticasContas();
        aplicarFiltrosContas();

    } catch (error) {
        console.error('Erro ao pagar conta:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

// ==================== EXCLUIR CONTA ====================

async function excluirConta(id) {
    if (!confirm('Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/contas-pagar/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao excluir conta');
        }

        mostrarNotificacao('✓ Conta excluída com sucesso!', 'success');
        
        // Recarregar lista
        await carregarContasPagar();
        await carregarEstatisticasContas();
        aplicarFiltrosContas();
    } catch (error) {
        console.error('Erro ao excluir conta:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

// ==================== FUNÇÕES AUXILIARES ====================

async function carregarFornecedoresSelectConta(selectId, valorSelecionado = null) {
    try {
        const response = await fetch(`${window.API_URL}/fornecedores`);
        const fornecedores = await response.json();
        
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Nenhum --</option>';
        fornecedores.filter(f => f.ativo).forEach(f => {
            const option = document.createElement('option');
            option.value = f.id;
            option.textContent = f.nome_fantasia;
            if (valorSelecionado && f.id == valorSelecionado) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
    }
}

async function carregarCategoriasFinanceirasSelect(selectId, valorSelecionado = null) {
    try {
        const response = await fetch(`${window.API_URL}/categorias/financeiras?tipo=despesa`);
        const categorias = await response.json();
        
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Nenhuma --</option>';
        categorias.filter(c => c.ativo).forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.nome;
            if (valorSelecionado && c.id == valorSelecionado) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
}

async function verDetalhesConta(id) {
    try {
        const response = await fetch(`${window.API_URL}/contas-pagar/${id}`);
        const data = await response.json();
        
        if (!data.success) {
            mostrarNotificacao('Conta não encontrada', 'error');
            return;
        }

        const conta = data.conta;
        
        const formas = {
            'dinheiro': 'Dinheiro',
            'debito': 'Débito',
            'credito': 'Crédito',
            'pix': 'PIX',
            'boleto': 'Boleto',
            'transferencia': 'Transferência'
        };
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>📋 Detalhes da Conta</h2>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 10px 0;">${conta.descricao}</h3>
                        <p style="font-size: 24px; font-weight: bold; color: #28a745; margin: 0;">
                            R$ ${parseFloat(conta.valor).toFixed(2)}
                        </p>
                    </div>
                    
                    <div style="line-height: 2;">
                        ${conta.fornecedor_nome ? `<p><strong>🏢 Fornecedor:</strong> ${conta.fornecedor_nome}</p>` : ''}
                        ${conta.categoria_nome ? `<p><strong>🏷️ Categoria:</strong> ${conta.categoria_nome}</p>` : ''}
                        <p><strong>📅 Vencimento:</strong> ${new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}</p>
                        <p><strong>✅ Pago em:</strong> ${new Date(conta.data_pagamento).toLocaleDateString('pt-BR')}</p>
                        ${conta.forma_pagamento ? `<p><strong>💳 Forma:</strong> ${formas[conta.forma_pagamento]}</p>` : ''}
                        ${conta.observacoes ? `<p><strong>📝 Observações:</strong><br>${conta.observacoes.replace(/\n/g, '<br>')}</p>` : ''}
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-primary" onclick="this.closest('.modal').remove()" style="width: 100%;">
                        Fechar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        mostrarNotificacao('Erro ao carregar detalhes da conta', 'error');
    }
}

// Configurar event listeners quando os modais forem carregados
document.addEventListener('modalsLoaded', () => {
    const filtroBuscaConta = document.getElementById('filtroBuscaConta');
    const filtroStatusConta = document.getElementById('filtroStatusConta');
    const filtroDataInicio = document.getElementById('filtroDataInicio');
    const filtroDataFim = document.getElementById('filtroDataFim');
    
    if (filtroBuscaConta) {
        filtroBuscaConta.removeEventListener('input', resetarPaginaEFiltrarContas);
        filtroBuscaConta.addEventListener('input', resetarPaginaEFiltrarContas);
    }
    
    if (filtroStatusConta) {
        filtroStatusConta.removeEventListener('change', resetarPaginaEFiltrarContas);
        filtroStatusConta.addEventListener('change', resetarPaginaEFiltrarContas);
    }
    
    if (filtroDataInicio) {
        filtroDataInicio.removeEventListener('change', resetarPaginaEFiltrarContas);
        filtroDataInicio.addEventListener('change', resetarPaginaEFiltrarContas);
    }
    
    if (filtroDataFim) {
        filtroDataFim.removeEventListener('change', resetarPaginaEFiltrarContas);
        filtroDataFim.addEventListener('change', resetarPaginaEFiltrarContas);
    }
});
