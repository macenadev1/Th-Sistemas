const API_URL = window.API_URL;

const PAGAMENTO_ICONES = {
    dinheiro: '💵',
    debito: '💳',
    credito: '💳',
    pix: '📱'
};

const PAGAMENTO_NOMES = {
    dinheiro: 'Dinheiro',
    debito: 'Debito',
    credito: 'Credito',
    pix: 'PIX'
};

function formatarMoeda(valor) {
    return `R$ ${parseFloat(valor).toFixed(2)}`;
}

function parseDataVenda(dataVenda) {
    return new Date(dataVenda.replace(' ', 'T'));
}

function formatarDataHora(dataVenda) {
    return parseDataVenda(dataVenda).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function normalizarData(data) {
    const dataNormalizada = new Date(data);
    dataNormalizada.setHours(0, 0, 0, 0);
    return dataNormalizada;
}

function filtrarPorPeriodo(venda, periodo, hoje) {
    if (periodo === 'todos') return true;

    const dataVenda = normalizarData(parseDataVenda(venda.data_venda));

    if (periodo === 'hoje') {
        return dataVenda.getTime() === hoje.getTime();
    }

    const diasAtras = periodo === '7dias' ? 7 : 30;
    const limite = new Date(hoje);
    limite.setDate(hoje.getDate() - diasAtras);

    return dataVenda >= limite;
}

function renderizarEstadoVazio() {
    return `
        <div style="text-align: center; padding: 40px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
            <p>Nenhuma venda encontrada</p>
            <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
        </div>
    `;
}

function renderizarCartaoVenda(venda) {
    const dataFormatada = formatarDataHora(venda.data_venda);
    const valorPago = formatarMoeda(venda.valor_pago);
    const totalVenda = formatarMoeda(venda.total);
    const troco = parseFloat(venda.troco);
    const trocoHtml = troco > 0 ? `<span style="margin-left: 20px;">💰 Troco: ${formatarMoeda(troco)}</span>` : '';

    return `
        <div onclick="verDetalhesVendaERP(${venda.id})" style="
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #28a745;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.transform='translateX(4px)'" 
           onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; this.style.transform='translateX(0)'")>
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <strong style="font-size: 18px;">Venda #${venda.id}</strong>
                    <span style="
                        background: #17a2b8; 
                        color: white; 
                        padding: 3px 10px; 
                        border-radius: 12px; 
                        font-size: 12px; 
                        font-weight: bold;
                    ">${venda.quantidade_itens} item(ns)</span>
                </div>
                <div style="font-size: 14px; color: #666;">
                    <span>📅 ${dataFormatada}</span>
                    <span style="margin-left: 20px;">💵 Pago: ${valorPago}</span>
                    ${trocoHtml}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 24px; font-weight: bold; color: #28a745;">
                    ${totalVenda}
                </div>
            </div>
        </div>
    `;
}

function renderizarDetalhesPagamento(formasPagamento) {
    if (!formasPagamento || formasPagamento.length === 0) return '';

    return `
        <h3 style="margin-top: 20px;">💳 Formas de Pagamento</h3>
        <div style="margin: 15px 0;">
            ${formasPagamento.map(fp => `
                <div style="padding: 10px; background: #f8f9fa; margin-bottom: 5px; border-radius: 4px;">
                    ${PAGAMENTO_ICONES[fp.forma_pagamento]} ${PAGAMENTO_NOMES[fp.forma_pagamento]}: <strong>${formatarMoeda(fp.valor)}</strong>
                </div>
            `).join('')}
        </div>
    `;
}

function renderizarDetalhesVenda(id, dados) {
    return `
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 20px auto;">
            <h2 style="margin-bottom: 20px;">📊 Detalhes da Venda #${id}</h2>

            <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <strong>Data:</strong> ${formatarDataHora(dados.venda.data_venda)}<br>
                <strong>Itens:</strong> ${dados.venda.quantidade_itens}<br>
                <strong>Total:</strong> ${formatarMoeda(dados.venda.total)}
            </div>

            <h3>🛒 Itens da Venda</h3>
            <div style="margin: 15px 0;">
                ${dados.itens.map(item => `
                    <div style="padding: 10px; border-bottom: 1px solid #ddd;">
                        <strong>${item.nome_produto}</strong><br>
                        <span style="color: #666;">${item.quantidade} x ${formatarMoeda(item.preco_unitario)} = ${formatarMoeda(item.subtotal)}</span>
                    </div>
                `).join('')}
            </div>

            ${renderizarDetalhesPagamento(dados.formas_pagamento)}
        </div>
    `;
}

/**
 * Carregar secao de vendas
 */
export async function carregarVendasSection() {
    const content = document.getElementById('vendas-content');
    content.innerHTML = '<p style="text-align: center; padding: 20px;">Carregando vendas...</p>';

    try {
        // API /vendas retorna APENAS vendas validas (nao canceladas) por padrao
        const response = await fetch(`${API_URL}/vendas`);
        if (!response.ok) throw new Error('Erro ao carregar vendas');

        const vendas = await response.json();

        content.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap;">
                <input 
                    type="text" 
                    id="filtroBuscaVendaERP" 
                    placeholder="🔍 Buscar por ID da venda..."
                    onkeyup="aplicarFiltrosVendasERP()"
                    style="flex: 1; min-width: 200px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">

                <select id="filtroPeriodoVendaERP" onchange="aplicarFiltrosVendasERP()" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    <option value="todos">Todos os Periodos</option>
                    <option value="hoje" selected>Hoje</option>
                    <option value="7dias">Ultimos 7 dias</option>
                    <option value="30dias">Ultimos 30 dias</option>
                </select>

                <button onclick="limparFiltrosVendasERP()" class="btn" style="background: #6c757d; color: white; padding: 12px 20px;">
                    🔄 Limpar Filtros
                </button>
            </div>

            <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <strong id="contadorVendasERP">0 venda(s) encontrada(s)</strong>
                <strong id="totalVendasERP" style="color: #28a745;">Total: R$ 0,00</strong>
            </div>

            <div id="listaVendasERP" style="display: grid; gap: 10px;">
                <!-- Vendas serao renderizadas aqui -->
            </div>
        `;

        window.vendasERPCompletas = vendas;
        aplicarFiltrosVendasERP();
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar vendas</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                <button onclick="carregarVendasSection()" class="btn btn-primary" style="margin-top: 20px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

export function aplicarFiltrosVendasERP() {
    if (!window.vendasERPCompletas) return;

    const busca = document.getElementById('filtroBuscaVendaERP').value.toLowerCase();
    const periodo = document.getElementById('filtroPeriodoVendaERP').value;

    // API retorna apenas vendas validas (nao canceladas)
    let vendasFiltradas = [...window.vendasERPCompletas];

    // Filtro por ID
    if (busca) {
        vendasFiltradas = vendasFiltradas.filter(venda =>
            venda.id.toString().includes(busca)
        );
    }

    // Filtro por periodo
    if (periodo !== 'todos') {
        const hoje = normalizarData(new Date());
        vendasFiltradas = vendasFiltradas.filter(venda => filtrarPorPeriodo(venda, periodo, hoje));
    }

    // Calcular total
    const totalVendas = vendasFiltradas.reduce((sum, venda) => sum + parseFloat(venda.total), 0);

    document.getElementById('contadorVendasERP').textContent = `${vendasFiltradas.length} venda(s) encontrada(s)`;
    document.getElementById('totalVendasERP').textContent = `Total: ${formatarMoeda(totalVendas)}`;

    renderizarVendasERP(vendasFiltradas);
}

export function renderizarVendasERP(vendas) {
    const container = document.getElementById('listaVendasERP');

    if (vendas.length === 0) {
        container.innerHTML = renderizarEstadoVazio();
        return;
    }

    // Ordenar vendas da mais recente para a mais antiga
    vendas.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));

    container.innerHTML = vendas.map(renderizarCartaoVenda).join('');
}

export async function verDetalhesVendaERP(id) {
    try {
        const response = await fetch(`${API_URL}/vendas/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar detalhes');

        const dados = await response.json();

        // Criar modal simples para mostrar detalhes
        const detalhesHTML = renderizarDetalhesVenda(id, dados);

        window.mostrarNotificacao?.('Clique para fechar', 'info');

        // Criar overlay temporario
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000; overflow: auto;';
        overlay.innerHTML = detalhesHTML;
        overlay.onclick = () => overlay.remove();
        document.body.appendChild(overlay);
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        window.mostrarNotificacao?.('Erro ao carregar detalhes da venda', 'error');
    }
}

export function limparFiltrosVendasERP() {
    document.getElementById('filtroBuscaVendaERP').value = '';
    document.getElementById('filtroPeriodoVendaERP').value = 'hoje';
    aplicarFiltrosVendasERP();
}
