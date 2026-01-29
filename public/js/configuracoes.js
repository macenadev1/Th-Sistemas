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
    
    abrirModal('configuracoesModal');
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
