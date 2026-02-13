// ==================== RELATORIO DE VENDAS POR ITEM ====================
function abrirRelatorioVendasItem() {
    abrirModal('relatorioVendasItemModal', () => {
        // Setar periodo padrao: ultimos 30 dias
        setarPeriodoRelatorioItem('mes');
    });
}

/**
 * Setar periodo pre-definido para relatorio de itens
 */
function setarPeriodoRelatorioItem(tipo, botaoClicado) {
    // Remover animacao de todos os botoes de periodo
    const botoesPeriodo = document.querySelectorAll('[id^="btnPeriodo"][id$="Item"]');
    botoesPeriodo.forEach(btn => {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
        btn.innerHTML = btn.innerHTML.replace(' ⏳', '').replace(' ✓', '');
    });

    // Adicionar feedback visual no botao clicado
    if (botaoClicado) {
        const textoOriginal = botaoClicado.innerHTML;
        botaoClicado.innerHTML = textoOriginal + ' ⏳';
        botaoClicado.style.opacity = '0.7';
        botaoClicado.style.transform = 'scale(0.95)';

        // Apos definir o periodo, restaurar botao
        setTimeout(() => {
            botaoClicado.innerHTML = textoOriginal + ' ✓';
            botaoClicado.style.opacity = '1';
            botaoClicado.style.transform = 'scale(1)';

            // Remover checkmark apos 2 segundos
            setTimeout(() => {
                botaoClicado.innerHTML = textoOriginal;
            }, 2000);
        }, 300);
    }

    const hoje = new Date();
    const dataFinal = new Date(hoje);
    let dataInicial = new Date(hoje);

    switch (tipo) {
        case 'hoje':
            // Mesmo dia
            break;
        case 'ontem':
            dataInicial.setDate(hoje.getDate() - 1);
            dataFinal.setDate(hoje.getDate() - 1);
            break;
        case 'semana':
            // Domingo a hoje
            const diaSemana = hoje.getDay();
            dataInicial.setDate(hoje.getDate() - diaSemana);
            break;
        case 'mes':
            // Primeiro dia do mes
            dataInicial.setDate(1);
            break;
        case 'ano':
            // Primeiro dia do ano
            dataInicial.setMonth(0, 1);
            break;
    }

    // Formatar datas para input type="date"
    document.getElementById('dataInicialRelatorioItem').value = dataInicial.toISOString().split('T')[0];
    document.getElementById('dataFinalRelatorioItem').value = dataFinal.toISOString().split('T')[0];

    // Mostrar notificacao
    const nomesPeriodo = {
        'hoje': 'Hoje',
        'ontem': 'Ontem',
        'semana': 'Esta Semana',
        'mes': 'Este Mes',
        'ano': 'Este Ano'
    };
    mostrarNotificacao(`✓ Periodo selecionado: ${nomesPeriodo[tipo]}`, 'success');
}

/**
 * Gerar relatorio de vendas por item
 */
async function gerarRelatorioVendasItem() {
    const dataInicial = document.getElementById('dataInicialRelatorioItem').value;
    const dataFinal = document.getElementById('dataFinalRelatorioItem').value;

    if (!dataInicial || !dataFinal) {
        mostrarNotificacao('⚠️ Selecione as datas inicial e final', 'error');
        return;
    }

    if (new Date(dataInicial) > new Date(dataFinal)) {
        mostrarNotificacao('⚠️ Data inicial nao pode ser maior que data final', 'error');
        return;
    }

    const container = document.getElementById('resultadoRelatorioVendasItem');
    container.innerHTML = '<p style="text-align: center; padding: 40px;"><strong>Carregando relatorio...</strong></p>';

    try {
        const query = new URLSearchParams({
            data_inicial: dataInicial,
            data_final: dataFinal,
            forma_pagamento: 'todos'
        });

        const response = await fetch(`${API_URL}/vendas/relatorio?${query.toString()}`);
        const data = await response.json();

        if (!response.ok || !data.success) throw new Error(data.message || 'Erro ao carregar vendas');

        const vendas = data.vendas || [];
        const itensVendidos = data.itens || [];

        if (vendas.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🧾</div>
                    <h3>Nenhuma venda encontrada no periodo</h3>
                    <p style="margin-top: 10px;">Tente selecionar um periodo diferente</p>
                </div>
            `;
            const btnExportar = document.getElementById('btnExportarVendasItemCSV');
            if (btnExportar) btnExportar.disabled = true;
            return;
        }

        // Buscar produtos para mapear categorias
        let produtosCatalogo = [];
        try {
            const produtosResponse = await fetch(`${API_URL}/produtos`);
            if (produtosResponse.ok) {
                produtosCatalogo = await produtosResponse.json();
            }
        } catch (error) {
            console.warn('Erro ao carregar produtos para categorias:', error);
        }

        const categoriaPorCodigo = new Map();
        const categoriaPorNome = new Map();
        produtosCatalogo.forEach(produto => {
            if (produto.codigo_barras) {
                categoriaPorCodigo.set(produto.codigo_barras, produto.categoria_nome || '');
            }
            if (produto.nome) {
                categoriaPorNome.set(produto.nome, produto.categoria_nome || '');
            }
        });

        if (itensVendidos.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🧾</div>
                    <h3>Nenhum item vendido no periodo</h3>
                </div>
            `;
            const btnExportar = document.getElementById('btnExportarVendasItemCSV');
            if (btnExportar) btnExportar.disabled = true;
            return;
        }

        // Agrupar itens por produto
        const itensPorProduto = new Map();

        itensVendidos.forEach(item => {
            const codigo = item.codigo_barras || '';
            const chave = codigo ? codigo : item.nome_produto;

            if (!itensPorProduto.has(chave)) {
                const categoria = categoriaPorCodigo.get(codigo) || categoriaPorNome.get(item.nome_produto) || '-';
                itensPorProduto.set(chave, {
                    nome: item.nome_produto,
                    codigo: codigo || '-',
                    categoria: categoria,
                    quantidade: 0,
                    totalVendas: 0,
                    totalCustos: 0,
                    vendasIds: new Set(),
                    precoSomado: 0,
                    precoQtde: 0
                });
            }

            const registro = itensPorProduto.get(chave);
            const quantidade = parseInt(item.quantidade) || 0;
            const subtotal = parseFloat(item.subtotal) || 0;
            const custoUnit = parseFloat(item.preco_custo_unitario) || 0;
            const precoUnit = parseFloat(item.preco_unitario) || 0;

            registro.quantidade += quantidade;
            registro.totalVendas += subtotal;
            registro.totalCustos += custoUnit * quantidade;
            registro.precoSomado += precoUnit * quantidade;
            registro.precoQtde += quantidade;
            registro.vendasIds.add(item.venda_id);
        });

        const produtos = Array.from(itensPorProduto.values())
            .map(produto => {
                const lucro = produto.totalVendas - produto.totalCustos;
                const margem = produto.totalVendas > 0 ? (lucro / produto.totalVendas) * 100 : 0;
                const precoMedio = produto.precoQtde > 0 ? produto.precoSomado / produto.precoQtde : 0;

                return {
                    nome: produto.nome,
                    codigo: produto.codigo,
                    categoria: produto.categoria,
                    quantidade: produto.quantidade,
                    totalVendas: produto.totalVendas,
                    totalCustos: produto.totalCustos,
                    lucro: lucro,
                    margem: margem,
                    precoMedio: precoMedio,
                    numeroVendas: produto.vendasIds.size
                };
            })
            .sort((a, b) => b.quantidade - a.quantidade);

        const totalItens = produtos.reduce((sum, p) => sum + p.quantidade, 0);
        const totalReceita = produtos.reduce((sum, p) => sum + p.totalVendas, 0);
        const totalCustos = produtos.reduce((sum, p) => sum + p.totalCustos, 0);
        const totalLucro = totalReceita - totalCustos;
        const margemTotal = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;

        // Salvar dados para exportacao
        window.dadosRelatorioVendasItemAtual = {
            produtosBase: produtos,
            produtosFiltrados: produtos,
            periodo: {
                dataInicial: dataInicial,
                dataFinal: dataFinal
            },
            totais: {
                totalItens: totalItens,
                totalReceita: totalReceita,
                totalCustos: totalCustos,
                totalLucro: totalLucro,
                margemTotal: margemTotal
            }
        };

        // Renderizar relatorio
        container.innerHTML = `
            <div class="relatorio-resultado">

                <!-- Cabecalho -->
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #17a2b8;">
                    <h2 style="margin: 0; color: #17a2b8;">🧾 Relatorio de Vendas por Item</h2>
                    <p style="margin: 10px 0 0 0; color: #666;">
                        Periodo: ${new Date(dataInicial).toLocaleDateString('pt-BR')} ate ${new Date(dataFinal).toLocaleDateString('pt-BR')}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #999; font-size: 14px;">
                        Gerado em: ${new Date().toLocaleString('pt-BR')}
                    </p>
                </div>

                <!-- Cards de Estatisticas -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, #17a2b8 0%, #0f6674 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Itens Diferentes</div>
                        <div style="font-size: 36px; font-weight: bold;">${produtos.length}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Quantidade Total</div>
                        <div style="font-size: 36px; font-weight: bold;">${totalItens}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Receita Total</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${totalReceita.toFixed(2)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Lucro Total</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${totalLucro.toFixed(2)}</div>
                    </div>
                </div>

                <!-- Filtros do Relatorio -->
                <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px; align-items: center;">
                    <input
                        type="text"
                        id="filtroTextoRelatorioItem"
                        placeholder="🔍 Buscar por produto ou codigo..."
                        oninput="aplicarFiltrosRelatorioVendasItem()"
                        style="flex: 1; min-width: 220px; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                    <select id="ordenacaoRelatorioItem" onchange="aplicarFiltrosRelatorioVendasItem()" style="padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                        <option value="lucro_desc" selected>Lucro (maior)</option>
                        <option value="lucro_asc">Lucro (menor)</option>
                        <option value="margem_desc">Margem (maior)</option>
                        <option value="margem_asc">Margem (menor)</option>
                        <option value="quantidade_desc">Quantidade (maior)</option>
                        <option value="receita_desc">Receita (maior)</option>
                    </select>
                    <select id="itensPorPaginaRelatorioItem" onchange="aplicarFiltrosRelatorioVendasItem()" style="padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                        <option value="10">10 por pagina</option>
                        <option value="20" selected>20 por pagina</option>
                        <option value="50">50 por pagina</option>
                        <option value="100">100 por pagina</option>
                    </select>
                    <div id="resumoRelatorioVendasItem" style="font-size: 13px; color: #666; min-width: 180px;"></div>
                </div>

                <!-- Tabela de Itens -->
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">📦 Resumo por Item</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: linear-gradient(135deg, #17a2b8 0%, #0f6674 100%); color: white;">
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Produto</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Codigo</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Categoria</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qtd</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Preco Medio</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Receita</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Custo Total</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Lucro</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Margem %</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Vendas</th>
                                </tr>
                            </thead>
                            <tbody id="listaRelatorioVendasItem"></tbody>
                            <tfoot id="totaisRelatorioVendasItem"></tfoot>
                        </table>
                    </div>
                    <div id="paginacaoRelatorioVendasItem" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 20px;"></div>
                </div>
            </div>
        `;

        aplicarFiltrosRelatorioVendasItem();

        // Habilitar botao de exportacao
        const btnExportar = document.getElementById('btnExportarVendasItemCSV');
        if (btnExportar) btnExportar.disabled = false;

        mostrarNotificacao('✅ Relatorio gerado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao gerar relatorio:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao gerar relatorio</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
        const btnExportar = document.getElementById('btnExportarVendasItemCSV');
        if (btnExportar) btnExportar.disabled = true;
    }
}

/**
 * Exportar relatorio de vendas por item para CSV
 */
function exportarRelatorioVendasItemCSV() {
    if (!window.dadosRelatorioVendasItemAtual || !window.dadosRelatorioVendasItemAtual.produtosBase) {
        mostrarNotificacao('Gere o relatorio primeiro!', 'error');
        return;
    }

    const { produtosBase, periodo, totais } = window.dadosRelatorioVendasItemAtual;

    let csv = 'Produto,Codigo,Categoria,Quantidade,Preco Medio (R$),Receita (R$),Custo Total (R$),Lucro (R$),Margem %,Numero de Vendas\n';

    produtosBase.forEach(produto => {
        csv += `"${produto.nome}",`;
        csv += `${produto.codigo},`;
        csv += `"${produto.categoria || ''}",`;
        csv += `${produto.quantidade},`;
        csv += `${produto.precoMedio.toFixed(2)},`;
        csv += `${produto.totalVendas.toFixed(2)},`;
        csv += `${produto.totalCustos.toFixed(2)},`;
        csv += `${produto.lucro.toFixed(2)},`;
        csv += `${produto.margem.toFixed(1)}%,`;
        csv += `${produto.numeroVendas}\n`;
    });

    csv += '\n';
    csv += `TOTAIS,,${totais.totalItens},,${totais.totalReceita.toFixed(2)},${totais.totalCustos.toFixed(2)},${totais.totalLucro.toFixed(2)},${totais.margemTotal.toFixed(1)}%,\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const nomeArquivo = `relatorio_vendas_item_${periodo.dataInicial}_${periodo.dataFinal}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', nomeArquivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarNotificacao('✅ Arquivo CSV exportado com sucesso!', 'success');
}

// Filtros e paginacao do relatorio de vendas por item
let paginaAtualRelatorioItem = 1;

function obterItensPorPaginaRelatorioItem() {
    const select = document.getElementById('itensPorPaginaRelatorioItem');
    const valor = parseInt(select?.value, 10);
    return Number.isFinite(valor) && valor > 0 ? valor : 20;
}

function aplicarFiltrosRelatorioVendasItem() {
    if (!window.dadosRelatorioVendasItemAtual || !window.dadosRelatorioVendasItemAtual.produtosBase) {
        return;
    }

    const termo = (document.getElementById('filtroTextoRelatorioItem')?.value || '').toLowerCase();
    const ordenacao = document.getElementById('ordenacaoRelatorioItem')?.value || 'lucro_desc';

    let filtrados = window.dadosRelatorioVendasItemAtual.produtosBase.filter(produto => {
        if (!termo) return true;
        return (
            produto.nome.toLowerCase().includes(termo) ||
            (produto.codigo || '').toLowerCase().includes(termo)
        );
    });

    switch (ordenacao) {
        case 'lucro_asc':
            filtrados.sort((a, b) => a.lucro - b.lucro);
            break;
        case 'margem_desc':
            filtrados.sort((a, b) => b.margem - a.margem);
            break;
        case 'margem_asc':
            filtrados.sort((a, b) => a.margem - b.margem);
            break;
        case 'quantidade_desc':
            filtrados.sort((a, b) => b.quantidade - a.quantidade);
            break;
        case 'receita_desc':
            filtrados.sort((a, b) => b.totalVendas - a.totalVendas);
            break;
        case 'lucro_desc':
        default:
            filtrados.sort((a, b) => b.lucro - a.lucro);
            break;
    }

    window.dadosRelatorioVendasItemAtual.produtosFiltrados = filtrados;
    paginaAtualRelatorioItem = 1;
    renderizarTabelaRelatorioVendasItem();
}

function renderizarTabelaRelatorioVendasItem() {
    const dados = window.dadosRelatorioVendasItemAtual;
    if (!dados || !dados.produtosFiltrados) return;

    const itensPorPagina = obterItensPorPaginaRelatorioItem();
    const totalItens = dados.produtosFiltrados.length;
    const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));

    if (paginaAtualRelatorioItem > totalPaginas) {
        paginaAtualRelatorioItem = totalPaginas;
    }

    const inicio = (paginaAtualRelatorioItem - 1) * itensPorPagina;
    const fim = Math.min(inicio + itensPorPagina, totalItens);
    const itensPagina = dados.produtosFiltrados.slice(inicio, fim);

    const corpo = document.getElementById('listaRelatorioVendasItem');
    const tfoot = document.getElementById('totaisRelatorioVendasItem');
    const resumo = document.getElementById('resumoRelatorioVendasItem');

    if (!corpo || !tfoot) return;

    if (totalItens === 0) {
        corpo.innerHTML = '<tr><td colspan="10" style="padding: 20px; text-align: center; color: #999;">Nenhum item encontrado</td></tr>';
        tfoot.innerHTML = '';
        if (resumo) resumo.textContent = 'Nenhum item encontrado';
        atualizarPaginacaoRelatorioVendasItem(0, 0);
        return;
    }

    corpo.innerHTML = itensPagina.map(produto => {
        const margemCor = produto.margem < 10 ? '#dc3545' : produto.margem < 30 ? '#ffc107' : '#28a745';

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: bold;">${produto.nome}</td>
                <td style="padding: 12px; color: #666;">${produto.codigo}</td>
                <td style="padding: 12px; color: #666;">${produto.categoria || '-'}</td>
                <td style="padding: 12px; text-align: center; font-weight: bold; color: #17a2b8;">${produto.quantidade}</td>
                <td style="padding: 12px; text-align: right; color: #666;">R$ ${produto.precoMedio.toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745;">R$ ${produto.totalVendas.toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; color: #dc3545;">R$ ${produto.totalCustos.toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; color: ${produto.lucro >= 0 ? '#28a745' : '#dc3545'};">R$ ${produto.lucro.toFixed(2)}</td>
                <td style="padding: 12px; text-align: center; font-weight: bold; color: ${margemCor};">${produto.margem.toFixed(1)}%</td>
                <td style="padding: 12px; text-align: center; color: #666;">${produto.numeroVendas}</td>
            </tr>
        `;
    }).join('');

    const totalQuantidade = dados.produtosFiltrados.reduce((sum, p) => sum + p.quantidade, 0);
    const totalReceita = dados.produtosFiltrados.reduce((sum, p) => sum + p.totalVendas, 0);
    const totalCustos = dados.produtosFiltrados.reduce((sum, p) => sum + p.totalCustos, 0);
    const totalLucro = totalReceita - totalCustos;
    const margemTotal = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;

    tfoot.innerHTML = `
        <tr style="background: #f8f9fa; font-weight: bold;">
            <td colspan="3" style="padding: 12px; text-align: right; border-top: 2px solid #ddd;">TOTAIS:</td>
            <td style="padding: 12px; text-align: center; border-top: 2px solid #ddd; color: #17a2b8;">${totalQuantidade}</td>
            <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd;"></td>
            <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: #28a745;">R$ ${totalReceita.toFixed(2)}</td>
            <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: #dc3545;">R$ ${totalCustos.toFixed(2)}</td>
            <td style="padding: 12px; text-align: right; border-top: 2px solid #ddd; color: ${totalLucro >= 0 ? '#28a745' : '#dc3545'};">R$ ${totalLucro.toFixed(2)}</td>
            <td style="padding: 12px; text-align: center; border-top: 2px solid #ddd; color: #6f42c1;">${margemTotal.toFixed(1)}%</td>
            <td style="padding: 12px; text-align: center; border-top: 2px solid #ddd;"></td>
        </tr>
    `;

    if (resumo) {
        resumo.textContent = `Mostrando ${inicio + 1}-${fim} de ${totalItens} itens`;
    }

    atualizarPaginacaoRelatorioVendasItem(totalItens, totalPaginas);
}

function atualizarPaginacaoRelatorioVendasItem(totalItens, totalPaginas) {
    const container = document.getElementById('paginacaoRelatorioVendasItem');
    if (!container) return;

    if (totalItens === 0 || totalPaginas <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    const paginaAtual = paginaAtualRelatorioItem;
    const maxBotoes = 5;
    let inicio = Math.max(1, paginaAtual - Math.floor(maxBotoes / 2));
    let fim = Math.min(totalPaginas, inicio + maxBotoes - 1);

    if (fim - inicio + 1 < maxBotoes) {
        inicio = Math.max(1, fim - maxBotoes + 1);
    }

    html += `
        <button class="btn" style="padding: 6px 10px;" onclick="mudarPaginaRelatorioVendasItem(${paginaAtual - 1})" ${paginaAtual === 1 ? 'disabled' : ''}>◀</button>
    `;

    for (let i = inicio; i <= fim; i++) {
        html += `
            <button class="btn" style="padding: 6px 10px; ${i === paginaAtual ? 'background: #17a2b8; color: white;' : ''}" onclick="mudarPaginaRelatorioVendasItem(${i})">${i}</button>
        `;
    }

    html += `
        <button class="btn" style="padding: 6px 10px;" onclick="mudarPaginaRelatorioVendasItem(${paginaAtual + 1})" ${paginaAtual === totalPaginas ? 'disabled' : ''}>▶</button>
    `;

    container.innerHTML = html;
}

function mudarPaginaRelatorioVendasItem(pagina) {
    paginaAtualRelatorioItem = pagina;
    renderizarTabelaRelatorioVendasItem();
}
