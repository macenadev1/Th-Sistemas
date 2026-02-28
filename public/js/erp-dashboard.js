// ==================== ERP DASHBOARD ====================
// Gerenciamento do dashboard e estatísticas

/**
 * Navegação entre seções do ERP
 */
function navegarPara(event, secao) {
    event.preventDefault();
    
    // Remover classe active de todos os itens do menu
    document.querySelectorAll('.erp-menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Adicionar active no item clicado
    event.currentTarget.classList.add('active');
    
    // Ocultar todas as seções
    document.querySelectorAll('.erp-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar seção selecionada
    const secaoElement = document.getElementById(`${secao}-section`);
    if (secaoElement) {
        secaoElement.classList.add('active');
    }
    
    // Atualizar título do header
    const titulos = {
        'dashboard': '📊 Dashboard',
        'produtos': '📦 Produtos',
        'clientes': '👥 Clientes',
        'fornecedores': '🏢 Fornecedores',
        'caixa': '💰 Caixa',
        'vendas': '🛒 Vendas',
        'financeiro': '💸 Financeiro',
        'relatorios': '📈 Relatórios',
        'configuracoes': '⚙️ Configurações'
    };
    
    document.getElementById('pageTitle').textContent = titulos[secao] || secao;
    
    // Carregar dados específicos da seção
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
        // Seção financeiro já tem cards estáticos - nada a carregar
    } else if (secao === 'caixa') {
        carregarCaixaSection();
    }
}

/**
 * Carregar dados do Dashboard
 */
async function carregarDashboard() {
    try {
        const [vendasResponse, produtosResponse, caixaResponse] = await Promise.all([
            fetch(`${API_URL}/vendas`),
            fetch(`${API_URL}/produtos`),
            fetch(`${API_URL}/caixa/status`)
        ]);

        const vendas = vendasResponse.ok ? await vendasResponse.json() : [];
        const produtos = produtosResponse.ok ? await produtosResponse.json() : [];
        const caixa = caixaResponse.ok ? await caixaResponse.json() : null;

        await Promise.all([
            carregarEstatisticasGerais({ vendas, produtos, caixa }),
            carregarVendasRecentes(vendas),
            carregarProdutosEstoqueBaixo(produtos),
            carregarGraficoEvolucaoVendas(vendas),
            carregarGraficoPizzaPagamentos()
        ]);
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

/**
 * Carregar estatísticas gerais
 */
async function carregarEstatisticasGerais({ vendas = null, produtos = null, caixa = null } = {}) {
    try {
        // Vendas de hoje - API retorna apenas vendas NÃO CANCELADAS por padrão
        if (!vendas) {
            const vendasResponse = await fetch(`${API_URL}/vendas`);
            vendas = vendasResponse.ok ? await vendasResponse.json() : [];
        }

        const hoje = new Date().toLocaleDateString('pt-BR');
        // Filtro de vendas de hoje (API já exclui canceladas automaticamente)
        const vendasHoje = vendas.filter(v => {
            const dataVenda = new Date(v.data_venda.replace(' ', 'T')).toLocaleDateString('pt-BR');
            return dataVenda === hoje;
        });
        
        const totalVendasHoje = vendasHoje.reduce((sum, v) => sum + parseFloat(v.total), 0);
        document.getElementById('vendasHoje').textContent = `R$ ${totalVendasHoje.toFixed(2)}`;
        document.getElementById('qtdVendasHoje').textContent = `${vendasHoje.length} venda(s)`;
        
        // Caixa
        try {
            if (!caixa) {
                const caixaResponse = await fetch(`${API_URL}/caixa/status`);
                caixa = caixaResponse.ok ? await caixaResponse.json() : null;
            }

            console.log('Status do caixa:', caixa); // Debug
            
            const saldoElement = document.getElementById('saldoCaixa');
            const statusElement = document.getElementById('statusCaixa');
            
            if (saldoElement && statusElement) {
                if (caixa && caixa.aberto && caixa.caixa) {
                    const saldo = parseFloat(caixa.caixa.valorAbertura || 0) + 
                                 parseFloat(caixa.caixa.totalVendas || 0) + 
                                 parseFloat(caixa.caixa.totalReforcos || 0) - 
                                 parseFloat(caixa.caixa.totalSangrias || 0);
                    saldoElement.textContent = `R$ ${saldo.toFixed(2)}`;
                    statusElement.textContent = '✅ Caixa aberto';
                    console.log('Saldo atualizado para:', saldo.toFixed(2)); // Debug
                } else {
                    saldoElement.textContent = 'R$ 0,00';
                    statusElement.textContent = '🔒 Caixa fechado';
                }
            }
        } catch (error) {
            console.error('Erro ao carregar status do caixa:', error);
            const statusElement = document.getElementById('statusCaixa');
            if (statusElement) statusElement.textContent = '⚠️ Erro de conexão';
        }
        
        // Produtos
        if (!produtos) {
            const produtosResponse = await fetch(`${API_URL}/produtos`);
            produtos = produtosResponse.ok ? await produtosResponse.json() : [];
        }

        const produtosAtivos = produtos.filter(p => p.ativo);
        const produtosEstoque = produtos.filter(p => p.estoque > 0);
        document.getElementById('totalProdutos').textContent = produtosAtivos.length;
        document.getElementById('produtosEstoque').textContent = `${produtosEstoque.length} em estoque`;
        
        // Alertas (produtos com estoque baixo ou zerado)
        const produtosEstoqueBaixo = produtos.filter(p => {
            const estoque = parseInt(p.estoque) || 0;
            const estoqueMinimo = parseInt(p.estoque_minimo) || 0;
            // Incluir: estoque zerado OU estoque menor/igual ao mínimo (se mínimo > 0)
            return estoque === 0 || (estoqueMinimo > 0 && estoque <= estoqueMinimo);
        });
        document.getElementById('totalAlertas').textContent = produtosEstoqueBaixo.length;
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

/**
 * Carregar vendas recentes
 */
async function carregarVendasRecentes(vendas = null) {
    try {
        if (!vendas) {
            const response = await fetch(`${API_URL}/vendas`);
            if (!response.ok) return;
            
            // API já retorna apenas vendas não canceladas por padrão
            vendas = await response.json();
        }
        const vendasRecentes = vendas.slice(0, 5);
        
        const container = document.getElementById('vendasRecentes');
        
        if (vendasRecentes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhuma venda registrada</p>';
            return;
        }
        
        container.innerHTML = vendasRecentes.map(venda => {
            const data = new Date(venda.data_venda.replace(' ', 'T'));
            const dataFormatada = data.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <div class="venda-item">
                    <div>
                        <strong>Venda #${venda.id}</strong>
                        <br>
                        <small>${dataFormatada} • ${venda.quantidade_itens} item(ns)</small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: #27ae60; font-size: 18px;">R$ ${parseFloat(venda.total).toFixed(2)}</strong>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar vendas recentes:', error);
    }
}

/**
 * Carregar produtos com estoque baixo
 */
async function carregarProdutosEstoqueBaixo(produtos = null) {
    try {
        if (!produtos) {
            const response = await fetch(`${API_URL}/produtos`);
            if (!response.ok) return;
            
            produtos = await response.json();
        }
        const produtosEstoqueBaixo = produtos
            .filter(p => {
                const estoque = parseInt(p.estoque) || 0;
                const estoqueMinimo = parseInt(p.estoque_minimo) || 0;
                // Incluir: estoque zerado OU estoque menor/igual ao mínimo (se mínimo > 0)
                return estoque === 0 || (estoqueMinimo > 0 && estoque <= estoqueMinimo);
            })
            .sort((a, b) => {
                // Ordenar por criticidade: estoque zerado primeiro
                const estoqueA = parseInt(a.estoque) || 0;
                const estoqueB = parseInt(b.estoque) || 0;
                if (estoqueA === 0 && estoqueB !== 0) return -1;
                if (estoqueB === 0 && estoqueA !== 0) return 1;
                return estoqueA - estoqueB;
            })
            .slice(0, 5);
        
        const container = document.getElementById('produtosEstoqueBaixo');
        
        if (produtosEstoqueBaixo.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #27ae60; padding: 20px;">✓ Todos os produtos com estoque adequado</p>';
            return;
        }
        
        container.innerHTML = produtosEstoqueBaixo.map(produto => {
            const estoque = parseInt(produto.estoque) || 0;
            const estoqueMinimo = parseInt(produto.estoque_minimo) || 0;
            
            // Determinar status e cor
            let statusIcon = '⚠️';
            let statusText = 'Estoque baixo';
            let statusColor = '#ffc107';
            
            if (estoque === 0) {
                statusIcon = '⛔';
                statusText = 'ESGOTADO';
                statusColor = '#dc3545';
            } else if (estoque <= estoqueMinimo / 2) {
                statusIcon = '🔴';
                statusText = 'Crítico';
                statusColor = '#dc3545';
            }
            
            return `
                <div class="produto-item">
                    <div>
                        <strong>${produto.nome}</strong>
                        <br>
                        <small>Código: ${produto.codigo_barras} | Mín: ${estoqueMinimo}</small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: ${statusColor}; font-size: 18px;">${estoque} un.</strong>
                        <br>
                        <small style="color: ${statusColor};">${statusIcon} ${statusText}</small>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar produtos com estoque baixo:', error);
    }
}

/**
 * Carregar grafico de evolucao de vendas
 */
async function carregarGraficoEvolucaoVendas(vendas = null) {
    const container = document.getElementById('graficoEvolucaoVendas');
    if (!container) return;

    const selectPeriodo = document.getElementById('filtroPeriodoEvolucaoVendas');
    const metaMensalInput = document.getElementById('metaMensalEvolucaoVendas');
    const dias = Math.max(1, parseInt(selectPeriodo?.value, 10) || 30);

    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Carregando grafico...</p>';

    try {
        if (!vendas) {
            const response = await fetch(`${API_URL}/vendas`);
            if (!response.ok) throw new Error('Erro ao carregar vendas');

            vendas = await response.json();
        }
        const hoje = new Date();
        const dataInicial = new Date();
        dataInicial.setHours(0, 0, 0, 0);
        dataInicial.setDate(hoje.getDate() - (dias - 1));

        const usarSemanal = dias >= 90;
        const dadosGrafico = usarSemanal
            ? agruparVendasSemanal(vendas, dataInicial, dias)
            : agruparVendasDiario(vendas, dataInicial, dias);

        const valores = dadosGrafico.valores;
        const mediaMovel = calcularMediaMovel(valores, usarSemanal ? 4 : 7);
        const metaMensal = parseFloat(metaMensalInput?.value || '0') || 0;
        const metaProporcional = calcularMetaProporcional(metaMensal, usarSemanal);

        atualizarLegendaGrafico(usarSemanal);

        if (valores.every(valor => valor === 0)) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Sem vendas no periodo</p>';
            return;
        }

        container.innerHTML = renderizarGraficoBarrasSVG(dadosGrafico.labels, dadosGrafico.labelsTooltip, valores, mediaMovel, metaProporcional);
        configurarTooltipGrafico(container);
    } catch (error) {
        console.error('Erro ao carregar grafico de vendas:', error);
        container.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Erro ao carregar grafico</p>';
    }
}

function formatarDataLocalISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function formatarDataCurta(data) {
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function calcularMetaProporcional(metaMensal, usarSemanal) {
    if (!metaMensal || metaMensal <= 0) return 0;

    const hoje = new Date();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const metaDiaria = metaMensal / diasNoMes;

    return usarSemanal ? metaDiaria * 7 : metaDiaria;
}

function agruparVendasDiario(vendas, dataInicial, dias) {
    const mapaDias = new Map();
    const labels = [];
    const labelsTooltip = [];

    for (let i = 0; i < dias; i++) {
        const data = new Date(dataInicial);
        data.setDate(dataInicial.getDate() + i);
        const chave = formatarDataLocalISO(data);
        mapaDias.set(chave, 0);
        labels.push(formatarDataCurta(data));
        labelsTooltip.push(data.toLocaleDateString('pt-BR'));
    }

    vendas.forEach(venda => {
        const dataVenda = new Date(venda.data_venda.replace(' ', 'T'));
        if (isNaN(dataVenda.getTime())) return;

        const chave = formatarDataLocalISO(dataVenda);
        if (mapaDias.has(chave)) {
            mapaDias.set(chave, mapaDias.get(chave) + parseFloat(venda.total || 0));
        }
    });

    return {
        labels,
        labelsTooltip,
        valores: Array.from(mapaDias.values())
    };
}

function agruparVendasSemanal(vendas, dataInicial, dias) {
    const totalSemanas = Math.ceil(dias / 7);
    const totais = new Array(totalSemanas).fill(0);
    const labels = [];
    const labelsTooltip = [];

    for (let i = 0; i < totalSemanas; i++) {
        const inicioSemana = new Date(dataInicial);
        inicioSemana.setDate(dataInicial.getDate() + (i * 7));
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 6);

        labels.push(formatarDataCurta(inicioSemana));
        labelsTooltip.push(`${inicioSemana.toLocaleDateString('pt-BR')} - ${fimSemana.toLocaleDateString('pt-BR')}`);
    }

    vendas.forEach(venda => {
        const dataVenda = new Date(venda.data_venda.replace(' ', 'T'));
        if (isNaN(dataVenda.getTime())) return;

        const diffDias = Math.floor((dataVenda - dataInicial) / (1000 * 60 * 60 * 24));
        const indiceSemana = Math.floor(diffDias / 7);
        if (indiceSemana >= 0 && indiceSemana < totalSemanas) {
            totais[indiceSemana] += parseFloat(venda.total || 0);
        }
    });

    return {
        labels,
        labelsTooltip,
        valores: totais
    };
}

function atualizarLegendaGrafico(usarSemanal) {
    const legendaVendas = document.getElementById('legendaVendasEvolucao');
    const legendaMedia = document.getElementById('legendaMediaEvolucao');

    if (legendaVendas) {
        legendaVendas.textContent = usarSemanal ? 'Vendas semanais (barras)' : 'Vendas diarias (barras)';
    }

    if (legendaMedia) {
        legendaMedia.textContent = usarSemanal ? 'Media movel (4s)' : 'Media movel (7d)';
    }
}

function calcularMediaMovel(valores, janela) {
    return valores.map((_, indice) => {
        const inicio = Math.max(0, indice - janela + 1);
        const fatia = valores.slice(inicio, indice + 1);
        const soma = fatia.reduce((total, valor) => total + valor, 0);
        return soma / fatia.length;
    });
}

function renderizarGraficoBarrasSVG(labels, labelsTooltip, valores, mediaMovel, metaProporcional) {
    const largura = 1000;
    const altura = 320;
    const padding = { left: 50, right: 20, top: 20, bottom: 45 };
    const larguraGrafico = largura - padding.left - padding.right;
    const alturaGrafico = altura - padding.top - padding.bottom;

    const maxValor = Math.max(1, ...valores, ...mediaMovel, metaProporcional);
    const passoX = labels.length > 0 ? larguraGrafico / labels.length : 0;
    const barraLargura = Math.max(6, passoX * 0.6);
    const barraOffset = (passoX - barraLargura) / 2;

    const pontosMedia = mediaMovel.map((valor, indice) => {
        const x = padding.left + (passoX * indice) + (passoX / 2);
        const y = padding.top + (alturaGrafico - (valor / maxValor) * alturaGrafico);
        return `${x},${y}`;
    }).join(' ');

    const indiceMax = valores.indexOf(Math.max(...valores));
    const indiceMin = valores.indexOf(Math.min(...valores));

    const marcadorMax = indiceMax >= 0 ? criarMarcadorGrafico(indiceMax, valores[indiceMax], passoX, padding, alturaGrafico, maxValor, '#17a2b8', 'Max') : '';
    const marcadorMin = indiceMin >= 0 && indiceMin !== indiceMax ? criarMarcadorGrafico(indiceMin, valores[indiceMin], passoX, padding, alturaGrafico, maxValor, '#6f42c1', 'Min') : '';

    const barras = valores.map((valor, indice) => {
        const x = padding.left + (passoX * indice) + barraOffset;
        const alturaBarra = (valor / maxValor) * alturaGrafico;
        const y = padding.top + (alturaGrafico - alturaBarra);
        const labelTooltip = labelsTooltip[indice] || labels[indice] || '';
        const media = mediaMovel[indice] || 0;
        const cor = indice === indiceMax ? '#20c997' : indice === indiceMin ? '#ff6b6b' : '#17a2b8';
        return `
            <rect x="${x}" y="${y}" width="${barraLargura}" height="${alturaBarra}" fill="${cor}" rx="4" ry="4" />
            <rect class="grafico-bar" x="${x}" y="${y}" width="${barraLargura}" height="${alturaBarra}" fill="transparent" data-label="${labelTooltip}" data-valor="${valor.toFixed(2)}" data-media="${media.toFixed(2)}" />
        `;
    }).join('');

    const metaLinha = metaProporcional > 0
        ? (() => {
            const yMeta = padding.top + (alturaGrafico - (metaProporcional / maxValor) * alturaGrafico);
            return `
                <line x1="${padding.left}" y1="${yMeta}" x2="${largura - padding.right}" y2="${yMeta}" stroke="#ff8f00" stroke-width="2" stroke-dasharray="6 4" />
                <text x="${largura - padding.right}" y="${yMeta - 6}" text-anchor="end" fill="#ff8f00" font-size="12" font-weight="600">Meta: R$ ${metaProporcional.toFixed(0)}</text>
            `;
        })()
        : '';

    const linhasGrade = 4;
    const grade = [];
    const labelsY = [];
    for (let i = 0; i <= linhasGrade; i++) {
        const y = padding.top + (alturaGrafico * (i / linhasGrade));
        const valor = maxValor - (maxValor * (i / linhasGrade));
        grade.push(`<line x1="${padding.left}" y1="${y}" x2="${largura - padding.right}" y2="${y}" stroke="#eee" stroke-width="1" />`);
        labelsY.push(`<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#999" font-size="11">R$ ${valor.toFixed(0)}</text>`);
    }

    const ticksX = gerarTicksX(labels, 6);

    return `
        <div class="grafico-wrapper">
            <svg viewBox="0 0 ${largura} ${altura}" width="100%" height="460" role="img" aria-label="Grafico de evolucao de vendas">
                ${grade.join('')}
                ${labelsY.join('')}
                <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${altura - padding.bottom}" stroke="#ddd" stroke-width="1" />
                <line x1="${padding.left}" y1="${altura - padding.bottom}" x2="${largura - padding.right}" y2="${altura - padding.bottom}" stroke="#ddd" stroke-width="1" />

                ${metaLinha}
                ${barras}
                <polyline fill="none" stroke="#6f42c1" stroke-width="2" stroke-dasharray="6 4" points="${pontosMedia}" />

                ${marcadorMax}
                ${marcadorMin}

                ${ticksX.map(tick => `<text x="${tick.x}" y="${altura - 15}" text-anchor="middle" fill="#999" font-size="11">${tick.label}</text>`).join('')}
            </svg>
            <div class="grafico-tooltip" id="tooltipEvolucaoVendas"></div>
        </div>
    `;
}

function gerarTicksX(labels, quantidade) {
    if (!labels.length) return [];
    if (labels.length <= quantidade) {
        return labels.map((label, indice) => ({
            x: 50 + ((1000 - 70) / (labels.length - 1 || 1)) * indice,
            label
        }));
    }

    const ticks = [];
    const ultimo = labels.length - 1;
    for (let i = 0; i < quantidade; i++) {
        const indice = Math.round((ultimo / (quantidade - 1)) * i);
        const x = 50 + ((1000 - 70) / (labels.length - 1)) * indice;
        ticks.push({ x, label: labels[indice] });
    }
    return ticks;
}

function criarMarcadorGrafico(indice, valor, passoX, padding, alturaGrafico, maxValor, cor, texto) {
    const x = padding.left + (passoX * indice) + (passoX / 2);
    const y = padding.top + (alturaGrafico - (valor / maxValor) * alturaGrafico);
    const deslocamento = texto === 'Max' ? -10 : 16;

    return `
        <circle cx="${x}" cy="${y}" r="6" fill="${cor}" />
        <text x="${x}" y="${y + deslocamento}" text-anchor="middle" fill="${cor}" font-size="12" font-weight="600">${texto}: R$ ${valor.toFixed(0)}</text>
    `;
}

function configurarTooltipGrafico(container) {
    const tooltip = container.querySelector('#tooltipEvolucaoVendas');
    const pontos = container.querySelectorAll('.grafico-bar');

    if (!tooltip || !pontos.length) return;

    pontos.forEach(ponto => {
        ponto.addEventListener('mouseenter', event => {
            const target = event.target;
            tooltip.style.display = 'block';
            tooltip.innerHTML = `
                <div><strong>${target.dataset.label}</strong></div>
                <div>Vendas: R$ ${target.dataset.valor}</div>
                <div>Media movel: R$ ${target.dataset.media}</div>
            `;
        });

        ponto.addEventListener('mousemove', event => {
            const rect = container.getBoundingClientRect();
            tooltip.style.left = `${event.clientX - rect.left}px`;
            tooltip.style.top = `${event.clientY - rect.top}px`;
        });

        ponto.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
}

/**
 * Carregar grafico de pizza de vendas por forma de pagamento
 */
async function carregarGraficoPizzaPagamentos() {
    const container = document.getElementById('graficoPizzaPagamentos');
    if (!container) return;

    const filtroPeriodo = document.getElementById('filtroPeriodoPagamentos');
    const periodo = filtroPeriodo?.value || 'mes';

    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Carregando grafico...</p>';

    try {
        const response = await fetch(`${API_URL}/vendas/stats/formas-pagamento?periodo=${encodeURIComponent(periodo)}`);
        if (!response.ok) throw new Error('Erro ao carregar formas de pagamento');

        const resultado = await response.json();
        const dados = Array.isArray(resultado?.data) ? resultado.data : [];

        if (!dados.length) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Sem dados de pagamento para exibir</p>';
            return;
        }

        const total = dados.reduce((soma, item) => soma + parseFloat(item.valor_total || 0), 0);
        if (total <= 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Sem valores de vendas para exibir</p>';
            return;
        }

        container.innerHTML = renderizarGraficoPizzaPagamentos(dados, total);
    } catch (error) {
        console.error('Erro ao carregar grafico de pagamentos:', error);
        container.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Erro ao carregar grafico</p>';
    }
}

function renderizarGraficoPizzaPagamentos(dados, total) {
    const configuracao = {
        dinheiro: { nome: 'Dinheiro', cor: '#28a745' },
        pix: { nome: 'PIX', cor: '#17a2b8' },
        debito: { nome: 'Debito', cor: '#6f42c1' },
        credito: { nome: 'Credito', cor: '#fd7e14' }
    };

    let anguloAtual = -90;

    const setores = dados.map((item, indice) => {
        const chave = String(item.forma_pagamento || '').toLowerCase();
        const valor = parseFloat(item.valor_total || 0);
        const percentual = (valor / total) * 100;
        const anguloSetor = (valor / total) * 360;

        const inicio = polarParaCartesiano(100, 100, 85, anguloAtual);
        anguloAtual += anguloSetor;
        const fim = polarParaCartesiano(100, 100, 85, anguloAtual);
        const arcoGrande = anguloSetor > 180 ? 1 : 0;
        const corPadrao = ['#28a745', '#17a2b8', '#6f42c1', '#fd7e14', '#e83e8c', '#20c997'];
        const cor = configuracao[chave]?.cor || corPadrao[indice % corPadrao.length];

        return {
            caminho: `M 100 100 L ${inicio.x} ${inicio.y} A 85 85 0 ${arcoGrande} 1 ${fim.x} ${fim.y} Z`,
            nome: configuracao[chave]?.nome || formatarFormaPagamento(chave),
            cor,
            valor,
            percentual
        };
    });

    return `
        <div class="pizza-pagamentos-layout">
            <div class="pizza-chart-wrap">
                <svg viewBox="0 0 200 200" width="220" height="220" role="img" aria-label="Distribuicao de vendas por forma de pagamento">
                    ${setores.map(setor => `<path d="${setor.caminho}" fill="${setor.cor}"></path>`).join('')}
                    <circle cx="100" cy="100" r="43" fill="#fff"></circle>
                    <text x="100" y="95" text-anchor="middle" fill="#666" font-size="10" font-weight="600">Total</text>
                    <text x="100" y="110" text-anchor="middle" fill="#2c3e50" font-size="11" font-weight="700">${formatarMoedaBRL(total)}</text>
                </svg>
            </div>
            <div class="pizza-legenda">
                ${setores.map(setor => `
                    <div class="pizza-legenda-item">
                        <span class="pizza-legenda-cor" style="background:${setor.cor};"></span>
                        <span class="pizza-legenda-nome">${setor.nome}</span>
                        <span class="pizza-legenda-valor">${formatarMoedaBRL(setor.valor)} (${setor.percentual.toFixed(1)}%)</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function polarParaCartesiano(centroX, centroY, raio, anguloGraus) {
    const anguloRad = ((anguloGraus - 90) * Math.PI) / 180;
    return {
        x: centroX + (raio * Math.cos(anguloRad)),
        y: centroY + (raio * Math.sin(anguloRad))
    };
}

function formatarFormaPagamento(formaPagamento) {
    if (!formaPagamento) return 'Nao informado';

    return formaPagamento
        .split('_')
        .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
        .join(' ');
}

function formatarMoedaBRL(valor) {
    const numero = Number(valor) || 0;
    return `R$ ${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ==================== VARIÁVEIS DE PAGINAÇÃO PRODUTOS ERP ====================
let paginaAtualProdutosERP = 1;
const itensPorPaginaERP = 10;

/**
 * Carregar seção de produtos
 */
async function carregarProdutosSection() {
    const content = document.getElementById('produtos-content');
    content.innerHTML = '<p style="text-align: center; padding: 20px;">Carregando produtos...</p>';
    
    try {
        const response = await fetch(`${API_URL}/produtos`);
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        
        const produtos = await response.json();
        
        // Renderizar lista inline
        content.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap;">
                <!-- Filtros -->
                <input 
                    type="text" 
                    id="filtroBuscaProdutoERP" 
                    placeholder="🔍 Buscar por nome ou código..."
                    onkeyup="resetarPaginaEFiltrarProdutosERP()"
                    style="flex: 1; min-width: 300px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                
                <select id="filtroStatusProdutoERP" onchange="resetarPaginaEFiltrarProdutosERP()" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    <option value="todos">Todos os Status</option>
                    <option value="ativo" selected>Ativos</option>
                    <option value="inativo">Inativos</option>
                    <option value="com_estoque">Com Estoque</option>
                    <option value="sem_estoque">Sem Estoque</option>
                </select>
                
                <button onclick="limparFiltrosProdutosERP()" class="btn" style="background: #6c757d; color: white; padding: 12px 20px;">
                    🔄 Limpar Filtros
                </button>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <strong id="contadorProdutosERP">0 produto(s) encontrado(s)</strong>
            </div>
            
            <div id="listaProdutosERP" style="display: grid; gap: 10px;">
                <!-- Produtos serão renderizados aqui -->
            </div>
            
            <!-- Paginação -->
            <div id="paginacaoProdutosERP" style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                <!-- Controles de paginação serão renderizados aqui -->
            </div>
        `;
        
        // Armazenar produtos globalmente para filtros
        window.produtosERPCompletos = produtos;
        
        // Resetar página para 1 e aplicar filtros iniciais (mostrar apenas ativos)
        paginaAtualProdutosERP = 1;
        aplicarFiltrosProdutosERP();
        
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar produtos</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                <button onclick="carregarProdutosSection()" class="btn btn-primary" style="margin-top: 20px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

/**
 * Resetar página e aplicar filtros (chamado quando filtros mudarem)
 */
function resetarPaginaEFiltrarProdutosERP() {
    paginaAtualProdutosERP = 1;
    aplicarFiltrosProdutosERP();
}

/**
 * Aplicar filtros na lista de produtos do ERP
 */
function aplicarFiltrosProdutosERP() {
    if (!window.produtosERPCompletos) return;
    
    const busca = document.getElementById('filtroBuscaProdutoERP').value.toLowerCase();
    const status = document.getElementById('filtroStatusProdutoERP').value;
    
    let produtosFiltrados = [...window.produtosERPCompletos];
    
    // Filtro por busca
    if (busca) {
        produtosFiltrados = produtosFiltrados.filter(produto => 
            produto.nome.toLowerCase().includes(busca) ||
            produto.codigo_barras.toLowerCase().includes(busca)
        );
    }
    
    // Filtro por status
    if (status !== 'todos') {
        produtosFiltrados = produtosFiltrados.filter(produto => {
            if (status === 'ativo') return produto.ativo === 1 || produto.ativo === true;
            if (status === 'inativo') return produto.ativo === 0 || produto.ativo === false;
            if (status === 'com_estoque') return produto.estoque > 0;
            if (status === 'sem_estoque') return produto.estoque <= 0;
            return true;
        });
    }
    
    // Atualizar contador
    document.getElementById('contadorProdutosERP').textContent = `${produtosFiltrados.length} produto(s) encontrado(s)`;
    
    // Renderizar produtos COM PAGINAÇÃO
    renderizarProdutosERP(produtosFiltrados);
}

/**
 * Renderizar lista de produtos no ERP com paginação
 */
function renderizarProdutosERP(produtos) {
    const container = document.getElementById('listaProdutosERP');
    
    if (produtos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhum produto encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        document.getElementById('paginacaoProdutosERP').innerHTML = '';
        return;
    }

    // **PAGINAÇÃO: Calcular produtos da página atual**
    const totalPaginas = Math.ceil(produtos.length / itensPorPaginaERP);
    const inicio = (paginaAtualProdutosERP - 1) * itensPorPaginaERP;
    const fim = inicio + itensPorPaginaERP;
    const produtosPagina = produtos.slice(inicio, fim);
    
    container.innerHTML = produtosPagina.map(produto => {
        const estoqueColor = produto.estoque > 10 ? '#28a745' : produto.estoque > 0 ? '#ffc107' : '#dc3545';
        const estoqueBadge = produto.estoque > 0 ? `${produto.estoque} un.` : 'SEM ESTOQUE';
        const ativoColor = (produto.ativo === 1 || produto.ativo === true) ? '#28a745' : '#dc3545';
        const ativoTexto = (produto.ativo === 1 || produto.ativo === true) ? '✓ Ativo' : '✗ Inativo';
        const temDesconto = produto.desconto_percentual && produto.desconto_percentual > 0;
        
        return `
            <div onclick="editarProdutoERP(${produto.id})" style="
                background: white; 
                padding: 20px; 
                border-radius: 8px; 
                border-left: 4px solid #007bff;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.transform='translateX(4px)'" 
               onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; this.style.transform='translateX(0)'">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <strong style="font-size: 18px;">${produto.nome}</strong>
                        <span style="
                            background: ${estoqueColor}; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">${estoqueBadge}</span>
                        <span style="
                            background: ${ativoColor}; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">${ativoTexto}</span>
                        ${temDesconto ? `<span style="
                            background: #ff9800; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">-${produto.desconto_percentual}%</span>` : ''}
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        <span>🏷️ Código: ${produto.codigo_barras}</span>
                        <span style="margin-left: 20px;">💵 R$ ${parseFloat(produto.preco).toFixed(2)}</span>
                        ${temDesconto ? `<span style="margin-left: 10px; text-decoration: line-through; color: #999;">R$ ${(parseFloat(produto.preco) / (1 - produto.desconto_percentual / 100)).toFixed(2)}</span>` : ''}
                    </div>
                </div>
                <div style="color: #007bff; font-size: 24px;">✏️</div>
            </div>
        `;
    }).join('');
    
    // **RENDERIZAR CONTROLES DE PAGINAÇÃO**
    renderizarPaginacaoProdutosERP(totalPaginas, produtos);
}

/**
 * Renderizar controles de paginação para produtos ERP
 */
function renderizarPaginacaoProdutosERP(totalPaginas, produtos) {
    const paginacao = document.getElementById('paginacaoProdutosERP');
    
    if (totalPaginas <= 1) {
        paginacao.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Botão anterior
    html += `
        <button 
            onclick="event.stopPropagation(); mudarPaginaProdutosERP(${paginaAtualProdutosERP - 1})" 
            ${paginaAtualProdutosERP === 1 ? 'disabled' : ''}
            style="
                padding: 8px 16px; 
                background: ${paginaAtualProdutosERP === 1 ? '#e9ecef' : '#007bff'}; 
                color: ${paginaAtualProdutosERP === 1 ? '#6c757d' : 'white'}; 
                border: none; 
                border-radius: 6px; 
                cursor: ${paginaAtualProdutosERP === 1 ? 'not-allowed' : 'pointer'}; 
                font-weight: 600;
            ">
            ← Anterior
        </button>
    `;
    
    // Números de página (máximo 5 botões visíveis)
    const maxBotoes = 5;
    let inicio = Math.max(1, paginaAtualProdutosERP - Math.floor(maxBotoes / 2));
    let fim = Math.min(totalPaginas, inicio + maxBotoes - 1);
    
    if (fim - inicio < maxBotoes - 1) {
        inicio = Math.max(1, fim - maxBotoes + 1);
    }
    
    if (inicio > 1) {
        html += `<span style="padding: 8px; color: #666;">...</span>`;
    }
    
    for (let i = inicio; i <= fim; i++) {
        html += `
            <button 
                onclick="event.stopPropagation(); mudarPaginaProdutosERP(${i})" 
                style="
                    padding: 8px 16px; 
                    background: ${i === paginaAtualProdutosERP ? '#007bff' : 'white'}; 
                    color: ${i === paginaAtualProdutosERP ? 'white' : '#007bff'}; 
                    border: 2px solid #007bff; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    font-weight: ${i === paginaAtualProdutosERP ? '800' : '600'};
                    min-width: 45px;
                ">
                ${i}
            </button>
        `;
    }
    
    if (fim < totalPaginas) {
        html += `<span style="padding: 8px; color: #666;">...</span>`;
    }
    
    // Botão próximo
    html += `
        <button 
            onclick="event.stopPropagation(); mudarPaginaProdutosERP(${paginaAtualProdutosERP + 1})" 
            ${paginaAtualProdutosERP === totalPaginas ? 'disabled' : ''}
            style="
                padding: 8px 16px; 
                background: ${paginaAtualProdutosERP === totalPaginas ? '#e9ecef' : '#007bff'}; 
                color: ${paginaAtualProdutosERP === totalPaginas ? '#6c757d' : 'white'}; 
                border: none; 
                border-radius: 6px; 
                cursor: ${paginaAtualProdutosERP === totalPaginas ? 'not-allowed' : 'pointer'}; 
                font-weight: 600;
            ">
            Próximo →
        </button>
    `;
    
    paginacao.innerHTML = html;
}

/**
 * Mudar página de produtos ERP
 */
function mudarPaginaProdutosERP(novaPagina) {
    paginaAtualProdutosERP = novaPagina;
    aplicarFiltrosProdutosERP();
}

/**
 * Editar produto diretamente do ERP
 */
function editarProdutoERP(id) {
    // Usar função existente de produtos.js
    if (typeof abrirEdicaoProduto === 'function') {
        abrirEdicaoProduto(id);
    } else {
        mostrarNotificacao('Função de edição não disponível', 'error');
    }
}

/**
 * Limpar filtros de produtos ERP
 */
function limparFiltrosProdutosERP() {
    document.getElementById('filtroBuscaProdutoERP').value = '';
    document.getElementById('filtroStatusProdutoERP').value = 'ativo';
    paginaAtualProdutosERP = 1;
    aplicarFiltrosProdutosERP();
}

/**
 * Carregar seção de clientes
 */
async function carregarClientesSection() {
    const content = document.getElementById('clientes-content');
    content.innerHTML = '<p style="text-align: center; padding: 20px;">Carregando clientes...</p>';
    
    try {
        const response = await fetch(`${API_URL}/clientes`);
        if (!response.ok) throw new Error('Erro ao carregar clientes');
        
        const clientes = await response.json();
        
        content.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap;">
                <input 
                    type="text" 
                    id="filtroBuscaClienteERP" 
                    placeholder="🔍 Buscar por nome, CPF/CNPJ ou telefone..."
                    onkeyup="aplicarFiltrosClientesERP()"
                    style="flex: 1; min-width: 300px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                
                <select id="filtroStatusClienteERP" onchange="aplicarFiltrosClientesERP()" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    <option value="todos">Todos os Status</option>
                    <option value="ativo" selected>Ativos</option>
                    <option value="inativo">Inativos</option>
                </select>
                
                <button onclick="limparFiltrosClientesERP()" class="btn" style="background: #6c757d; color: white; padding: 12px 20px;">
                    🔄 Limpar Filtros
                </button>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <strong id="contadorClientesERP">0 cliente(s) encontrado(s)</strong>
            </div>
            
            <div id="listaClientesERP" style="display: grid; gap: 10px;">
                <!-- Clientes serão renderizados aqui -->
            </div>
        `;
        
        window.clientesERPCompletos = clientes;
        aplicarFiltrosClientesERP();
        
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar clientes</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                <button onclick="carregarClientesSection()" class="btn btn-primary" style="margin-top: 20px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function aplicarFiltrosClientesERP() {
    if (!window.clientesERPCompletos) return;
    
    const busca = document.getElementById('filtroBuscaClienteERP').value.toLowerCase();
    const status = document.getElementById('filtroStatusClienteERP').value;
    
    let clientesFiltrados = [...window.clientesERPCompletos];
    
    if (busca) {
        clientesFiltrados = clientesFiltrados.filter(cliente => 
            cliente.nome.toLowerCase().includes(busca) ||
            (cliente.cpf_cnpj && cliente.cpf_cnpj.toLowerCase().includes(busca)) ||
            (cliente.telefone && cliente.telefone.toLowerCase().includes(busca))
        );
    }
    
    if (status !== 'todos') {
        clientesFiltrados = clientesFiltrados.filter(cliente => {
            if (status === 'ativo') return cliente.ativo === 1 || cliente.ativo === true;
            if (status === 'inativo') return cliente.ativo === 0 || cliente.ativo === false;
            return true;
        });
    }
    
    document.getElementById('contadorClientesERP').textContent = `${clientesFiltrados.length} cliente(s) encontrado(s)`;
    renderizarClientesERP(clientesFiltrados);
}

function renderizarClientesERP(clientes) {
    const container = document.getElementById('listaClientesERP');
    
    if (clientes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhum cliente encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = clientes.map(cliente => {
        const ativoColor = (cliente.ativo === 1 || cliente.ativo === true) ? '#28a745' : '#dc3545';
        const ativoTexto = (cliente.ativo === 1 || cliente.ativo === true) ? '✓ Ativo' : '✗ Inativo';
        const limiteCredito = parseFloat(cliente.limite_credito) || 0;
        
        return `
            <div onclick="editarClienteERP(${cliente.id})" style="
                background: white; 
                padding: 20px; 
                border-radius: 8px; 
                border-left: 4px solid #007bff;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.transform='translateX(4px)'" 
               onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; this.style.transform='translateX(0)'">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <strong style="font-size: 18px;">${cliente.nome}</strong>
                        <span style="
                            background: ${ativoColor}; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">${ativoTexto}</span>
                        ${limiteCredito > 0 ? `<span style="
                            background: #17a2b8; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">💳 R$ ${limiteCredito.toFixed(2)}</span>` : ''}
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        ${cliente.cpf_cnpj ? `<span>📄 ${cliente.cpf_cnpj}</span>` : ''}
                        ${cliente.telefone ? `<span style="margin-left: 15px;">📞 ${cliente.telefone}</span>` : ''}
                        ${cliente.cidade && cliente.estado ? `<span style="margin-left: 15px;">📍 ${cliente.cidade}/${cliente.estado}</span>` : ''}
                    </div>
                </div>
                <div style="color: #007bff; font-size: 24px;">✏️</div>
            </div>
        `;
    }).join('');
}

function editarClienteERP(id) {
    if (typeof abrirEdicaoCliente === 'function') {
        abrirEdicaoCliente(id);
    } else {
        mostrarNotificacao('Função de edição não disponível', 'error');
    }
}

function limparFiltrosClientesERP() {
    document.getElementById('filtroBuscaClienteERP').value = '';
    document.getElementById('filtroStatusClienteERP').value = 'ativo';
    aplicarFiltrosClientesERP();
}

/**
 * Carregar seção de fornecedores
 */
async function carregarFornecedoresSection() {
    const content = document.getElementById('fornecedores-content');
    content.innerHTML = '<p style="text-align: center; padding: 20px;">Carregando fornecedores...</p>';
    
    try {
        const response = await fetch(`${API_URL}/fornecedores`);
        if (!response.ok) throw new Error('Erro ao carregar fornecedores');
        
        const fornecedores = await response.json();
        
        content.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap;">
                <input 
                    type="text" 
                    id="filtroBuscaFornecedorERP" 
                    placeholder="🔍 Buscar por nome, razão social ou CNPJ..."
                    onkeyup="aplicarFiltrosFornecedoresERP()"
                    style="flex: 1; min-width: 300px; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                
                <select id="filtroStatusFornecedorERP" onchange="aplicarFiltrosFornecedoresERP()" style="padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;">
                    <option value="todos">Todos os Status</option>
                    <option value="ativo" selected>Ativos</option>
                    <option value="inativo">Inativos</option>
                </select>
                
                <button onclick="limparFiltrosFornecedoresERP()" class="btn" style="background: #6c757d; color: white; padding: 12px 20px;">
                    🔄 Limpar Filtros
                </button>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <strong id="contadorFornecedoresERP">0 fornecedor(es) encontrado(s)</strong>
            </div>
            
            <div id="listaFornecedoresERP" style="display: grid; gap: 10px;">
                <!-- Fornecedores serão renderizados aqui -->
            </div>
        `;
        
        window.fornecedoresERPCompletos = fornecedores;
        aplicarFiltrosFornecedoresERP();
        
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar fornecedores</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                <button onclick="carregarFornecedoresSection()" class="btn btn-primary" style="margin-top: 20px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

function aplicarFiltrosFornecedoresERP() {
    if (!window.fornecedoresERPCompletos) return;
    
    const busca = document.getElementById('filtroBuscaFornecedorERP').value.toLowerCase();
    const status = document.getElementById('filtroStatusFornecedorERP').value;
    
    let fornecedoresFiltrados = [...window.fornecedoresERPCompletos];
    
    if (busca) {
        fornecedoresFiltrados = fornecedoresFiltrados.filter(fornecedor => 
            fornecedor.nome_fantasia.toLowerCase().includes(busca) ||
            (fornecedor.razao_social && fornecedor.razao_social.toLowerCase().includes(busca)) ||
            (fornecedor.cnpj && fornecedor.cnpj.toLowerCase().includes(busca))
        );
    }
    
    if (status !== 'todos') {
        fornecedoresFiltrados = fornecedoresFiltrados.filter(fornecedor => {
            if (status === 'ativo') return fornecedor.ativo === 1 || fornecedor.ativo === true;
            if (status === 'inativo') return fornecedor.ativo === 0 || fornecedor.ativo === false;
            return true;
        });
    }
    
    document.getElementById('contadorFornecedoresERP').textContent = `${fornecedoresFiltrados.length} fornecedor(es) encontrado(s)`;
    renderizarFornecedoresERP(fornecedoresFiltrados);
}

function renderizarFornecedoresERP(fornecedores) {
    const container = document.getElementById('listaFornecedoresERP');
    
    if (fornecedores.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhum fornecedor encontrado</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = fornecedores.map(fornecedor => {
        const ativoColor = (fornecedor.ativo === 1 || fornecedor.ativo === true) ? '#28a745' : '#dc3545';
        const ativoTexto = (fornecedor.ativo === 1 || fornecedor.ativo === true) ? '✓ Ativo' : '✗ Inativo';
        
        return `
            <div onclick="editarFornecedorERP(${fornecedor.id})" style="
                background: white; 
                padding: 20px; 
                border-radius: 8px; 
                border-left: 4px solid #ff9800;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.transform='translateX(4px)'" 
               onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; this.style.transform='translateX(0)'">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <strong style="font-size: 18px;">${fornecedor.nome_fantasia}</strong>
                        <span style="
                            background: ${ativoColor}; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            font-weight: bold;
                        ">${ativoTexto}</span>
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        ${fornecedor.razao_social ? `<span>🏢 ${fornecedor.razao_social}</span><br>` : ''}
                        ${fornecedor.cnpj ? `<span>📄 ${fornecedor.cnpj}</span>` : ''}
                        ${fornecedor.telefone ? `<span style="margin-left: 15px;">📞 ${fornecedor.telefone}</span>` : ''}
                        ${fornecedor.cidade && fornecedor.estado ? `<span style="margin-left: 15px;">📍 ${fornecedor.cidade}/${fornecedor.estado}</span>` : ''}
                    </div>
                </div>
                <div style="color: #ff9800; font-size: 24px;">✏️</div>
            </div>
        `;
    }).join('');
}

function editarFornecedorERP(id) {
    if (typeof abrirEdicaoFornecedor === 'function') {
        abrirEdicaoFornecedor(id);
    } else {
        mostrarNotificacao('Função de edição não disponível', 'error');
    }
}

function limparFiltrosFornecedoresERP() {
    document.getElementById('filtroBuscaFornecedorERP').value = '';
    document.getElementById('filtroStatusFornecedorERP').value = 'ativo';
    aplicarFiltrosFornecedoresERP();
}

/**
 * Carregar seção de vendas
 */
async function carregarVendasSection() {
    const content = document.getElementById('vendas-content');
    content.innerHTML = '<p style="text-align: center; padding: 20px;">Carregando vendas...</p>';
    
    try {
        // API /vendas retorna APENAS vendas válidas (não canceladas) por padrão
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
                    <option value="todos">Todos os Períodos</option>
                    <option value="hoje" selected>Hoje</option>
                    <option value="7dias">Últimos 7 dias</option>
                    <option value="30dias">Últimos 30 dias</option>
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
                <!-- Vendas serão renderizadas aqui -->
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

function aplicarFiltrosVendasERP() {
    if (!window.vendasERPCompletas) return;
    
    const busca = document.getElementById('filtroBuscaVendaERP').value.toLowerCase();
    const periodo = document.getElementById('filtroPeriodoVendaERP').value;
    
    // API retorna apenas vendas válidas (não canceladas)
    let vendasFiltradas = [...window.vendasERPCompletas];
    
    // Filtro por ID
    if (busca) {
        vendasFiltradas = vendasFiltradas.filter(venda => 
            venda.id.toString().includes(busca)
        );
    }
    
    // Filtro por período
    if (periodo !== 'todos') {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        vendasFiltradas = vendasFiltradas.filter(venda => {
            const dataVenda = new Date(venda.data_venda.replace(' ', 'T'));
            dataVenda.setHours(0, 0, 0, 0);
            
            if (periodo === 'hoje') {
                return dataVenda.getTime() === hoje.getTime();
            } else if (periodo === '7dias') {
                const seteDiasAtras = new Date(hoje);
                seteDiasAtras.setDate(hoje.getDate() - 7);
                return dataVenda >= seteDiasAtras;
            } else if (periodo === '30dias') {
                const trintaDiasAtras = new Date(hoje);
                trintaDiasAtras.setDate(hoje.getDate() - 30);
                return dataVenda >= trintaDiasAtras;
            }
            return true;
        });
    }
    
    // Calcular total
    const totalVendas = vendasFiltradas.reduce((sum, venda) => sum + parseFloat(venda.total), 0);
    
    document.getElementById('contadorVendasERP').textContent = `${vendasFiltradas.length} venda(s) encontrada(s)`;
    document.getElementById('totalVendasERP').textContent = `Total: R$ ${totalVendas.toFixed(2)}`;
    
    renderizarVendasERP(vendasFiltradas);
}

function renderizarVendasERP(vendas) {
    const container = document.getElementById('listaVendasERP');
    
    if (vendas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                <p>Nenhuma venda encontrada</p>
                <p style="font-size: 14px; margin-top: 10px;">Tente ajustar os filtros acima</p>
            </div>
        `;
        return;
    }
    
    // Ordenar vendas da mais recente para a mais antiga
    vendas.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
    
    container.innerHTML = vendas.map(venda => {
        const data = new Date(venda.data_venda.replace(' ', 'T'));
        const dataFormatada = data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
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
               onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; this.style.transform='translateX(0)'">
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
                        <span style="margin-left: 20px;">💵 Pago: R$ ${parseFloat(venda.valor_pago).toFixed(2)}</span>
                        ${parseFloat(venda.troco) > 0 ? `<span style="margin-left: 20px;">💰 Troco: R$ ${parseFloat(venda.troco).toFixed(2)}</span>` : ''}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: bold; color: #28a745;">
                        R$ ${parseFloat(venda.total).toFixed(2)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function verDetalhesVendaERP(id) {
    try {
        const response = await fetch(`${API_URL}/vendas/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar detalhes');
        
        const dados = await response.json();
        
        // Criar modal simples para mostrar detalhes
        let detalhesHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 20px auto;">
                <h2 style="margin-bottom: 20px;">📊 Detalhes da Venda #${id}</h2>
                
                <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <strong>Data:</strong> ${new Date(dados.venda.data_venda.replace(' ', 'T')).toLocaleString('pt-BR')}<br>
                    <strong>Itens:</strong> ${dados.venda.quantidade_itens}<br>
                    <strong>Total:</strong> R$ ${parseFloat(dados.venda.total).toFixed(2)}
                </div>
                
                <h3>🛒 Itens da Venda</h3>
                <div style="margin: 15px 0;">
                    ${dados.itens.map(item => `
                        <div style="padding: 10px; border-bottom: 1px solid #ddd;">
                            <strong>${item.nome_produto}</strong><br>
                            <span style="color: #666;">${item.quantidade} x R$ ${parseFloat(item.preco_unitario).toFixed(2)} = R$ ${parseFloat(item.subtotal).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                
                ${dados.formas_pagamento && dados.formas_pagamento.length > 0 ? `
                    <h3 style="margin-top: 20px;">💳 Formas de Pagamento</h3>
                    <div style="margin: 15px 0;">
                        ${dados.formas_pagamento.map(fp => {
                            const icones = { dinheiro: '💵', debito: '💳', credito: '💳', pix: '📱' };
                            const nomes = { dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pix: 'PIX' };
                            return `
                                <div style="padding: 10px; background: #f8f9fa; margin-bottom: 5px; border-radius: 4px;">
                                    ${icones[fp.forma_pagamento]} ${nomes[fp.forma_pagamento]}: <strong>R$ ${parseFloat(fp.valor).toFixed(2)}</strong>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        mostrarNotificacao('Clique para fechar', 'info');
        
        // Criar overlay temporário
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000; overflow: auto;';
        overlay.innerHTML = detalhesHTML;
        overlay.onclick = () => overlay.remove();
        document.body.appendChild(overlay);
        
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        mostrarNotificacao('Erro ao carregar detalhes da venda', 'error');
    }
}

function limparFiltrosVendasERP() {
    document.getElementById('filtroBuscaVendaERP').value = '';
    document.getElementById('filtroPeriodoVendaERP').value = 'hoje';
    aplicarFiltrosVendasERP();
}

/**
 * Carregar seção de caixa
 */
async function carregarCaixaSection() {
    // Carregar estado do caixa
    await carregarEstadoCaixa();
    
    const content = document.getElementById('caixa-content');
    
    const saldoAtual = caixaAberto 
        ? (caixaData.valorAbertura + caixaData.totalVendas + caixaData.totalReforcos - caixaData.totalSangrias)
        : 0;
    
    const statusCor = caixaAberto ? '#28a745' : '#dc3545';
    const statusTexto = caixaAberto ? '🔓 Caixa Aberto' : '🔒 Caixa Fechado';
    const statusBg = caixaAberto ? '#d4edda' : '#f8d7da';
    
    content.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
            <!-- Status do Caixa -->
            <div style="background: ${statusBg}; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; border-left: 4px solid ${statusCor};">
                <h3 style="margin: 0 0 10px 0; color: ${statusCor};">${statusTexto}</h3>
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${statusCor};">
                    Saldo Atual: R$ ${saldoAtual.toFixed(2)}
                </p>
            </div>
            
            <!-- Botões de Ação -->
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button 
                    type="button" 
                    onclick="abrirModalAberturaCaixa()" 
                    id="btnAbrirCaixaSection" 
                    class="btn btn-success" 
                    style="font-size: 18px; padding: 18px;"
                    ${caixaAberto ? 'disabled' : ''}>
                    🔓 Abrir Caixa
                </button>
                
                <button 
                    type="button" 
                    onclick="abrirModalReforcoCaixa()" 
                    id="btnReforcoCaixaSection" 
                    class="btn btn-primary" 
                    style="font-size: 18px; padding: 18px;"
                    ${!caixaAberto ? 'disabled' : ''}>
                    💵 Reforço de Caixa
                </button>
                
                <button 
                    type="button" 
                    onclick="abrirModalSangria()" 
                    id="btnSangriaSection" 
                    class="btn btn-warning" 
                    style="font-size: 18px; padding: 18px; background: #ff9800; border-color: #ff9800;"
                    ${!caixaAberto ? 'disabled' : ''}>
                    📉 Sangria
                </button>
                
                <button 
                    type="button" 
                    onclick="abrirModalFechamentoCaixa()" 
                    id="btnFecharCaixaSection" 
                    class="btn btn-danger" 
                    style="font-size: 18px; padding: 18px;"
                    ${!caixaAberto ? 'disabled' : ''}>
                    🔒 Fechar Caixa
                </button>
                
                <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
                
                <button 
                    type="button" 
                    onclick="abrirHistoricoFechamentos()" 
                    class="btn btn-info" 
                    style="font-size: 18px; padding: 18px; background: #6c757d; border-color: #6c757d;">
                    📊 Histórico de Fechamentos
                </button>
            </div>
        </div>
    `;
}

/**
 * Verificar conexão com servidor
 */
async function verificarConexaoERP() {
    try {
        const response = await fetch(`${API_URL}/health`);
        serverOnline = response.ok;
        
        const badge = document.getElementById('statusBadge');
        if (serverOnline) {
            badge.className = 'status-badge online';
            badge.textContent = '● Online';
        } else {
            badge.className = 'status-badge offline';
            badge.textContent = '● Offline';
        }
    } catch (error) {
        serverOnline = false;
        const badge = document.getElementById('statusBadge');
        badge.className = 'status-badge offline';
        badge.textContent = '● Servidor Offline';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ ERP Dashboard carregado');
    verificarConexaoERP(); // Verifica apenas uma vez no carregamento
    carregarDashboard();
    
    // Inicializar controle financeiro após os modais carregarem
    document.addEventListener('modalsLoaded', inicializarControleFinanceiro);
});

// ==================== CONTROLE FINANCEIRO - SALDOS ====================

/**
 * Inicializa o controle financeiro (popular seletor de meses e carregar mês atual)
 */
function inicializarControleFinanceiro() {
    populateSelectorMeses();
    
    // Carregar mês atual ao abrir seção de financeiro
    const financeiroSection = document.getElementById('financeiro-section');
    if (financeiroSection) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    carregarSaldosMes();
                    carregarDividasFuturas();
                }
            });
        });
        observer.observe(financeiroSection, { attributes: true, attributeFilter: ['class'] });
    }
    
    console.log('✅ Controle Financeiro inicializado');
}

/**
 * Popular o seletor de meses com últimos 12 meses
 */
function populateSelectorMeses() {
    const selector = document.getElementById('selectorMesFinanceiro');
    if (!selector) return;
    
    const hoje = new Date();
    const meses = [];
    
    // Gerar últimos 12 meses
    for (let i = 0; i < 12; i++) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const mesAno = `${ano}-${mes}`;
        
        // Nome do mês
        const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const nomeMes = nomesMeses[data.getMonth()];
        
        meses.push({
            valor: mesAno,
            texto: `${nomeMes} ${ano}`
        });
    }
    
    // Popular dropdown
    selector.innerHTML = meses.map(m => 
        `<option value="${m.valor}">${m.texto}</option>`
    ).join('');
}

/**
 * Mostrar/ocultar campos de data personalizada
 */
function toggleCamposDataPersonalizada() {
    const filtroPeriodo = document.getElementById('filtroPeriodoDividas')?.value;
    const campos = document.getElementById('camposDataPersonalizada');
    
    if (campos) {
        if (filtroPeriodo === 'personalizado') {
            campos.style.display = 'block';
            
            // Preencher com período padrão (hoje até +30 dias)
            const hoje = new Date();
            const daqui30Dias = new Date();
            daqui30Dias.setDate(hoje.getDate() + 30);
            
            const dataInicialInput = document.getElementById('dataInicialDividas');
            const dataFinalInput = document.getElementById('dataFinalDividas');
            
            if (dataInicialInput && !dataInicialInput.value) {
                dataInicialInput.value = hoje.toISOString().split('T')[0];
            }
            if (dataFinalInput && !dataFinalInput.value) {
                dataFinalInput.value = daqui30Dias.toISOString().split('T')[0];
            }
        } else {
            campos.style.display = 'none';
        }
    }
}

/**
 * Aplicar filtro de período personalizado
 */
function aplicarPeriodoPersonalizado() {
    const dataInicial = document.getElementById('dataInicialDividas')?.value;
    const dataFinal = document.getElementById('dataFinalDividas')?.value;
    
    if (!dataInicial || !dataFinal) {
        mostrarNotificacao('⚠️ Selecione as duas datas!', 'error');
        return;
    }
    
    if (new Date(dataInicial) > new Date(dataFinal)) {
        mostrarNotificacao('⚠️ Data inicial não pode ser maior que data final!', 'error');
        return;
    }
    
    carregarDividasFuturas();
}

/**
 * Carregar dívidas futuras (contas pendentes) com filtro de período
 */
async function carregarDividasFuturas() {
    try {
        // Obter período selecionado
        const filtroPeriodo = document.getElementById('filtroPeriodoDividas')?.value || 'todos';
        
        // Construir URL com query params
        let url = `${API_URL}/contas-pagar/dividas-futuras`;
        
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        
        if (filtroPeriodo === 'mes_atual') {
            // Filtrar por mês atual (ex: 2026-01)
            url += `?mes=${anoAtual}-${mesAtual}`;
        } else if (filtroPeriodo === 'proximo_mes') {
            // Filtrar por próximo mês
            const proximoMes = hoje.getMonth() === 11 ? 1 : hoje.getMonth() + 2;
            const proximoAno = hoje.getMonth() === 11 ? anoAtual + 1 : anoAtual;
            url += `?mes=${proximoAno}-${String(proximoMes).padStart(2, '0')}`;
        } else if (filtroPeriodo === '3_meses') {
            // Filtrar próximos 3 meses (range de datas)
            const dataInicial = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            const dataFinal = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 0);
            const dataInicialStr = dataInicial.toISOString().split('T')[0];
            const dataFinalStr = dataFinal.toISOString().split('T')[0];
            url += `?data_inicial=${dataInicialStr}&data_final=${dataFinalStr}`;
        } else if (filtroPeriodo === 'personalizado') {
            // Usar datas personalizadas dos inputs
            const dataInicial = document.getElementById('dataInicialDividas')?.value;
            const dataFinal = document.getElementById('dataFinalDividas')?.value;
            
            if (dataInicial && dataFinal) {
                url += `?data_inicial=${dataInicial}&data_final=${dataFinal}`;
            }
        }
        // Se filtroPeriodo === 'todos', não adiciona query params (busca tudo)
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar dívidas futuras');
        }
        
        const data = await response.json();
        
        if (data.success) {
            const dividasReposicaoEl = document.getElementById('dividasReposicao');
            const dividasLucroEl = document.getElementById('dividasLucro');
            const labelPeriodoEl = document.getElementById('labelPeriodoDividas');
            
            if (dividasReposicaoEl) {
                dividasReposicaoEl.textContent = `R$ ${formatarMoedaSaldo(data.dividas.reposicao)}`;
            }
            
            if (dividasLucroEl) {
                dividasLucroEl.textContent = `R$ ${formatarMoedaSaldo(data.dividas.lucro)}`;
            }
            
            // Atualizar label com período filtrado
            if (labelPeriodoEl && data.filtro) {
                labelPeriodoEl.textContent = `(${data.filtro})`;
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar dívidas futuras:', error);
    }
}

/**
 * Carregar saldos do mês selecionado
 */
async function carregarSaldosMes() {
    const selector = document.getElementById('selectorMesFinanceiro');
    if (!selector || !selector.value) return;
    
    const [ano, mes] = selector.value.split('-');
    
    try {
        const response = await fetch(`${API_URL}/contas-pagar/saldos-mes/${ano}/${mes}`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar saldos');
        }
        
        const data = await response.json();
        
        // DEBUG: Verificar resposta da API
        console.log('📊 Resposta da API saldos-mes:', data);
        
        // Validar estrutura de dados (proteção contra undefined)
        // A API retorna os dados dentro de data.saldos
        const reposicao = data.saldos?.reposicao || { bruta: 0, disponivel: 0, negativo: false };
        const lucro = data.saldos?.lucro || { bruta: 0, disponivel: 0, negativo: false };
        
        console.log('💰 Reposição processada:', reposicao);
        console.log('💵 Lucro processado:', lucro);
        
        // Atualizar cards de saldos
        document.getElementById('saldoReposicaoBruta').textContent = 
            `R$ ${formatarMoedaSaldo(reposicao.bruta)}`;
        
        document.getElementById('saldoReposicaoDisponivel').textContent = 
            `R$ ${formatarMoedaSaldo(reposicao.disponivel)}`;
        
        document.getElementById('saldoLucroBruto').textContent = 
            `R$ ${formatarMoedaSaldo(lucro.bruta)}`;
        
        document.getElementById('saldoLucroDisponivel').textContent = 
            `R$ ${formatarMoedaSaldo(lucro.disponivel)}`;
        
        // Exibir alertas se houver saldos negativos
        exibirAlertasSaldosNegativos({ reposicao, lucro });
        
    } catch (error) {
        console.error('Erro ao carregar saldos:', error);
        mostrarNotificacao('❌ Erro ao carregar saldos do mês', 'error');
    }
}

/**
 * Exibir alertas de saldos negativos
 */
function exibirAlertasSaldosNegativos(data) {
    const alertaDiv = document.getElementById('alertasSaldosNegativos');
    if (!alertaDiv) return;
    
    const alertas = [];
    
    if (data.reposicao.negativo) {
        alertas.push('🚨 <strong>Reposição Negativa:</strong> Você gastou mais do que tinha disponível para reposição!');
    }
    
    if (data.lucro.negativo) {
        alertas.push('🚨 <strong>Lucro Negativo:</strong> Você gastou mais do que tinha disponível em lucro!');
    }
    
    if (alertas.length > 0) {
        alertaDiv.style.display = 'block';
        alertaDiv.innerHTML = `
            <div style="background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px; padding: 15px; color: #721c24;">
                <h4 style="margin: 0 0 10px 0;">⚠️ Atenção: Saldos Negativos Detectados!</h4>
                ${alertas.map(a => `<p style="margin: 5px 0;">${a}</p>`).join('')}
                <p style="margin-top: 10px; font-size: 13px; opacity: 0.8;">
                    💡 Recomenda-se ajustar os saldos iniciais ou revisar os pagamentos do mês.
                </p>
            </div>
        `;
    } else {
        alertaDiv.style.display = 'none';
    }
}

/**
 * Formatar valor como moeda
 */
function formatarMoedaSaldo(valor) {
    const numero = parseFloat(valor);
    
    if (isNaN(numero)) return '0,00';
    
    const formatado = Math.abs(numero).toFixed(2).replace('.', ',');
    
    // Se negativo, adicionar sinal
    return numero < 0 ? `(${formatado})` : formatado;
}

/**
 * Abrir modal de configuração de saldo inicial
 */
async function abrirModalConfigurarSaldoInicial() {
    const selector = document.getElementById('selectorMesFinanceiro');
    const mesAtual = selector ? selector.value : '';
    
    // Preencher mês atual no formulário
    const mesInput = document.getElementById('mesReferenciaConfig');
    if (mesInput && mesAtual) {
        mesInput.value = mesAtual;
    }
    
    const saldoLucroInput = document.getElementById('saldoLucroConfig');
    const observacoesInput = document.getElementById('observacoesConfig');
    
    // Aplicar formatação de moeda no input de lucro
    if (saldoLucroInput && !saldoLucroInput.getValorDecimal) {
        aplicarFormatacaoMoeda(saldoLucroInput);
    }
    
    // Buscar saldo inicial existente para o mês selecionado
    try {
        const response = await fetch(`${API_URL}/contas-pagar/saldos-iniciais`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.saldos) {
                // Procurar saldo do mês atual (formato YYYY-MM-01)
                const mesFormatado = mesAtual + '-01';
                const saldoExistente = data.saldos.find(s => s.mes_ano === mesFormatado);
                
                if (saldoExistente) {
                    // Preencher campos com valores existentes
                    if (saldoLucroInput && saldoLucroInput.setValorDecimal) {
                        saldoLucroInput.setValorDecimal(parseFloat(saldoExistente.saldo_lucro) || 0);
                    } else if (saldoLucroInput) {
                        saldoLucroInput.value = (parseFloat(saldoExistente.saldo_lucro) || 0).toFixed(2).replace('.', ',');
                    }
                    
                    if (observacoesInput) {
                        observacoesInput.value = saldoExistente.observacoes || '';
                    }
                } else {
                    // Limpar campos se não houver saldo configurado
                    if (saldoLucroInput) {
                        if (saldoLucroInput.resetarValor) {
                            saldoLucroInput.resetarValor();
                        } else {
                            saldoLucroInput.value = '0,00';
                        }
                    }
                    if (observacoesInput) observacoesInput.value = '';
                }
            }
        }
    } catch (error) {
        console.error('Erro ao buscar saldo inicial:', error);
        // Em caso de erro, inicializar com zero
        if (saldoLucroInput) {
            if (saldoLucroInput.resetarValor) {
                saldoLucroInput.resetarValor();
            } else {
                saldoLucroInput.value = '0,00';
            }
        }
        if (observacoesInput) observacoesInput.value = '';
    }
    
    abrirModal('configurarSaldoInicialModal', () => {
        if (saldoLucroInput) {
            saldoLucroInput.focus();
        }
    });
}

/**
 * Fechar mês atual e transferir saldos para próximo mês
 */
async function fecharMesAtual() {
    const selector = document.getElementById('selectorMesFinanceiro');
    const mesAtual = selector ? selector.value : '';
    
    if (!mesAtual) {
        mostrarNotificacao('⚠️ Selecione o mês a ser fechado', 'error');
        return;
    }
    
    const [ano, mes] = mesAtual.split('-');
    
    // Calcular próximo mês para exibição
    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);
    const proximoMes = mesNum === 12 ? 1 : mesNum + 1;
    const proximoAno = mesNum === 12 ? anoNum + 1 : anoNum;
    
    const nomesMeses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const confirmacao = confirm(
        `🔒 FECHAR MÊS\n\n` +
        `Deseja fechar ${nomesMeses[mesNum]}/${anoNum}?\n\n` +
        `Os saldos disponíveis serão transferidos automaticamente para ${nomesMeses[proximoMes]}/${proximoAno}.\n\n` +
        `Esta ação criará/atualizará o saldo inicial do próximo mês.`
    );
    
    if (!confirmacao) return;
    
    try {
        const response = await fetch(`${API_URL}/contas-pagar/fechar-mes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ano: anoNum,
                mes: mesNum,
                forcar: false
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erro ao fechar mês');
        }
        
        // Exibir resumo do fechamento
        const saldos = result.dados.saldos_transferidos;
        alert(
            `✅ MÊS FECHADO COM SUCESSO!\n\n` +
            `📅 Mês fechado: ${nomesMeses[mesNum]}/${anoNum}\n\n` +
            `💰 Saldos transferidos para ${nomesMeses[proximoMes]}/${proximoAno}:\n` +
            `   💵 Reposição: R$ ${saldos.reposicao.toFixed(2)}\n` +
            `   💰 Lucro: R$ ${saldos.lucro.toFixed(2)}`
        );
        
        mostrarNotificacao('✅ Mês fechado e saldos transferidos com sucesso!', 'success');
        
        // Atualizar para próximo mês automaticamente
        const proximoMesFormatado = `${proximoAno}-${String(proximoMes).padStart(2, '0')}`;
        selector.value = proximoMesFormatado;
        carregarSaldosMes();
        
    } catch (error) {
        console.error('Erro ao fechar mês:', error);
        mostrarNotificacao(`❌ ${error.message}`, 'error');
    }
}

/**
 * Fechar mês atual e transferir saldos para próximo mês
 */
async function fecharMesAtual() {
    const selector = document.getElementById('selectorMesFinanceiro');
    const mesAtual = selector ? selector.value : '';
    
    if (!mesAtual) {
        mostrarNotificacao('⚠️ Selecione o mês a ser fechado', 'error');
        return;
    }
    
    const [ano, mes] = mesAtual.split('-');
    
    // Calcular próximo mês para exibição
    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);
    const proximoMes = mesNum === 12 ? 1 : mesNum + 1;
    const proximoAno = mesNum === 12 ? anoNum + 1 : anoNum;
    
    const nomesMeses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const confirmacao = confirm(
        `🔒 FECHAR MÊS\n\n` +
        `Deseja fechar ${nomesMeses[mesNum]}/${anoNum}?\n\n` +
        `Os saldos disponíveis serão transferidos automaticamente para ${nomesMeses[proximoMes]}/${proximoAno}.\n\n` +
        `Esta ação criará/atualizará o saldo inicial do próximo mês.`
    );
    
    if (!confirmacao) return;
    
    try {
        const response = await fetch(`${API_URL}/contas-pagar/fechar-mes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ano: anoNum,
                mes: mesNum,
                forcar: false
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erro ao fechar mês');
        }
        
        // Exibir resumo do fechamento
        const saldos = result.dados.saldos_transferidos;
        alert(
            `✅ MÊS FECHADO COM SUCESSO!\n\n` +
            `📅 Mês fechado: ${nomesMeses[mesNum]}/${anoNum}\n\n` +
            `💰 Saldos transferidos para ${nomesMeses[proximoMes]}/${proximoAno}:\n` +
            `   💵 Reposição: R$ ${saldos.reposicao.toFixed(2)}\n` +
            `   💰 Lucro: R$ ${saldos.lucro.toFixed(2)}`
        );
        
        mostrarNotificacao('✅ Mês fechado e saldos transferidos com sucesso!', 'success');
        
        // Atualizar para próximo mês automaticamente
        const proximoMesFormatado = `${proximoAno}-${String(proximoMes).padStart(2, '0')}`;
        selector.value = proximoMesFormatado;
        carregarSaldosMes();
        
    } catch (error) {
        console.error('Erro ao fechar mês:', error);
        mostrarNotificacao(`❌ ${error.message}`, 'error');
    }
}

/**
 * Salvar configuração de saldo inicial
 */
async function salvarConfiguracaoSaldoInicial(event) {
    event.preventDefault();
    
    const mesReferencia = document.getElementById('mesReferenciaConfig').value;
    const saldoLucroInput = document.getElementById('saldoLucroConfig');
    const observacoes = document.getElementById('observacoesConfig').value.trim();
    
    const saldoLucro = saldoLucroInput.getValorDecimal 
        ? saldoLucroInput.getValorDecimal() 
        : parseFloat(saldoLucroInput.value.replace(',', '.')) || 0;
    
    if (saldoLucro < 0) {
        mostrarNotificacao('⚠️ O saldo de lucro não pode ser negativo', 'error');
        return;
    }
    
    // Converter formato YYYY-MM para YYYY-MM-01 (backend espera dia 01)
    const mesAnoFormatado = mesReferencia + '-01';
    
    try {
        const response = await fetch(`${API_URL}/contas-pagar/saldos-iniciais`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mes_ano: mesAnoFormatado,
                saldo_reposicao: 0, // Não usado mais, calculado automaticamente
                saldo_lucro: saldoLucro,
                observacoes: observacoes || null
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erro ao salvar configuração');
        }
        
        mostrarNotificacao('✅ Saldo inicial de lucro configurado com sucesso!', 'success');
        
        fecharModal('configurarSaldoInicialModal');
        
        // Atualizar seletor e carregar saldos
        const selector = document.getElementById('selectorMesFinanceiro');
        if (selector) {
            selector.value = mesReferencia;
        }
        
        carregarSaldosMes();
        
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        mostrarNotificacao(`❌ ${error.message}`, 'error');
    }
}

// Função auxiliar para abrir histórico de vendas

