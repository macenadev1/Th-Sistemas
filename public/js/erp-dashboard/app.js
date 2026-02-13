import * as navigation from './navigation.js';
import * as dashboard from './dashboard.js';
import * as produtos from './produtos.js';
import * as clientes from './clientes.js';
import * as fornecedores from './fornecedores.js';
import * as vendas from './vendas.js';
import * as caixa from './caixa.js';
import * as status from './status.js';

Object.assign(
    window,
    navigation,
    dashboard,
    produtos,
    clientes,
    fornecedores,
    vendas,
    caixa,
    status
);

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ ERP Dashboard modular carregado');
    status.verificarConexaoERP();
    dashboard.carregarDashboard();
});
