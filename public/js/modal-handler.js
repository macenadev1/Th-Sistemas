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
    
    // Listener global para tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Verificar se há modal aberto
            const modaisNivel2 = document.querySelectorAll('.modal-nested-level-2.active');
            if (modaisNivel2.length > 0) {
                // Fechar último modal nível 2
                const ultimoNivel2 = modaisNivel2[modaisNivel2.length - 1];
                fecharModal(ultimoNivel2.id);
                e.preventDefault();
                return;
            }
            
            const modaisAninhados = document.querySelectorAll('.modal-nested.active');
            if (modaisAninhados.length > 0) {
                // Fechar último modal aninhado
                const ultimoAninhado = modaisAninhados[modaisAninhados.length - 1];
                fecharModal(ultimoAninhado.id);
                e.preventDefault();
                return;
            }
            
            const modaisPrincipais = document.querySelectorAll('.modal.active:not(.modal-nested):not(.modal-nested-level-2)');
            if (modaisPrincipais.length > 0) {
                // Fechar último modal principal
                const ultimoPrincipal = modaisPrincipais[modaisPrincipais.length - 1];
                fecharModal(ultimoPrincipal.id);
                e.preventDefault();
            }
        }
    });
});
