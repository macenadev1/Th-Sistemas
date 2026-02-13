import { carregarDashboard } from './dashboard.js';
import { carregarProdutosSection } from './produtos.js';
import { carregarClientesSection } from './clientes.js';
import { carregarFornecedoresSection } from './fornecedores.js';
import { carregarVendasSection } from './vendas.js';
import { carregarCaixaSection } from './caixa.js';

/**
 * Navegacao entre secoes do ERP
 */
export function navegarPara(event, secao) {
    event.preventDefault();

    // Remover classe active de todos os itens do menu
    document.querySelectorAll('.erp-menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Adicionar active no item clicado
    event.currentTarget.classList.add('active');

    // Ocultar todas as secoes
    document.querySelectorAll('.erp-section').forEach(section => {
        section.classList.remove('active');
    });

    // Mostrar secao selecionada
    const secaoElement = document.getElementById(`${secao}-section`);
    if (secaoElement) {
        secaoElement.classList.add('active');
    }

    // Atualizar titulo do header
    const titulos = {
        dashboard: '📊 Dashboard',
        produtos: '📦 Produtos',
        clientes: '👥 Clientes',
        fornecedores: '🏢 Fornecedores',
        caixa: '💰 Caixa',
        vendas: '🛒 Vendas',
        financeiro: '💸 Financeiro',
        relatorios: '📈 Relatorios',
        configuracoes: '⚙️ Configuracoes'
    };

    document.getElementById('pageTitle').textContent = titulos[secao] || secao;

    // Carregar dados especificos da secao
    if (secao === 'dashboard') {
        carregarDashboard();
    } else if (secao === 'produtos') {
        carregarProdutosSection();
    } else if (secao === 'clientes') {
        carregarClientesSection();
    } else if (secao === 'fornecedores') {
        carregarFornecedoresSection();
    } else if (secao === 'vendas') {
        carregarVendasSection();
    } else if (secao === 'financeiro') {
        // Secao financeiro ja tem cards estaticos - nada a carregar
    } else if (secao === 'caixa') {
        carregarCaixaSection();
    }
}
