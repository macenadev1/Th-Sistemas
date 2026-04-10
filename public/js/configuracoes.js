// =========================================
// MÓDULO DE CONFIGURAÇÕES
// =========================================

let configuracoes = {
    tipoAlerta: 'dia_diferente', // dia_diferente, horas, desabilitado
    horasAlerta: 24,
    imprimirCupom: true,
    tempoRenderizacaoCupom: 500,
    tempoFechamentoCupom: 500,
    timeoutFallbackCupom: 3000,
    permiteVendaEstoqueZero: false
};

let taxasMaquininha = [];
let taxaEmEdicaoChave = null;

function chaveTaxa(forma, bandeira, parcelas) {
    const formaNormalizada = String(forma || '').toLowerCase();
    const bandeiraNormalizada = String(bandeira || '').toLowerCase();
    const parcelasNormalizadas = Number.parseInt(parcelas, 10) || 1;
    return `${formaNormalizada}|${bandeiraNormalizada}|${parcelasNormalizadas}`;
}

// Carregar configurações do servidor
async function carregarConfiguracoes() {
    try {
        const response = await fetch('/api/configuracoes');
        if (response.ok) {
            const data = await response.json();
            if (data.configuracoes) {
                configuracoes = data.configuracoes;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
    return configuracoes;
}

// Atualizar valores dos sliders em tempo real
function atualizarValorSlider(sliderId, valorId) {
    const slider = document.getElementById(sliderId);
    const valorSpan = document.getElementById(valorId);
    
    if (slider && valorSpan) {
        slider.addEventListener('input', function() {
            valorSpan.textContent = this.value + 'ms';
        });
    }
}

// Mostrar/ocultar detalhes de cupom conforme checkbox
function toggleDetalheCupom() {
    const checkbox = document.getElementById('configImprimirCupom');
    const detalhes = document.getElementById('configCupomDetalhes');
    
    if (checkbox && detalhes) {
        detalhes.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// Abrir modal de configurações
function abrirConfiguracoes() {
    // Preencher valores atuais - Alerta de Caixa
    document.getElementById('configTipoAlerta').value = configuracoes.tipoAlerta;
    document.getElementById('configHorasAlerta').value = configuracoes.horasAlerta;
    
    // Preencher valores atuais - Cupom
    document.getElementById('configImprimirCupom').checked = configuracoes.imprimirCupom !== false;
    
    // Preencher valores atuais - Controle de Estoque
    document.getElementById('configPermiteVendaEstoqueZero').checked = configuracoes.permiteVendaEstoqueZero === true;
    
    document.getElementById('configTempoRenderizacao').value = configuracoes.tempoRenderizacaoCupom || 500;
    document.getElementById('configTempoRenderizacaoValor').textContent = (configuracoes.tempoRenderizacaoCupom || 500) + 'ms';
    
    document.getElementById('configTempoFechamento').value = configuracoes.tempoFechamentoCupom || 500;
    document.getElementById('configTempoFechamentoValor').textContent = (configuracoes.tempoFechamentoCupom || 500) + 'ms';
    
    document.getElementById('configTimeoutFallback').value = configuracoes.timeoutFallbackCupom || 3000;
    document.getElementById('configTimeoutFallbackValor').textContent = (configuracoes.timeoutFallbackCupom || 3000) + 'ms';
    
    // Configurar listeners dos sliders
    atualizarValorSlider('configTempoRenderizacao', 'configTempoRenderizacaoValor');
    atualizarValorSlider('configTempoFechamento', 'configTempoFechamentoValor');
    atualizarValorSlider('configTimeoutFallback', 'configTimeoutFallbackValor');
    
    // Mostrar/ocultar detalhes do cupom
    toggleDetalheCupom();
    document.getElementById('configImprimirCupom').addEventListener('change', toggleDetalheCupom);
    
    // Mostrar/ocultar campo de horas
    toggleCampoHoras();
    
    // Adicionar evento de mudança no select
    document.getElementById('configTipoAlerta').addEventListener('change', toggleCampoHoras);

    // Comportamento do formulário de taxas
    const selectForma = document.getElementById('taxaFormaPagamento');
    if (selectForma) {
        selectForma.onchange = ajustarFormularioTaxaPorForma;
    }
    limparFormularioTaxa();
    carregarTaxasMaquininha();
    
    abrirModal('configuracoesModal');
}

function ajustarFormularioTaxaPorForma() {
    const forma = document.getElementById('taxaFormaPagamento')?.value;
    const inputBandeira = document.getElementById('taxaBandeira');
    const inputParcelas = document.getElementById('taxaParcelas');

    if (!inputBandeira || !inputParcelas) return;

    if (forma === 'pix') {
        inputBandeira.value = 'pix';
        inputBandeira.readOnly = true;
        inputBandeira.style.background = '#f1f3f5';
        inputParcelas.value = 1;
        inputParcelas.readOnly = true;
        inputParcelas.style.background = '#f1f3f5';
        return;
    }

    inputBandeira.readOnly = false;
    inputBandeira.style.background = '#fff';
    if (inputBandeira.value === 'pix') {
        inputBandeira.value = 'visa';
    }

    if (forma === 'debito') {
        inputParcelas.value = 1;
        inputParcelas.readOnly = true;
        inputParcelas.style.background = '#f1f3f5';
    } else {
        inputParcelas.readOnly = false;
        inputParcelas.style.background = '#fff';
    }
}

function atualizarEstadoEdicaoTaxa() {
    const emEdicao = !!taxaEmEdicaoChave;
    const btnSalvar = document.getElementById('btnSalvarTaxaMaquininha');
    const btnCancelar = document.getElementById('btnCancelarEdicaoTaxa');
    const inputForma = document.getElementById('taxaFormaPagamento');
    const inputBandeira = document.getElementById('taxaBandeira');
    const inputParcelas = document.getElementById('taxaParcelas');

    if (btnSalvar) {
        btnSalvar.textContent = emEdicao ? 'Salvar Edicao' : '+ Salvar';
        btnSalvar.style.background = emEdicao ? '#0d6efd' : '#28a745';
    }

    if (btnCancelar) {
        btnCancelar.style.display = emEdicao ? 'inline-block' : 'none';
    }

    if (inputForma) inputForma.disabled = emEdicao;

    if (emEdicao) {
        if (inputBandeira) inputBandeira.readOnly = true;
        if (inputParcelas) inputParcelas.readOnly = true;
        return;
    }

    ajustarFormularioTaxaPorForma();
}

function limparFormularioTaxa() {
    taxaEmEdicaoChave = null;

    const inputForma = document.getElementById('taxaFormaPagamento');
    const inputBandeira = document.getElementById('taxaBandeira');
    const inputParcelas = document.getElementById('taxaParcelas');
    const inputTaxa = document.getElementById('taxaPercentual');

    if (inputForma) inputForma.value = 'debito';
    if (inputBandeira) inputBandeira.value = 'visa';
    if (inputParcelas) inputParcelas.value = '1';
    if (inputTaxa) inputTaxa.value = '0';

    ajustarFormularioTaxaPorForma();
    atualizarEstadoEdicaoTaxa();
}

function editarTaxaMaquininha(id) {
    const taxa = taxasMaquininha.find(t => Number(t.id) === Number(id));
    if (!taxa) {
        mostrarNotificacao('Taxa nao encontrada para edicao!', 'error');
        return;
    }

    document.getElementById('taxaFormaPagamento').value = String(taxa.forma_pagamento || 'debito').toLowerCase();
    document.getElementById('taxaBandeira').value = String(taxa.bandeira || '').toLowerCase();
    document.getElementById('taxaParcelas').value = String(taxa.parcelas || 1);
    document.getElementById('taxaPercentual').value = parseFloat(taxa.taxa_percentual || 0).toFixed(2);

    taxaEmEdicaoChave = chaveTaxa(taxa.forma_pagamento, taxa.bandeira, taxa.parcelas);
    ajustarFormularioTaxaPorForma();
    atualizarEstadoEdicaoTaxa();
}

function cancelarEdicaoTaxa() {
    limparFormularioTaxa();
}

async function carregarTaxasMaquininha() {
    const container = document.getElementById('listaTaxasMaquininha');
    if (!container) return;

    container.innerHTML = '<p style="text-align: center; color: #777; margin: 15px 0;">Carregando taxas...</p>';

    try {
        const response = await fetch('/api/configuracoes/taxas-maquininha');
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Erro ao carregar taxas');
        }

        taxasMaquininha = Array.isArray(data.taxas) ? data.taxas : [];
        renderizarTaxasMaquininha();
    } catch (error) {
        console.error('Erro ao carregar taxas:', error);
        container.innerHTML = '<p style="text-align: center; color: #dc3545; margin: 15px 0;">Erro ao carregar taxas da maquininha.</p>';
    }
}

function renderizarTaxasMaquininha() {
    const container = document.getElementById('listaTaxasMaquininha');
    if (!container) return;

    if (!taxasMaquininha.length) {
        container.innerHTML = '<p style="text-align: center; color: #777; margin: 15px 0;">Nenhuma taxa cadastrada.</p>';
        return;
    }

    const nomeForma = {
        debito: 'Débito',
        credito: 'Crédito',
        pix: 'PIX'
    };

    container.innerHTML = taxasMaquininha.map(taxa => {
        const bandeira = (taxa.bandeira || '').toUpperCase();
        const forma = nomeForma[taxa.forma_pagamento] || taxa.forma_pagamento;
        const parcelas = taxa.parcelas || 1;

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; border: 1px solid #ececec; border-radius: 8px; padding: 10px; margin-bottom: 8px; background: ${taxa.ativo ? '#fff' : '#f8f9fa'};">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <strong style="color: #333;">${forma} ${bandeira ? `- ${bandeira}` : ''}</strong>
                    <span style="font-size: 12px; color: #666;">Parcelas: ${parcelas} | Taxa: ${parseFloat(taxa.taxa_percentual || 0).toFixed(2)}%</span>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button type="button" onclick="editarTaxaMaquininha(${taxa.id})" style="background: #0d6efd; color: white; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 12px;">
                        Editar
                    </button>
                    <button type="button" onclick="desativarTaxaMaquininha(${taxa.id})" style="background: #dc3545; color: white; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 12px;">
                        Desativar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function salvarTaxaMaquininha() {
    const forma = document.getElementById('taxaFormaPagamento')?.value;
    const bandeiraBruta = document.getElementById('taxaBandeira')?.value || '';
    const parcelasBruta = document.getElementById('taxaParcelas')?.value || '1';
    const taxaBruta = document.getElementById('taxaPercentual')?.value || '0';

    const bandeira = bandeiraBruta.trim().toLowerCase();
    const parcelas = parseInt(parcelasBruta, 10);
    const taxaPercentual = parseFloat(taxaBruta);

    if (!['debito', 'credito', 'pix'].includes(forma)) {
        mostrarNotificacao('Forma de pagamento invalida!', 'error');
        return;
    }

    if (!bandeira) {
        mostrarNotificacao('Informe a bandeira!', 'error');
        return;
    }

    if (!Number.isFinite(parcelas) || parcelas < 1 || parcelas > 12) {
        mostrarNotificacao('Parcelas invalidas! Use de 1 a 12.', 'error');
        return;
    }

    if (!Number.isFinite(taxaPercentual) || taxaPercentual < 0 || taxaPercentual > 100) {
        mostrarNotificacao('Taxa invalida! Use de 0 a 100.', 'error');
        return;
    }

    const payload = {
        forma_pagamento: forma,
        bandeira,
        parcelas: forma === 'pix' || forma === 'debito' ? 1 : parcelas,
        taxa_percentual: taxaPercentual,
        ativo: true
    };

    const chaveAtual = chaveTaxa(payload.forma_pagamento, payload.bandeira, payload.parcelas);
    if (taxaEmEdicaoChave && chaveAtual !== taxaEmEdicaoChave) {
        mostrarNotificacao('Na edicao, forma/bandeira/parcelas nao podem ser alteradas. Clique em Cancelar para criar outra taxa.', 'error');
        return;
    }

    try {
        const response = await fetch('/api/configuracoes/taxas-maquininha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Erro ao salvar taxa');
        }

        mostrarNotificacao(taxaEmEdicaoChave ? '✅ Taxa atualizada com sucesso!' : '✅ Taxa salva com sucesso!', 'success');
        limparFormularioTaxa();
        await carregarTaxasMaquininha();
    } catch (error) {
        console.error('Erro ao salvar taxa:', error);
        mostrarNotificacao(`❌ ${error.message}`, 'error');
    }
}

async function desativarTaxaMaquininha(id) {
    if (!confirm('Deseja desativar esta taxa?')) {
        return;
    }

    try {
        const response = await fetch(`/api/configuracoes/taxas-maquininha/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Erro ao desativar taxa');
        }

        mostrarNotificacao('✅ Taxa desativada com sucesso!', 'success');
        await carregarTaxasMaquininha();

        if (taxaEmEdicaoChave) {
            const taxaAtivaAindaExiste = taxasMaquininha.some(t =>
                chaveTaxa(t.forma_pagamento, t.bandeira, t.parcelas) === taxaEmEdicaoChave && t.ativo
            );

            if (!taxaAtivaAindaExiste) {
                limparFormularioTaxa();
            }
        }
    } catch (error) {
        console.error('Erro ao desativar taxa:', error);
        mostrarNotificacao(`❌ ${error.message}`, 'error');
    }
}

// Mostrar/ocultar campo de horas conforme tipo selecionado
function toggleCampoHoras() {
    const tipo = document.getElementById('configTipoAlerta').value;
    const horasContainer = document.getElementById('configHorasContainer');
    
    if (tipo === 'horas') {
        horasContainer.style.display = 'block';
    } else {
        horasContainer.style.display = 'none';
    }
}

// Salvar configurações
async function salvarConfiguracoes() {
    const tipoAlerta = document.getElementById('configTipoAlerta').value;
    const horasAlerta = parseInt(document.getElementById('configHorasAlerta').value);
    const imprimirCupom = document.getElementById('configImprimirCupom').checked;
    const permiteVendaEstoqueZero = document.getElementById('configPermiteVendaEstoqueZero').checked;
    const tempoRenderizacaoCupom = parseInt(document.getElementById('configTempoRenderizacao').value);
    const tempoFechamentoCupom = parseInt(document.getElementById('configTempoFechamento').value);
    const timeoutFallbackCupom = parseInt(document.getElementById('configTimeoutFallback').value);
    
    // Validação
    if (tipoAlerta === 'horas' && (horasAlerta < 1 || horasAlerta > 168)) {
        mostrarNotificacao('⚠️ Horas deve estar entre 1 e 168', 'error');
        return;
    }
    
    const novasConfiguracoes = {
        tipoAlerta,
        horasAlerta,
        imprimirCupom,
        permiteVendaEstoqueZero,
        tempoRenderizacaoCupom,
        tempoFechamentoCupom,
        timeoutFallbackCupom
    };
    
    try {
        const response = await fetch('/api/configuracoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novasConfiguracoes)
        });
        
        if (response.ok) {
            configuracoes = novasConfiguracoes;
            mostrarNotificacao('✅ Configurações salvas com sucesso!', 'success');
            fecharModal('configuracoesModal');
            
            // Resetar flag de alerta para mostrar novamente se necessário
            window.alertaCaixaAbertoMostrado = false;
            
            // Atualizar status do caixa imediatamente
            if (typeof atualizarStatusCaixa === 'function') {
                atualizarStatusCaixa();
            }
        } else {
            throw new Error('Erro ao salvar configurações');
        }
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        mostrarNotificacao('❌ Erro ao salvar configurações', 'error');
    }
}

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    carregarConfiguracoes();
});

// Atalho de teclado F8 para abrir configurações
document.addEventListener('keydown', (e) => {
    if (e.key === 'F8') {
        e.preventDefault();
        abrirConfiguracoes();
    }
});
