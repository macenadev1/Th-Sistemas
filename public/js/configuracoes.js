// =========================================
// MÓDULO DE CONFIGURAÇÕES
// =========================================

let configuracoes = {
    tipoAlerta: 'dia_diferente', // dia_diferente, horas, desabilitado
    horasAlerta: 24
};

// Carregar configurações do servidor
async function carregarConfiguracoes() {
    try {
        const response = await fetch('/api/configuracoes');
        if (response.ok) {
            const data = await response.json();
            if (data.configuracoes) {
                configuracoes = data.configuracoes;
                console.log('⚙️ Configurações carregadas:', configuracoes);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
    return configuracoes;
}

// Abrir modal de configurações
function abrirConfiguracoes() {
    // Preencher valores atuais
    document.getElementById('configTipoAlerta').value = configuracoes.tipoAlerta;
    document.getElementById('configHorasAlerta').value = configuracoes.horasAlerta;
    
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
    
    // Validação
    if (tipoAlerta === 'horas' && (horasAlerta < 1 || horasAlerta > 168)) {
        mostrarNotificacao('⚠️ Horas deve estar entre 1 e 168', 'error');
        return;
    }
    
    const novasConfiguracoes = {
        tipoAlerta,
        horasAlerta
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
            console.log('✅ Configurações salvas:', configuracoes);
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
    console.log('🔧 Iniciando carregamento de configurações...');
    carregarConfiguracoes();
});

// Atalho de teclado F8 para abrir configurações
document.addEventListener('keydown', (e) => {
    if (e.key === 'F8') {
        e.preventDefault();
        abrirConfiguracoes();
    }
});
