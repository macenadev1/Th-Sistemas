/**
 * Modal Loader - Carrega modais de arquivos separados
 * Versão: 1.0.0
 */

(function() {
    'use strict';

    // Lista de modais para carregar
    const modals = [
        'cadastro-produto',
        'finalizacao-venda',
        'forma-pagamento',
        'confirmacao-venda',
        'menu-caixa',
        'abertura-caixa',
        'reforco-caixa',
        'sangria',
        'fechamento-caixa',
        'confirmacao-fechamento-caixa',
        'historico-fechamentos',
        'detalhes-fechamento',
        'ajuda',
        'lista-produtos',
        'editar-produto',
        'historico-vendas',
        'configuracoes',
        'buscar-produto'
    ];

    /**
     * Carrega um arquivo de modal via fetch
     */
    async function loadModal(modalName) {
        try {
            const response = await fetch(`modals/${modalName}.html`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            return html;
        } catch (error) {
            console.error(`Erro ao carregar modal ${modalName}:`, error);
            return null;
        }
    }

    /**
     * Carrega todos os modais e injeta no DOM
     */
    async function loadAllModals() {
        const container = document.getElementById('modals-container');
        if (!container) {
            console.error('Container de modais não encontrado!');
            return;
        }

        // Carrega todos os modais em paralelo
        const promises = modals.map(modalName => loadModal(modalName));
        const results = await Promise.all(promises);

        // Injeta os modais no DOM
        results.forEach((html, index) => {
            if (html) {
                const div = document.createElement('div');
                div.innerHTML = html;
                container.appendChild(div.firstElementChild);
            } else {
                console.warn(`Modal ${modals[index]} não foi carregado`);
            }
        });

        // Dispara evento customizado quando todos os modais forem carregados
        console.log('✅ Todos os modais foram carregados');
        document.dispatchEvent(new CustomEvent('modalsLoaded'));
    }

    // Carrega os modais quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAllModals);
    } else {
        loadAllModals();
    }
})();
