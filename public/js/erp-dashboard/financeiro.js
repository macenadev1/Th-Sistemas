const API_URL = window.API_URL;

// ==================== CONTROLE FINANCEIRO - SALDOS ====================

/**
 * Inicializa o controle financeiro (popular seletor de meses e carregar mes atual)
 */
export function inicializarControleFinanceiro() {
    populateSelectorMeses();

    // Carregar mes atual ao abrir secao de financeiro
    const financeiroSection = document.getElementById('financeiro-section');
    if (financeiroSection) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    carregarSaldosMes();
                    carregarDividasFuturas();
                }
            });
        });
        observer.observe(financeiroSection, { attributes: true, attributeFilter: ['class'] });
    }

    console.log('✅ Controle Financeiro inicializado');
}

/**
 * Popular o seletor de meses com ultimos 12 meses
 */
function populateSelectorMeses() {
    const selector = document.getElementById('selectorMesFinanceiro');
    if (!selector) return;

    const hoje = new Date();
    const meses = [];

    // Gerar ultimos 12 meses
    for (let i = 0; i < 12; i++) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const mesAno = `${ano}-${mes}`;

        // Nome do mes
        const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const nomeMes = nomesMeses[data.getMonth()];

        meses.push({
            valor: mesAno,
            texto: `${nomeMes} ${ano}`
        });
    }

    // Popular dropdown
    selector.innerHTML = meses.map(m =>
        `<option value="${m.valor}">${m.texto}</option>`
    ).join('');
}

/**
 * Mostrar/ocultar campos de data personalizada
 */
export function toggleCamposDataPersonalizada() {
    const filtroPeriodo = document.getElementById('filtroPeriodoDividas')?.value;
    const campos = document.getElementById('camposDataPersonalizada');

    if (campos) {
        if (filtroPeriodo === 'personalizado') {
            campos.style.display = 'block';

            // Preencher com periodo padrao (hoje ate +30 dias)
            const hoje = new Date();
            const daqui30Dias = new Date();
            daqui30Dias.setDate(hoje.getDate() + 30);

            const dataInicialInput = document.getElementById('dataInicialDividas');
            const dataFinalInput = document.getElementById('dataFinalDividas');

            if (dataInicialInput && !dataInicialInput.value) {
                dataInicialInput.value = hoje.toISOString().split('T')[0];
            }
            if (dataFinalInput && !dataFinalInput.value) {
                dataFinalInput.value = daqui30Dias.toISOString().split('T')[0];
            }
        } else {
            campos.style.display = 'none';
        }
    }
}

/**
 * Aplicar filtro de periodo personalizado
 */
export function aplicarPeriodoPersonalizado() {
    const dataInicial = document.getElementById('dataInicialDividas')?.value;
    const dataFinal = document.getElementById('dataFinalDividas')?.value;

    if (!dataInicial || !dataFinal) {
        window.mostrarNotificacao?.('⚠️ Selecione as duas datas!', 'error');
        return;
    }

    if (new Date(dataInicial) > new Date(dataFinal)) {
        window.mostrarNotificacao?.('⚠️ Data inicial nao pode ser maior que data final!', 'error');
        return;
    }

    carregarDividasFuturas();
}

/**
 * Carregar dividas futuras (contas pendentes) com filtro de periodo
 */
export async function carregarDividasFuturas() {
    try {
        // Obter periodo selecionado
        const filtroPeriodo = document.getElementById('filtroPeriodoDividas')?.value || 'todos';

        // Construir URL com query params
        let url = `${API_URL}/contas-pagar/dividas-futuras`;

        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();

        if (filtroPeriodo === 'mes_atual') {
            // Filtrar por mes atual (ex: 2026-01)
            url += `?mes=${anoAtual}-${mesAtual}`;
        } else if (filtroPeriodo === 'proximo_mes') {
            // Filtrar por proximo mes
            const proximoMes = hoje.getMonth() === 11 ? 1 : hoje.getMonth() + 2;
            const proximoAno = hoje.getMonth() === 11 ? anoAtual + 1 : anoAtual;
            url += `?mes=${proximoAno}-${String(proximoMes).padStart(2, '0')}`;
        } else if (filtroPeriodo === '3_meses') {
            // Filtrar proximos 3 meses (range de datas)
            const dataInicial = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            const dataFinal = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 0);
            const dataInicialStr = dataInicial.toISOString().split('T')[0];
            const dataFinalStr = dataFinal.toISOString().split('T')[0];
            url += `?data_inicial=${dataInicialStr}&data_final=${dataFinalStr}`;
        } else if (filtroPeriodo === 'personalizado') {
            // Usar datas personalizadas dos inputs
            const dataInicial = document.getElementById('dataInicialDividas')?.value;
            const dataFinal = document.getElementById('dataFinalDividas')?.value;

            if (dataInicial && dataFinal) {
                url += `?data_inicial=${dataInicial}&data_final=${dataFinal}`;
            }
        }
        // Se filtroPeriodo === 'todos', nao adiciona query params (busca tudo)

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Erro ao carregar dividas futuras');
        }

        const data = await response.json();

        if (data.success) {
            const dividasReposicaoEl = document.getElementById('dividasReposicao');
            const dividasLucroEl = document.getElementById('dividasLucro');
            const labelPeriodoEl = document.getElementById('labelPeriodoDividas');

            if (dividasReposicaoEl) {
                dividasReposicaoEl.textContent = `R$ ${formatarMoedaSaldo(data.dividas.reposicao)}`;
            }

            if (dividasLucroEl) {
                dividasLucroEl.textContent = `R$ ${formatarMoedaSaldo(data.dividas.lucro)}`;
            }

            // Atualizar label com periodo filtrado
            if (labelPeriodoEl && data.filtro) {
                labelPeriodoEl.textContent = `(${data.filtro})`;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dividas futuras:', error);
    }
}

/**
 * Carregar saldos do mes selecionado
 */
export async function carregarSaldosMes() {
    const selector = document.getElementById('selectorMesFinanceiro');
    if (!selector || !selector.value) return;

    const [ano, mes] = selector.value.split('-');

    try {
        const response = await fetch(`${API_URL}/contas-pagar/saldos-mes/${ano}/${mes}`);

        if (!response.ok) {
            throw new Error('Erro ao carregar saldos');
        }

        const data = await response.json();

        // DEBUG: Verificar resposta da API
        console.log('📊 Resposta da API saldos-mes:', data);

        // Validar estrutura de dados (protecao contra undefined)
        // A API retorna os dados dentro de data.saldos
        const reposicao = data.saldos?.reposicao || { bruta: 0, disponivel: 0, negativo: false };
        const lucro = data.saldos?.lucro || { bruta: 0, disponivel: 0, negativo: false };

        console.log('💰 Reposicao processada:', reposicao);
        console.log('💵 Lucro processado:', lucro);

        // Atualizar cards de saldos
        document.getElementById('saldoReposicaoBruta').textContent =
            `R$ ${formatarMoedaSaldo(reposicao.bruta)}`;

        document.getElementById('saldoReposicaoDisponivel').textContent =
            `R$ ${formatarMoedaSaldo(reposicao.disponivel)}`;

        document.getElementById('saldoLucroBruto').textContent =
            `R$ ${formatarMoedaSaldo(lucro.bruta)}`;

        document.getElementById('saldoLucroDisponivel').textContent =
            `R$ ${formatarMoedaSaldo(lucro.disponivel)}`;

        // Exibir alertas se houver saldos negativos
        exibirAlertasSaldosNegativos({ reposicao, lucro });
    } catch (error) {
        console.error('Erro ao carregar saldos:', error);
        window.mostrarNotificacao?.('❌ Erro ao carregar saldos do mes', 'error');
    }
}

/**
 * Exibir alertas de saldos negativos
 */
function exibirAlertasSaldosNegativos(data) {
    const alertaDiv = document.getElementById('alertasSaldosNegativos');
    if (!alertaDiv) return;

    const alertas = [];

    if (data.reposicao.negativo) {
        alertas.push('🚨 <strong>Reposicao Negativa:</strong> Voce gastou mais do que tinha disponivel para reposicao!');
    }

    if (data.lucro.negativo) {
        alertas.push('🚨 <strong>Lucro Negativo:</strong> Voce gastou mais do que tinha disponivel em lucro!');
    }

    if (alertas.length > 0) {
        alertaDiv.style.display = 'block';
        alertaDiv.innerHTML = `
            <div style="background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px; padding: 15px; color: #721c24;">
                <h4 style="margin: 0 0 10px 0;">⚠️ Atencao: Saldos Negativos Detectados!</h4>
                ${alertas.map(a => `<p style="margin: 5px 0;">${a}</p>`).join('')}
                <p style="margin-top: 10px; font-size: 13px; opacity: 0.8;">
                    💡 Recomenda-se ajustar os saldos iniciais ou revisar os pagamentos do mes.
                </p>
            </div>
        `;
    } else {
        alertaDiv.style.display = 'none';
    }
}

/**
 * Formatar valor como moeda
 */
function formatarMoedaSaldo(valor) {
    const numero = parseFloat(valor);

    if (isNaN(numero)) return '0,00';

    const formatado = Math.abs(numero).toFixed(2).replace('.', ',');

    // Se negativo, adicionar sinal
    return numero < 0 ? `(${formatado})` : formatado;
}

/**
 * Abrir modal de configuracao de saldo inicial
 */
export async function abrirModalConfigurarSaldoInicial() {
    const selector = document.getElementById('selectorMesFinanceiro');
    const mesAtual = selector ? selector.value : '';

    // Preencher mes atual no formulario
    const mesInput = document.getElementById('mesReferenciaConfig');
    if (mesInput && mesAtual) {
        mesInput.value = mesAtual;
    }

    const saldoLucroInput = document.getElementById('saldoLucroConfig');
    const observacoesInput = document.getElementById('observacoesConfig');

    // Aplicar formatacao de moeda no input de lucro
    if (saldoLucroInput && !saldoLucroInput.getValorDecimal) {
        window.aplicarFormatacaoMoeda?.(saldoLucroInput);
    }

    // Buscar saldo inicial existente para o mes selecionado
    try {
        const response = await fetch(`${API_URL}/contas-pagar/saldos-iniciais`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.saldos) {
                // Procurar saldo do mes atual (formato YYYY-MM-01)
                const mesFormatado = mesAtual + '-01';
                const saldoExistente = data.saldos.find(s => s.mes_ano === mesFormatado);

                if (saldoExistente) {
                    // Preencher campos com valores existentes
                    if (saldoLucroInput && saldoLucroInput.setValorDecimal) {
                        saldoLucroInput.setValorDecimal(parseFloat(saldoExistente.saldo_lucro) || 0);
                    } else if (saldoLucroInput) {
                        saldoLucroInput.value = (parseFloat(saldoExistente.saldo_lucro) || 0).toFixed(2).replace('.', ',');
                    }

                    if (observacoesInput) {
                        observacoesInput.value = saldoExistente.observacoes || '';
                    }
                } else {
                    // Limpar campos se nao houver saldo configurado
                    if (saldoLucroInput) {
                        if (saldoLucroInput.resetarValor) {
                            saldoLucroInput.resetarValor();
                        } else {
                            saldoLucroInput.value = '0,00';
                        }
                    }
                    if (observacoesInput) observacoesInput.value = '';
                }
            }
        }
    } catch (error) {
        console.error('Erro ao buscar saldo inicial:', error);
        // Em caso de erro, inicializar com zero
        if (saldoLucroInput) {
            if (saldoLucroInput.resetarValor) {
                saldoLucroInput.resetarValor();
            } else {
                saldoLucroInput.value = '0,00';
            }
        }
        if (observacoesInput) observacoesInput.value = '';
    }

    window.abrirModal?.('configurarSaldoInicialModal', () => {
        if (saldoLucroInput) {
            saldoLucroInput.focus();
        }
    });
}

/**
 * Fechar mes atual e transferir saldos para proximo mes
 */
export async function fecharMesAtual() {
    const selector = document.getElementById('selectorMesFinanceiro');
    const mesAtual = selector ? selector.value : '';

    if (!mesAtual) {
        window.mostrarNotificacao?.('⚠️ Selecione o mes a ser fechado', 'error');
        return;
    }

    const [ano, mes] = mesAtual.split('-');

    // Calcular proximo mes para exibicao
    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);
    const proximoMes = mesNum === 12 ? 1 : mesNum + 1;
    const proximoAno = mesNum === 12 ? anoNum + 1 : anoNum;

    const nomesMeses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const confirmacao = confirm(
        `🔒 FECHAR MES\n\n` +
        `Deseja fechar ${nomesMeses[mesNum]}/${anoNum}?\n\n` +
        `Os saldos disponiveis serao transferidos automaticamente para ${nomesMeses[proximoMes]}/${proximoAno}.\n\n` +
        `Esta acao criara/atualizara o saldo inicial do proximo mes.`
    );

    if (!confirmacao) return;

    try {
        const response = await fetch(`${API_URL}/contas-pagar/fechar-mes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ano: anoNum,
                mes: mesNum,
                forcar: false
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao fechar mes');
        }

        // Exibir resumo do fechamento
        const saldos = result.dados.saldos_transferidos;
        alert(
            `✅ MES FECHADO COM SUCESSO!\n\n` +
            `📅 Mes fechado: ${nomesMeses[mesNum]}/${anoNum}\n\n` +
            `💰 Saldos transferidos para ${nomesMeses[proximoMes]}/${proximoAno}:\n` +
            `   💵 Reposicao: R$ ${saldos.reposicao.toFixed(2)}\n` +
            `   💰 Lucro: R$ ${saldos.lucro.toFixed(2)}`
        );

        window.mostrarNotificacao?.('✅ Mes fechado e saldos transferidos com sucesso!', 'success');

        // Atualizar para proximo mes automaticamente
        const proximoMesFormatado = `${proximoAno}-${String(proximoMes).padStart(2, '0')}`;
        selector.value = proximoMesFormatado;
        carregarSaldosMes();
    } catch (error) {
        console.error('Erro ao fechar mes:', error);
        window.mostrarNotificacao?.(`❌ ${error.message}`, 'error');
    }
}

/**
 * Salvar configuracao de saldo inicial
 */
export async function salvarConfiguracaoSaldoInicial(event) {
    event.preventDefault();

    const mesReferencia = document.getElementById('mesReferenciaConfig').value;
    const saldoLucroInput = document.getElementById('saldoLucroConfig');
    const observacoes = document.getElementById('observacoesConfig').value.trim();

    const saldoLucro = saldoLucroInput.getValorDecimal
        ? saldoLucroInput.getValorDecimal()
        : parseFloat(saldoLucroInput.value.replace(',', '.')) || 0;

    if (saldoLucro < 0) {
        window.mostrarNotificacao?.('⚠️ O saldo de lucro nao pode ser negativo', 'error');
        return;
    }

    // Converter formato YYYY-MM para YYYY-MM-01 (backend espera dia 01)
    const mesAnoFormatado = mesReferencia + '-01';

    try {
        const response = await fetch(`${API_URL}/contas-pagar/saldos-iniciais`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mes_ano: mesAnoFormatado,
                saldo_reposicao: 0, // Nao usado mais, calculado automaticamente
                saldo_lucro: saldoLucro,
                observacoes: observacoes || null
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao salvar configuracao');
        }

        window.mostrarNotificacao?.('✅ Saldo inicial de lucro configurado com sucesso!', 'success');

        window.fecharModal?.('configurarSaldoInicialModal');

        // Atualizar seletor e carregar saldos
        const selector = document.getElementById('selectorMesFinanceiro');
        if (selector) {
            selector.value = mesReferencia;
        }

        carregarSaldosMes();
    } catch (error) {
        console.error('Erro ao salvar configuracao:', error);
        window.mostrarNotificacao?.(`❌ ${error.message}`, 'error');
    }
}

export const _internals = { formatarMoedaSaldo };
