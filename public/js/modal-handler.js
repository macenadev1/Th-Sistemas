// ==================== GERENCIADOR DE MODAIS ====================

// Adicionar event listeners para fechar modais ao clicar no backdrop
document.addEventListener('DOMContentLoaded', () => {
    // Pegar todos os modais
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            // Se clicar diretamente no backdrop (não no conteúdo)
            if (e.target === modal) {
                // Para modais aninhados nível 2, fechar apenas ele mesmo
                if (modal.classList.contains('modal-nested-level-2')) {
                    fecharModal(modal.id);
                }
                // Para modais aninhados nível 1, verificar se não há nível 2 aberto
                else if (modal.classList.contains('modal-nested')) {
                    const modalNivel2Aberto = document.querySelector('.modal-nested-level-2.active');
                    if (!modalNivel2Aberto) {
                        fecharModal(modal.id);
                    }
                } 
                // Para modais principais, fechar apenas se não houver modal aninhado aberto
                else {
                    const modalAninhadoAberto = document.querySelector('.modal-nested.active, .modal-nested-level-2.active');
                    if (!modalAninhadoAberto) {
                        fecharModal(modal.id);
                    }
                }
            }
        });
    });
});
