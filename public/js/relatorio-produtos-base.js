// ==================== RELATORIO DE PRODUTOS DA BASE ====================
let produtosRelatorioBaseCompleto = [];

function abrirRelatorioProdutosBase() {
    abrirModal('relatorioProdutosBaseModal', () => {
        gerarRelatorioProdutosBase();
    });
}

async function gerarRelatorioProdutosBase() {
    const container = document.getElementById('resultadoRelatorioProdutosBase');
    container.innerHTML = '<p style="text-align: center; padding: 40px;"><strong>Carregando produtos...</strong></p>';

    try {
        const response = await fetch(`${API_URL}/produtos`);
        if (!response.ok) {
            throw new Error('Erro ao carregar produtos');
        }

        produtosRelatorioBaseCompleto = await response.json();
        aplicarFiltrosRelatorioProdutosBase();
    } catch (error) {
        console.error('Erro ao gerar relatório de produtos da base:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao gerar relatório</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;

        const btnExportar = document.getElementById('btnExportarProdutosBaseCSV');
        if (btnExportar) btnExportar.disabled = true;
    }
}

function aplicarFiltrosRelatorioProdutosBase() {
    const container = document.getElementById('resultadoRelatorioProdutosBase');
    const busca = (document.getElementById('buscaRelatorioProdutosBase').value || '').toLowerCase();
    const statusAtivo = document.getElementById('filtroStatusProdutosBase').value;
    const situacaoEstoque = document.getElementById('filtroEstoqueProdutosBase').value;

    const produtosFiltrados = produtosRelatorioBaseCompleto.filter((produto) => {
        const nome = (produto.nome || '').toLowerCase();
        const codigo = String(produto.codigo_barras || '').toLowerCase();
        const ativo = produto.ativo === true || produto.ativo === 1;
        const estoque = Number(produto.estoque || 0);
        const estoqueMinimo = Number(produto.estoque_minimo || 0);

        const matchBusca = !busca || nome.includes(busca) || codigo.includes(busca);
        if (!matchBusca) return false;

        if (statusAtivo === 'ativos' && !ativo) return false;
        if (statusAtivo === 'inativos' && ativo) return false;

        if (situacaoEstoque === 'zerado' && estoque !== 0) return false;
        if (situacaoEstoque === 'baixo' && !(estoqueMinimo > 0 && estoque <= estoqueMinimo)) return false;
        if (situacaoEstoque === 'positivo' && estoque <= 0) return false;

        return true;
    });

    produtosFiltrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));

    window.dadosRelatorioProdutosBaseAtual = {
        produtos: produtosFiltrados,
        filtros: { busca, status_ativo: statusAtivo, situacao_estoque: situacaoEstoque }
    };

    if (produtosFiltrados.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #6c757d;">
                <div style="font-size: 56px; margin-bottom: 18px;">📭</div>
                <h3>Nenhum produto encontrado</h3>
                <p style="margin-top: 10px;">Altere os filtros e tente novamente.</p>
            </div>
        `;
        const btnExportar = document.getElementById('btnExportarProdutosBaseCSV');
        if (btnExportar) btnExportar.disabled = true;
        return;
    }

    const totalAtivos = produtosFiltrados.filter(p => p.ativo === true || p.ativo === 1).length;
    const totalInativos = produtosFiltrados.length - totalAtivos;
    const totalEstoque = produtosFiltrados.reduce((acc, p) => acc + Number(p.estoque || 0), 0);
    const valorEstoque = produtosFiltrados.reduce((acc, p) => acc + (Number(p.preco_custo || 0) * Number(p.estoque || 0)), 0);

    container.innerHTML = `
        <div class="relatorio-resultado">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 20px; margin-bottom: 24px;">
                <div style="background: linear-gradient(135deg, #2a9d8f 0%, #1d7f74 100%); color: white; padding: 18px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Produtos no Relatório</div>
                    <div style="font-size: 34px; font-weight: bold;">${produtosFiltrados.length}</div>
                </div>
                <div style="background: linear-gradient(135deg, #f4a261 0%, #e76f51 100%); color: white; padding: 18px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Ativos / Inativos</div>
                    <div style="font-size: 30px; font-weight: bold;">${totalAtivos} / ${totalInativos}</div>
                </div>
                <div style="background: linear-gradient(135deg, #264653 0%, #1d3557 100%); color: white; padding: 18px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total em Estoque</div>
                    <div style="font-size: 34px; font-weight: bold;">${totalEstoque}</div>
                </div>
                <div style="background: linear-gradient(135deg, #457b9d 0%, #2a6f97 100%); color: white; padding: 18px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Valor de Custo em Estoque</div>
                    <div style="font-size: 28px; font-weight: bold;">R$ ${valorEstoque.toFixed(2)}</div>
                </div>
            </div>

            <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">📋 Produtos da Base</h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #264653 0%, #1d3557 100%); color: white;">
                                <th style="padding: 12px; text-align: left;">Código</th>
                                <th style="padding: 12px; text-align: left;">Produto</th>
                                <th style="padding: 12px; text-align: right;">Preço Venda</th>
                                <th style="padding: 12px; text-align: right;">Preço Custo</th>
                                <th style="padding: 12px; text-align: center;">Estoque</th>
                                <th style="padding: 12px; text-align: center;">Mínimo</th>
                                <th style="padding: 12px; text-align: center;">Status</th>
                                <th style="padding: 12px; text-align: left;">Fornecedor</th>
                                <th style="padding: 12px; text-align: left;">Categoria</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${produtosFiltrados.map((produto) => {
                                const ativo = produto.ativo === true || produto.ativo === 1;
                                const statusCor = ativo ? '#28a745' : '#dc3545';
                                const statusTexto = ativo ? 'Ativo' : 'Inativo';
                                return `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 12px; font-family: monospace; color: #555;">${produto.codigo_barras || '-'}</td>
                                        <td style="padding: 12px; font-weight: 500;">${produto.nome || '-'}</td>
                                        <td style="padding: 12px; text-align: right;">R$ ${Number(produto.preco || 0).toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: right;">R$ ${Number(produto.preco_custo || 0).toFixed(2)}</td>
                                        <td style="padding: 12px; text-align: center;">${Number(produto.estoque || 0)}</td>
                                        <td style="padding: 12px; text-align: center;">${Number(produto.estoque_minimo || 0)}</td>
                                        <td style="padding: 12px; text-align: center; font-weight: bold; color: ${statusCor};">${statusTexto}</td>
                                        <td style="padding: 12px; color: #666;">${produto.fornecedor_nome || '-'}</td>
                                        <td style="padding: 12px; color: #666;">${produto.categoria_nome || '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    const btnExportar = document.getElementById('btnExportarProdutosBaseCSV');
    if (btnExportar) btnExportar.disabled = false;

    mostrarNotificacao(`✅ ${produtosFiltrados.length} produto(s) carregado(s)`, 'success');
}

async function exportarRelatorioProdutosBaseCSV() {
    if (!window.dadosRelatorioProdutosBaseAtual || !window.dadosRelatorioProdutosBaseAtual.produtos.length) {
        mostrarNotificacao('Gere o relatório primeiro!', 'error');
        return;
    }

    const { filtros } = window.dadosRelatorioProdutosBaseAtual;
    const query = new URLSearchParams();

    if (filtros.busca) query.set('busca', filtros.busca);
    if (filtros.status_ativo && filtros.status_ativo !== 'todos') query.set('status_ativo', filtros.status_ativo);
    if (filtros.situacao_estoque && filtros.situacao_estoque !== 'todos') query.set('situacao_estoque', filtros.situacao_estoque);

    try {
        const response = await fetch(`${API_URL}/produtos/relatorio/exportar?${query.toString()}`);
        if (!response.ok) {
            throw new Error('Não foi possível exportar o CSV');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dataAtual = new Date().toISOString().split('T')[0];

        link.href = url;
        link.download = `relatorio_produtos_base_${dataAtual}.csv`;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        mostrarNotificacao('✅ CSV exportado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao exportar CSV de produtos da base:', error);
        mostrarNotificacao('Erro ao exportar CSV. Tente novamente.', 'error');
    }
}

window.abrirRelatorioProdutosBase = abrirRelatorioProdutosBase;
window.gerarRelatorioProdutosBase = gerarRelatorioProdutosBase;
window.exportarRelatorioProdutosBaseCSV = exportarRelatorioProdutosBaseCSV;
