// ==================== FUNÇÕES UTILITÁRIAS ====================

function mostrarNotificacao(mensagem, tipo = 'info') {
    const notif = document.getElementById('notification');
    notif.className = `notification ${tipo} active`;
    notif.textContent = mensagem;
    
    setTimeout(() => {
        notif.classList.remove('active');
    }, 3000);
}

function abrirModal(modalId) {
    document.getElementById(modalId).classList.add('active');
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
