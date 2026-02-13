const API_URL = window.API_URL;

/**
 * Carregar dados do Dashboard
 */
export async function carregarDashboard() {
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
            carregarGraficoEvolucaoVendas(vendas)
        ]);
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

/**
 * Carregar estatisticas gerais
 */
export async function carregarEstatisticasGerais({ vendas = null, produtos = null, caixa = null } = {}) {
    try {
        // Vendas de hoje - API retorna apenas vendas NAO CANCELADAS por padrao
        if (!vendas) {
            const vendasResponse = await fetch(`${API_URL}/vendas`);
            vendas = vendasResponse.ok ? await vendasResponse.json() : [];
        }

        const hoje = new Date().toLocaleDateString('pt-BR');
        // Filtro de vendas de hoje (API ja exclui canceladas automaticamente)
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
            if (statusElement) statusElement.textContent = '⚠️ Erro de conexao';
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
            // Incluir: estoque zerado OU estoque menor/igual ao minimo (se minimo > 0)
            return estoque === 0 || (estoqueMinimo > 0 && estoque <= estoqueMinimo);
        });
        document.getElementById('totalAlertas').textContent = produtosEstoqueBaixo.length;
    } catch (error) {
        console.error('Erro ao carregar estatisticas:', error);
    }
}

/**
 * Carregar vendas recentes
 */
export async function carregarVendasRecentes(vendas = null) {
    try {
        if (!vendas) {
            const response = await fetch(`${API_URL}/vendas`);
            if (!response.ok) return;

            // API ja retorna apenas vendas nao canceladas por padrao
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
export async function carregarProdutosEstoqueBaixo(produtos = null) {
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
                // Incluir: estoque zerado OU estoque menor/igual ao minimo (se minimo > 0)
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
                statusText = 'Critico';
                statusColor = '#dc3545';
            }

            return `
                <div class="produto-item">
                    <div>
                        <strong>${produto.nome}</strong>
                        <br>
                        <small>Codigo: ${produto.codigo_barras} | Min: ${estoqueMinimo}</small>
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
export async function carregarGraficoEvolucaoVendas(vendas = null) {
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
