// ==================== MENU ERP ====================
// Gerenciamento centralizado das funções administrativas

/**
 * Abre o Menu ERP principal
 */
function abrirMenuErp() {
    abrirModal('menuErpModal');
}

/**
 * Verificação de permissões (placeholder para quando implementar autenticação)
 */
function verificarPermissaoAdmin() {
    // TODO: Implementar verificação real quando tiver autenticação
    // Por enquanto, permite acesso a todos
    return true;
}

/**
 * Funções de navegação do Menu ERP
 * Todas fecham o menu ERP e abrem a tela específica
 */

function abrirProdutosErp() {
    fecharModal('menuErpModal');
    abrirGerenciarProdutos();
}

function abrirClientesErp() {
    fecharModal('menuErpModal');
    abrirGerenciarClientes();
}

function abrirFornecedoresErp() {
    fecharModal('menuErpModal');
    abrirGerenciarFornecedores();
}

function abrirCaixaErp() {
    fecharModal('menuErpModal');
    abrirMenuCaixa();
}

function abrirRelatoriosErp() {
    fecharModal('menuErpModal');
    abrirHistorico();
}

function abrirConfiguracoesErp() {
    fecharModal('menuErpModal');
    abrirConfiguracoes();
}

// ==================== ESTATÍSTICAS DO DASHBOARD ====================

/**
 * Carrega estatísticas para exibição no menu ERP (futuro)
 */
async function carregarEstatisticasErp() {
    try {
        const response = await fetch(`${API_URL}/vendas/stats/resumo`);
        if (!response.ok) {
            throw new Error('Erro ao carregar estatísticas');
        }
        
        const stats = await response.json();
        return stats;
    } catch (error) {
        console.error('Erro ao carregar estatísticas ERP:', error);
        return null;
    }
}

/**
 * Atualiza badges com informações importantes (futuro)
 */
async function atualizarBadgesErp() {
    // TODO: Implementar badges de notificação
    // Exemplo: produtos com estoque baixo, vendas do dia, etc.
}

// ==================== ATALHOS GLOBAIS ERP ====================

/**
 * Inicializa atalhos do Menu ERP
 * Chamado quando a página carrega
 */
function inicializarAtalhosErp() {
    // Os atalhos estão em pdv.js para centralizar
    // Este arquivo apenas organiza as funções do menu
    console.log('✅ Menu ERP carregado e pronto');
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    inicializarAtalhosErp();
});
