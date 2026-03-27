// ==================== PROJEÇÃO FINANCEIRA ====================
// Módulo de projeção de receitas e lucro baseado em histórico de vendas

let _projecaoDadosHistorico = null;

// ---------- Abertura / Reset ----------

function abrirProjecaoFinanceira() {
    abrirModal('projecaoFinanceiraModal');
    _projecaoDadosHistorico = null;
    document.getElementById('projecaoResultado').style.display = 'none';
    document.getElementById('projecaoSemaforo').style.display = 'none';
    document.getElementById('projecaoEstadoVazio').style.display = '';
    document.getElementById('projecaoEstadoVazio').innerHTML = `
        <div style="font-size: 72px; margin-bottom: 20px;">📈</div>
        <p style="font-size: 16px; margin-bottom: 8px; color: #666;">
            Configure os parâmetros acima e clique em <strong>Calcular Projeção</strong>
        </p>
        <p style="font-size: 14px;">
            O sistema analisará o histórico de vendas e estimará a entrada de caixa para o período informado
        </p>`;
}

// ---------- Slider de margem ----------

function atualizarLabelMargem(valor) {
    document.getElementById('projecaoMargemLabel').textContent = ' ' + valor + '%';
    // Recalcular resultados sem nova chamada à API quando já há dados
    if (_projecaoDadosHistorico) {
        _renderizarResultados(_projecaoDadosHistorico);
    }
}

// ---------- Calcular (chama API) ----------

async function calcularProjecao() {
    const diasRef = parseInt(document.getElementById('projecaoDiasReferencia').value) || 30;
    const btn = document.getElementById('btnCalcularProjecao');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '⏳ Calculando...';
    btn.disabled = true;

    try {
        const response = await fetch(`${window.API_URL}/projecao/historico?dias_referencia=${diasRef}`);
        const data = await response.json();

        if (!data.success) {
            mostrarNotificacao(data.message || 'Erro ao carregar dados históricos', 'error');
            return;
        }

        _projecaoDadosHistorico = data;
        _renderizarResultados(data);

    } catch (error) {
        mostrarNotificacao('Erro ao conectar com o servidor', 'error');
        console.error('Erro na projeção:', error);
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// ---------- Renderizar resultados (client-side) ----------

function _renderizarResultados(data) {
    const diasFuturos   = Math.max(1, parseInt(document.getElementById('projecaoDiasFuturos').value) || 7);
    const margemPct     = parseInt(document.getElementById('projecaoMargemSlider').value) || 0;
    const obrigacaoStr  = document.getElementById('projecaoValorObrigacao').value;
    const valorObrigacao = _parseMoedaProj(obrigacaoStr);

    const dias    = data.dias    || [];
    const resumo  = data.resumo;
    const diasRef = resumo.total_dias_referencia;

    // Sem dados históricos
    if (dias.length === 0) {
        document.getElementById('projecaoEstadoVazio').style.display = '';
        document.getElementById('projecaoEstadoVazio').innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">📭</div>
            <p style="font-size: 16px; color: #666;">Nenhuma venda encontrada no período histórico selecionado.</p>
            <p style="font-size: 14px; color: #999;">Tente um período maior ou verifique se há vendas registradas.</p>`;
        document.getElementById('projecaoResultado').style.display = 'none';
        return;
    }

    document.getElementById('projecaoEstadoVazio').style.display = 'none';
    document.getElementById('projecaoResultado').style.display = '';

    // --- Estatísticas históricas ---
    const receitaTotal = parseFloat(resumo.receita_total);
    const custoTotal   = parseFloat(resumo.custo_total);
    const lucroTotal   = receitaTotal - custoTotal;

    const mediaDiariaReceita = receitaTotal / diasRef;
    const mediaDiariaCusto   = custoTotal   / diasRef;
    const mediaDiariaLucro   = lucroTotal   / diasRef;
    const margemHistorica    = receitaTotal > 0 ? (lucroTotal / receitaTotal) * 100 : 0;

    // Desvio padrão (inclui dias sem venda como R$0 — mais conservador)
    const valoresDiarios = dias.map(d => parseFloat(d.receita_bruta));
    const diasSemVenda   = diasRef - dias.length;
    for (let i = 0; i < diasSemVenda; i++) valoresDiarios.push(0);
    const variancia    = valoresDiarios.reduce((s, v) => s + Math.pow(v - mediaDiariaReceita, 2), 0) / diasRef;
    const desvioPadrao = Math.sqrt(variancia);

    // --- Projeções ---
    const fatorMargem  = 1 - margemPct / 100;
    const receitaRealista     = mediaDiariaReceita * diasFuturos * fatorMargem;
    const custoRealista       = mediaDiariaCusto   * diasFuturos * fatorMargem; // reposição projetada
    const lucroRealista       = mediaDiariaLucro   * diasFuturos * fatorMargem; // lucro na mão
    const receitaPessimista   = Math.max(0, (mediaDiariaReceita - desvioPadrao) * diasFuturos * fatorMargem);
    const custoPessimista     = Math.max(0, (mediaDiariaCusto   - (desvioPadrao * (mediaDiariaCusto / (mediaDiariaReceita || 1)))) * diasFuturos * fatorMargem);
    const lucroPessimista     = Math.max(0, receitaPessimista - custoPessimista);
    const receitaOtimista     = (mediaDiariaReceita + desvioPadrao) * diasFuturos;
    const custoOtimista       = mediaDiariaCusto   * diasFuturos;               // sem bônus de desvio no custo
    const lucroOtimista       = receitaOtimista - custoOtimista;

    // --- Barra de distribuição ---
    const pctReposicao = receitaRealista > 0 ? (custoRealista  / receitaRealista * 100) : 50;
    const pctLucro     = receitaRealista > 0 ? (lucroRealista  / receitaRealista * 100) : 50;
    document.getElementById('projecaoBarraReposicao').style.width = pctReposicao.toFixed(1) + '%';
    document.getElementById('projecaoBarraLucro').style.width     = pctLucro.toFixed(1)     + '%';
    document.getElementById('projecaoBarraReposicaoPct').textContent = `${_fmtBR(custoRealista)} (${pctReposicao.toFixed(0)}%)`;
    document.getElementById('projecaoBarraLucroPct').textContent     = `${_fmtBR(lucroRealista)} (${pctLucro.toFixed(0)}%)`;

    // --- Preenchimento dos cards ---
    document.getElementById('projecaoReceita').textContent         = _fmtBR(receitaRealista);
    document.getElementById('projecaoReceitaInfo').textContent     = `Com ${margemPct}% de margem de segurança`;
    document.getElementById('projecaoReposicao').textContent       = _fmtBR(custoRealista);
    document.getElementById('projecaoReposicaoInfo').textContent   = `${pctReposicao.toFixed(0)}% da receita — custo mercadoria`;
    document.getElementById('projecaoLucro').textContent           = _fmtBR(lucroRealista);
    document.getElementById('projecaoMargemHistorica').textContent = `Margem histórica: ${margemHistorica.toFixed(1)}%`;
    document.getElementById('projecaoMediaDia').textContent        = _fmtBR(mediaDiariaReceita);
    document.getElementById('projecaoBaseDias').textContent        = `${diasRef} dias analisados (${dias.length} com vendas)`;
    document.getElementById('projecaoCenarioDias').textContent     = diasFuturos;

    // --- Cenários (mostra o budget selecionado no semáforo) ---
    const origemBoleto  = document.getElementById('projecaoOrigemBoleto')?.value || 'total';
    const projecaoSelecionada = {
        realista:   origemBoleto === 'reposicao' ? custoRealista   : origemBoleto === 'lucro' ? lucroRealista   : receitaRealista,
        pessimista: origemBoleto === 'reposicao' ? custoPessimista : origemBoleto === 'lucro' ? lucroPessimista : receitaPessimista,
        otimista:   origemBoleto === 'reposicao' ? custoOtimista   : origemBoleto === 'lucro' ? lucroOtimista   : receitaOtimista,
    };

    document.getElementById('projecaoPessimista').textContent = _fmtBR(projecaoSelecionada.pessimista);
    document.getElementById('projecaoRealista').textContent   = _fmtBR(projecaoSelecionada.realista);
    document.getElementById('projecaoOtimista').textContent   = _fmtBR(projecaoSelecionada.otimista);

    // --- Semáforo ---
    if (valorObrigacao > 0) {
        _renderizarSemaforo(projecaoSelecionada.realista, projecaoSelecionada.pessimista, valorObrigacao, origemBoleto);
    } else {
        document.getElementById('projecaoSemaforo').style.display = 'none';
    }

    // --- Gráfico ---
    _renderizarGrafico(dias, mediaDiariaReceita, diasFuturos, fatorMargem);

    // --- Tabela ---
    _renderizarTabela(dias, receitaTotal, custoTotal, lucroTotal);
}

// ---------- Semáforo de decisão ----------

function _renderizarSemaforo(projecaoRealista, projecaoPessimista, valorObrigacao, origemBoleto) {
    const el = document.getElementById('projecaoSemaforo');
    el.style.display = '';

    const labels = {
        reposicao: 'Reposição Projetada',
        lucro:     'Lucro na Mão Projetado',
        total:     'Receita Total Projetada'
    };
    const labelBudget = labels[origemBoleto] || labels.total;

    let icone, titulo, detalhe, bg;

    if (projecaoPessimista >= valorObrigacao) {
        icone  = '🟢';
        titulo = 'Pode comprar com segurança!';
        detalhe = `Mesmo no cenário pessimista, o ${labelBudget} (${_fmtBR(projecaoPessimista)}) cobre a obrigação de ${_fmtBR(valorObrigacao)}.`;
        bg = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
    } else if (projecaoRealista >= valorObrigacao) {
        icone  = '🟡';
        titulo = 'Atenção — margem apertada';
        detalhe = `A projeção realista do ${labelBudget} (${_fmtBR(projecaoRealista)}) cobre o boleto de ${_fmtBR(valorObrigacao)}, mas o cenário pessimista não cobre. Compre com cautela.`;
        bg = 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)';
    } else {
        icone  = '🔴';
        titulo = 'Risco alto — aguarde mais receita';
        detalhe = `A projeção realista do ${labelBudget} (${_fmtBR(projecaoRealista)}) é insuficiente para cobrir a obrigação de ${_fmtBR(valorObrigacao)}. Considere adiar a compra ou reduzir o valor.`;
        bg = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
    }

    el.style.background = bg;
    el.style.color = 'white';
    document.getElementById('projecaoSemaforoIcone').textContent  = icone;
    document.getElementById('projecaoSemaforoTitulo').textContent = titulo;
    document.getElementById('projecaoSemaforoDetalhe').textContent = detalhe;
}

// ---------- Gráfico SVG ----------

function _renderizarGrafico(dias, mediaDiaria, diasFuturos, fatorMargem) {
    const container = document.getElementById('projecaoGrafico');

    const totalBarras = dias.length + diasFuturos;
    const larguraSVG  = Math.max(600, totalBarras * 42 + 100);
    const alturaSVG   = 220;
    const mg = { top: 20, right: 20, bottom: 40, left: 72 };
    const w  = larguraSVG - mg.left - mg.right;
    const h  = alturaSVG  - mg.top  - mg.bottom;

    const maxVal    = Math.max(...dias.map(d => parseFloat(d.receita_bruta)), mediaDiaria * 1.5, 1);
    const escY      = h / maxVal;
    const largBarra = Math.min(32, w / totalBarras - 4);
    const passoX    = w / totalBarras;

    // Labels eixo Y + linhas de grade
    let labelsY = '';
    for (let i = 0; i <= 4; i++) {
        const val = (maxVal / 4) * i;
        const y   = mg.top + h - val * escY;
        labelsY += `
            <line x1="${mg.left}" y1="${y}" x2="${mg.left + w}" y2="${y}" stroke="#eee" stroke-width="1"/>
            <text x="${mg.left - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#999">
                ${_fmtBR(val).replace('R$ ', 'R$')}
            </text>`;
    }

    // Barras históricas
    let barrasHist = '';
    dias.forEach((dia, i) => {
        const receita = parseFloat(dia.receita_bruta);
        const altBarra = Math.max(1, receita * escY);
        const x = mg.left + i * passoX + (passoX - largBarra) / 2;
        const y = mg.top + h - altBarra;
        const label = String(dia.data).substring(5); // MM-DD
        barrasHist += `
            <rect x="${x}" y="${y}" width="${largBarra}" height="${altBarra}"
                  fill="#667eea" rx="2" opacity="0.85">
                <title>${label}: ${_fmtBR(receita)}</title>
            </rect>
            <text x="${x + largBarra / 2}" y="${mg.top + h + 14}"
                  text-anchor="middle" font-size="9" fill="#666">${label}</text>`;
    });

    // Barras de projeção
    let barrasProj = '';
    for (let i = 0; i < diasFuturos; i++) {
        const receita  = mediaDiaria * fatorMargem;
        const altBarra = Math.max(1, receita * escY);
        const idx = dias.length + i;
        const x = mg.left + idx * passoX + (passoX - largBarra) / 2;
        const y = mg.top + h - altBarra;
        barrasProj += `
            <rect x="${x}" y="${y}" width="${largBarra}" height="${altBarra}"
                  fill="#43e97b" rx="2" opacity="0.75">
                <title>Dia +${i + 1} (proj.): ${_fmtBR(receita)}</title>
            </rect>
            <text x="${x + largBarra / 2}" y="${mg.top + h + 14}"
                  text-anchor="middle" font-size="9" fill="#28a745">+${i + 1}</text>`;
    }

    // Linha de média
    const yMedia = mg.top + h - mediaDiaria * escY;

    // Separador histórico | projeção
    const xSep = mg.left + dias.length * passoX;

    container.innerHTML = `
        <svg width="${larguraSVG}" height="${alturaSVG}" style="display: block;">
            ${labelsY}
            <!-- Separador -->
            <line x1="${xSep}" y1="${mg.top}" x2="${xSep}" y2="${mg.top + h}"
                  stroke="#bbb" stroke-width="1.5" stroke-dasharray="6,3"/>
            <text x="${xSep - 6}" y="${mg.top + 12}" text-anchor="end" font-size="10" fill="#999">← Histórico</text>
            <text x="${xSep + 6}" y="${mg.top + 12}" text-anchor="start" font-size="10" fill="#28a745">Projeção →</text>
            <!-- Barras -->
            ${barrasHist}
            ${barrasProj}
            <!-- Linha de média -->
            <line x1="${mg.left}" y1="${yMedia}" x2="${mg.left + w}" y2="${yMedia}"
                  stroke="#ff6b6b" stroke-width="1.5" stroke-dasharray="5,3"/>
            <!-- Eixos -->
            <line x1="${mg.left}" y1="${mg.top}" x2="${mg.left}" y2="${mg.top + h}" stroke="#ccc" stroke-width="1"/>
            <line x1="${mg.left}" y1="${mg.top + h}" x2="${mg.left + w}" y2="${mg.top + h}" stroke="#ccc" stroke-width="1"/>
        </svg>
        <div style="display:flex; gap:20px; margin-top:10px; font-size:12px; justify-content:center; flex-wrap:wrap; color:#555;">
            <span><span style="display:inline-block;width:12px;height:12px;background:#667eea;border-radius:2px;vertical-align:middle;margin-right:5px;"></span>Histórico</span>
            <span><span style="display:inline-block;width:12px;height:12px;background:#43e97b;border-radius:2px;vertical-align:middle;margin-right:5px;"></span>Projeção</span>
            <span><span style="display:inline-block;width:30px;height:2px;background:#ff6b6b;vertical-align:middle;margin-right:5px;"></span>Média diária</span>
        </div>`;
}

// ---------- Tabela histórica ----------

function _renderizarTabela(dias, receitaTotal, custoTotal, lucroTotal) {
    const tbody = document.getElementById('projecaoTabelaBody');
    const tfoot = document.getElementById('projecaoTabelaFoot');

    tbody.innerHTML = dias.map(dia => {
        const receita = parseFloat(dia.receita_bruta);
        const custo   = parseFloat(dia.custo_total);
        const lucro   = receita - custo;
        const margem  = receita > 0 ? (lucro / receita * 100).toFixed(1) : '0.0';
        // Usar T12:00:00 para evitar off-by-1 por fuso horário
        const dataFmt = new Date(String(dia.data).substring(0, 10) + 'T12:00:00')
            .toLocaleDateString('pt-BR');

        return `<tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 10px 12px;">${dataFmt}</td>
            <td style="padding: 10px 12px; text-align: center;">${dia.num_vendas}</td>
            <td style="padding: 10px 12px; text-align: right; color: #007bff; font-weight: bold;">${_fmtBR(receita)}</td>
            <td style="padding: 10px 12px; text-align: right; color: #dc3545;">${_fmtBR(custo)}</td>
            <td style="padding: 10px 12px; text-align: right; color: #28a745; font-weight: bold;">${_fmtBR(lucro)}</td>
            <td style="padding: 10px 12px; text-align: right;">${margem}%</td>
        </tr>`;
    }).join('');

    const margemTotal = receitaTotal > 0 ? (lucroTotal / receitaTotal * 100).toFixed(1) : '0.0';
    tfoot.innerHTML = `
        <tr style="background: #f8f9fa; font-weight: bold; border-top: 2px solid #dee2e6;">
            <td style="padding: 12px;">TOTAL</td>
            <td style="padding: 12px; text-align: center;">—</td>
            <td style="padding: 12px; text-align: right; color: #007bff;">${_fmtBR(receitaTotal)}</td>
            <td style="padding: 12px; text-align: right; color: #dc3545;">${_fmtBR(custoTotal)}</td>
            <td style="padding: 12px; text-align: right; color: #28a745;">${_fmtBR(lucroTotal)}</td>
            <td style="padding: 12px; text-align: right;">${margemTotal}%</td>
        </tr>`;
}

// ---------- Helpers locais ----------

function _fmtBR(valor) {
    return 'R$ ' + parseFloat(valor || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function _parseMoedaProj(str) {
    if (!str) return 0;
    // Aceita "800", "800,00", "R$ 800,00", "1.200,50"
    const limpo = String(str).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
}
