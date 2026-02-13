import * as navigation from './erp-dashboard/navigation.js';
import * as dashboard from './erp-dashboard/dashboard.js';
import * as produtos from './erp-dashboard/produtos.js';
import * as clientes from './erp-dashboard/clientes.js';
import * as fornecedores from './erp-dashboard/fornecedores.js';
import * as vendas from './erp-dashboard/vendas.js';
import * as caixa from './erp-dashboard/caixa.js';
import * as status from './erp-dashboard/status.js';
import * as financeiro from './erp-dashboard/financeiro.js';
import * as relatorios from './erp-dashboard/relatorios.js';

Object.assign(
    window,
    navigation,
    dashboard,
    produtos,
    clientes,
    fornecedores,
    vendas,
    caixa,
    status,
    financeiro,
    relatorios
);

document.addEventListener('DOMContentLoaded', () => {
    console.log('ERP Dashboard modular carregado');
    status.verificarConexaoERP();
    dashboard.carregarDashboard();

    document.addEventListener('modalsLoaded', () => {
        financeiro.inicializarControleFinanceiro();
    });
});
