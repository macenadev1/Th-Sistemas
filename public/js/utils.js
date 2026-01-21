// ==================== FUNÇÕES UTILITÁRIAS ====================

function mostrarNotificacao(mensagem, tipo = 'info') {
    const notif = document.getElementById('notification');
    notif.className = `notification ${tipo} active`;
    notif.textContent = mensagem;
    
    setTimeout(() => {
        notif.classList.remove('active');
    }, 3000);
}

function abrirModal(modalId, callback) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        // Se houver callback, executar após o modal estar no DOM
        if (callback && typeof callback === 'function') {
            setTimeout(callback, 50);
        }
    }
}

function fecharModal(modalId) {
    if (modalId) {
        // Fecha um modal específico
        document.getElementById(modalId).classList.remove('active');
    } else {
        // Fecha apenas o último modal aberto (o que está por cima)
        const modalsAbertos = document.querySelectorAll('.modal.active');
        if (modalsAbertos.length > 0) {
            // Pega o último modal aberto
            const ultimoModal = modalsAbertos[modalsAbertos.length - 1];
            ultimoModal.classList.remove('active');
        }
    }
    
    // Só foca no search se não houver mais modals abertos
    setTimeout(() => {
        const aindaTemModal = document.querySelector('.modal.active');
        if (!aindaTemModal) {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }, 100);
}

// Função para fechar modal aninhado impedindo propagação
function fecharModalAninhado(event, modalId) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    fecharModal(modalId);
}

// ==================== FORMATAÇÃO DE INPUTS DE VALOR ====================

/**
 * Aplica formatação de moeda estilo PDV em um input
 * @param {HTMLInputElement|string} inputOrId - Elemento input ou ID do elemento
 * @param {function} onEnterCallback - Função a ser chamada ao pressionar Enter (opcional)
 */
function aplicarFormatacaoMoeda(inputOrId, onEnterCallback = null) {
    // Aceita tanto elemento quanto ID
    const input = typeof inputOrId === 'string' 
        ? document.getElementById(inputOrId) 
        : inputOrId;
    
    if (!input) {
        console.warn(`⚠️ Input ${inputOrId} não encontrado para formatação`);
        return;
    }

    let valorCentavos = 0;

    // Criar métodos auxiliares no próprio input
    input.getValorDecimal = function() {
        return valorCentavos / 100;
    };

    input.setValorDecimal = function(valor) {
        valorCentavos = Math.round(valor * 100);
        this.value = formatarMoedaInterna(valorCentavos);
    };

    input.resetarValor = function() {
        valorCentavos = 0;
        this.value = '';
    };

    // Função interna para formatar
    function formatarMoedaInterna(centavos) {
        const reais = Math.floor(centavos / 100);
        const cents = centavos % 100;
        return `${reais},${cents.toString().padStart(2, '0')}`;
    }

    // Event listener para keydown
    input.addEventListener('keydown', function(e) {
        // Enter
        if (e.key === 'Enter') {
            e.preventDefault();
            if (onEnterCallback) {
                onEnterCallback(valorCentavos / 100);
            }
            return;
        }

        // Backspace
        if (e.key === 'Backspace') {
            e.preventDefault();
            valorCentavos = Math.floor(valorCentavos / 10);
            this.value = formatarMoedaInterna(valorCentavos);
            return;
        }

        // Permitir teclas de navegação
        if (['Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            return;
        }

        // Apenas permitir números
        if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            valorCentavos = (valorCentavos * 10) + parseInt(e.key);
            this.value = formatarMoedaInterna(valorCentavos);
        } else if (e.key.length === 1) {
            // Bloquear outras teclas
            e.preventDefault();
        }
    });

    // Ao focar, preparar para digitação
    input.addEventListener('focus', function() {
        if (this.value === '' || this.value === '0,00') {
            valorCentavos = 0;
            this.value = '0,00';
        }
        this.select();
    });

    // Inicializar com 0,00
    if (!input.value) {
        input.value = '0,00';
    }

    console.log(`✅ Formatação de moeda aplicada em #${input.id || 'input'}`);
}
