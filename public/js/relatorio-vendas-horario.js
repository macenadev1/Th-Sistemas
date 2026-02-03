// ==================== RELATÓRIO DE VENDAS POR HORÁRIO ====================
// Análise de vendas por horário do dia para identificação de padrões e estratégias

/**
 * Abrir modal de relatório de vendas por horário
 */
function abrirRelatorioVendasHorario() {
    abrirModal('relatorioVendasHorarioModal', () => {
        // Setar período padrão: últimos 30 dias
        setarPeriodoRelatorioHorario('mes');
    });
}

/**
 * Setar período pré-definido para relatório de horário
 */
function setarPeriodoRelatorioHorario(tipo, botaoClicado) {
    // Remover animação de todos os botões de período
    const botoesPeriodo = document.querySelectorAll('[id^="btnPeriodo"][id$="Horario"]');
    botoesPeriodo.forEach(btn => {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
        btn.innerHTML = btn.innerHTML.replace(' ⏳', '').replace(' ✓', '');
    });
    
    // Adicionar feedback visual no botão clicado
    if (botaoClicado) {
        const textoOriginal = botaoClicado.innerHTML;
        botaoClicado.innerHTML = textoOriginal + ' ⏳';
        botaoClicado.style.opacity = '0.7';
        botaoClicado.style.transform = 'scale(0.95)';
        
        // Após definir o período, restaurar botão
        setTimeout(() => {
            botaoClicado.innerHTML = textoOriginal + ' ✓';
            botaoClicado.style.opacity = '1';
            botaoClicado.style.transform = 'scale(1)';
            
            // Remover checkmark após 2 segundos
            setTimeout(() => {
                botaoClicado.innerHTML = textoOriginal;
            }, 2000);
        }, 300);
    }
    
    const hoje = new Date();
    const dataFinal = new Date(hoje);
    let dataInicial = new Date(hoje);
    
    switch(tipo) {
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
            // Primeiro dia do mês
            dataInicial.setDate(1);
            break;
        case 'ano':
            // Primeiro dia do ano
            dataInicial.setMonth(0, 1);
            break;
    }
    
    // Formatar datas para input type="date"
    document.getElementById('dataInicialRelatorioHorario').value = dataInicial.toISOString().split('T')[0];
    document.getElementById('dataFinalRelatorioHorario').value = dataFinal.toISOString().split('T')[0];
    
    // Mostrar notificação
    const nomesPeriodo = {
        'hoje': 'Hoje',
        'ontem': 'Ontem',
        'semana': 'Esta Semana',
        'mes': 'Este Mês',
        'ano': 'Este Ano'
    };
    mostrarNotificacao(`✓ Período selecionado: ${nomesPeriodo[tipo]}`, 'success');
}

/**
 * Gerar relatório de vendas por horário
 */
async function gerarRelatorioVendasHorario() {
    const dataInicial = document.getElementById('dataInicialRelatorioHorario').value;
    const dataFinal = document.getElementById('dataFinalRelatorioHorario').value;
    
    if (!dataInicial || !dataFinal) {
        mostrarNotificacao('⚠️ Selecione as datas inicial e final', 'error');
        return;
    }
    
    if (new Date(dataInicial) > new Date(dataFinal)) {
        mostrarNotificacao('⚠️ Data inicial não pode ser maior que data final', 'error');
        return;
    }
    
    const container = document.getElementById('resultadoRelatorioHorario');
    container.innerHTML = '<p style="text-align: center; padding: 40px;"><strong>Carregando relatório...</strong></p>';
    
    try {
        const response = await fetch(`${API_URL}/vendas`);
        if (!response.ok) throw new Error('Erro ao carregar vendas');
        
        const todasVendas = await response.json();
        
        // CRÍTICO: Filtrar vendas canceladas
        const vendasValidas = todasVendas.filter(venda => {
            const cancelado = venda.cancelado === true || venda.cancelado === 1 || venda.cancelado === '1' || venda.cancelado === 'true';
            return !cancelado;
        });
        
        // Filtrar vendas no período
        const vendas = vendasValidas.filter(venda => {
            const dataVenda = new Date(venda.data_venda.replace(' ', 'T'));
            const dataVendaSemHora = new Date(dataVenda.toISOString().split('T')[0]);
            const inicial = new Date(dataInicial);
            const final = new Date(dataFinal);
            
            return dataVendaSemHora >= inicial && dataVendaSemHora <= final;
        });
        
        if (vendas.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🕐</div>
                    <h3>Nenhuma venda encontrada no período</h3>
                    <p style="margin-top: 10px;">Tente selecionar um período diferente</p>
                </div>
            `;
            document.getElementById('btnExportarHorarioCSV').disabled = true;
            return;
        }
        
        // Buscar itens de todas as vendas em paralelo
        const promessasItens = vendas.map(venda => 
            fetch(`${API_URL}/vendas/${venda.id}`)
                .then(res => res.json())
                .then(data => ({ venda, itens: data.itens || [], formas_pagamento: data.formas_pagamento || [] }))
        );
        
        const vendasComItens = await Promise.all(promessasItens);
        
        // Agrupar vendas por hora (0-23)
        const vendasPorHora = {};
        const produtosPorHora = {};
        const vendasPorDiaSemana = {
            'Domingo': { quantidade: 0, valor: 0 },
            'Segunda': { quantidade: 0, valor: 0 },
            'Terça': { quantidade: 0, valor: 0 },
            'Quarta': { quantidade: 0, valor: 0 },
            'Quinta': { quantidade: 0, valor: 0 },
            'Sexta': { quantidade: 0, valor: 0 },
            'Sábado': { quantidade: 0, valor: 0 }
        };
        
        // Inicializar estrutura de horas
        for (let h = 0; h < 24; h++) {
            vendasPorHora[h] = { quantidade: 0, valor: 0, itens: 0 };
            produtosPorHora[h] = {};
        }
        
        // Processar vendas
        vendasComItens.forEach(({ venda, itens }) => {
            const dataVenda = new Date(venda.data_venda.replace(' ', 'T'));
            const hora = dataVenda.getHours();
            const diaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dataVenda.getDay()];
            
            // Agrupar por hora
            vendasPorHora[hora].quantidade++;
            vendasPorHora[hora].valor += parseFloat(venda.total);
            vendasPorHora[hora].itens += parseInt(venda.quantidade_itens);
            
            // Agrupar por dia da semana
            vendasPorDiaSemana[diaSemana].quantidade++;
            vendasPorDiaSemana[diaSemana].valor += parseFloat(venda.total);
            
            // Produtos por hora
            itens.forEach(item => {
                const nomeProduto = item.nome_produto;
                if (!produtosPorHora[hora][nomeProduto]) {
                    produtosPorHora[hora][nomeProduto] = { quantidade: 0, valor: 0 };
                }
                produtosPorHora[hora][nomeProduto].quantidade += parseInt(item.quantidade);
                produtosPorHora[hora][nomeProduto].valor += parseFloat(item.subtotal);
            });
        });
        
        // Identificar pico e vale
        let horaPico = 0;
        let valorPico = 0;
        let horaVale = 0;
        let valorVale = Infinity;
        
        Object.entries(vendasPorHora).forEach(([hora, dados]) => {
            if (dados.quantidade > 0) {
                if (dados.valor > valorPico) {
                    valorPico = dados.valor;
                    horaPico = parseInt(hora);
                }
                if (dados.valor < valorVale) {
                    valorVale = dados.valor;
                    horaVale = parseInt(hora);
                }
            }
        });
        
        // Se não houver venda com valor, usar quantidade como critério
        if (valorVale === Infinity) {
            valorVale = 0;
        }
        
        // Top 3 produtos no horário de pico
        const produtosPico = Object.entries(produtosPorHora[horaPico] || {})
            .sort((a, b) => b[1].quantidade - a[1].quantidade)
            .slice(0, 3);
        
        // Top 3 produtos no horário de vale
        const produtosVale = Object.entries(produtosPorHora[horaVale] || {})
            .sort((a, b) => b[1].quantidade - a[1].quantidade)
            .slice(0, 3);
        
        // Calcular totais
        const totalVendas = vendas.length;
        const totalValor = vendas.reduce((sum, v) => sum + parseFloat(v.total), 0);
        const totalItens = vendas.reduce((sum, v) => sum + parseInt(v.quantidade_itens), 0);
        const ticketMedio = totalValor / totalVendas;
        
        // Salvar dados para exportação
        window.dadosRelatorioHorarioAtual = {
            vendas: vendasComItens,
            vendasPorHora: vendasPorHora,
            produtosPorHora: produtosPorHora,
            vendasPorDiaSemana: vendasPorDiaSemana,
            periodo: {
                dataInicial: dataInicial,
                dataFinal: dataFinal
            },
            horaPico: horaPico,
            horaVale: horaVale
        };
        
        // Renderizar relatório
        container.innerHTML = `
            <div class="relatorio-resultado">
                
                <!-- Cabeçalho -->
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #667eea;">
                    <h2 style="margin: 0; color: #667eea;">🕐 Análise de Vendas por Horário</h2>
                    <p style="margin: 10px 0 0 0; color: #666;">
                        Período: ${new Date(dataInicial).toLocaleDateString('pt-BR')} até ${new Date(dataFinal).toLocaleDateString('pt-BR')}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #999; font-size: 14px;">
                        Gerado em: ${new Date().toLocaleString('pt-BR')}
                    </p>
                </div>
                
                <!-- Cards de Estatísticas Gerais -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total de Vendas</div>
                        <div style="font-size: 36px; font-weight: bold;">${totalVendas}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Valor Total</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${totalValor.toFixed(2)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Ticket Médio</div>
                        <div style="font-size: 36px; font-weight: bold;">R$ ${ticketMedio.toFixed(2)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total de Itens</div>
                        <div style="font-size: 36px; font-weight: bold;">${totalItens}</div>
                    </div>
                </div>
                
                <!-- Horário de Pico e Vale -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <!-- Horário de Pico -->
                    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);">
                        <h3 style="margin: 0 0 15px 0; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 32px;">🔥</span>
                            <span>Horário de PICO</span>
                        </h3>
                        <div style="font-size: 48px; font-weight: bold; margin: 15px 0;">
                            ${horaPico.toString().padStart(2, '0')}:00
                        </div>
                        <div style="opacity: 0.9; margin-bottom: 20px;">
                            <div style="font-size: 18px; margin-bottom: 5px;">${vendasPorHora[horaPico].quantidade} vendas</div>
                            <div style="font-size: 24px; font-weight: bold;">R$ ${vendasPorHora[horaPico].valor.toFixed(2)}</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px; font-weight: bold;">🏆 Top 3 Produtos Neste Horário:</div>
                            ${produtosPico.length > 0 ? produtosPico.map((p, i) => `
                                <div style="margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                                    <div style="font-weight: bold;">${i + 1}. ${p[0]}</div>
                                    <div style="font-size: 13px; opacity: 0.9;">${p[1].quantidade} vendidos - R$ ${p[1].valor.toFixed(2)}</div>
                                </div>
                            `).join('') : '<div style="opacity: 0.8;">Nenhum produto vendido</div>'}
                        </div>
                    </div>
                    
                    <!-- Horário de Vale -->
                    <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);">
                        <h3 style="margin: 0 0 15px 0; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 32px;">📉</span>
                            <span>Horário de MENOR Movimento</span>
                        </h3>
                        <div style="font-size: 48px; font-weight: bold; margin: 15px 0;">
                            ${horaVale.toString().padStart(2, '0')}:00
                        </div>
                        <div style="opacity: 0.9; margin-bottom: 20px;">
                            <div style="font-size: 18px; margin-bottom: 5px;">${vendasPorHora[horaVale].quantidade} vendas</div>
                            <div style="font-size: 24px; font-weight: bold;">R$ ${vendasPorHora[horaVale].valor.toFixed(2)}</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px;">
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px; font-weight: bold;">📊 Produtos Vendidos Neste Horário:</div>
                            ${produtosVale.length > 0 ? produtosVale.map((p, i) => `
                                <div style="margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                                    <div style="font-weight: bold;">${i + 1}. ${p[0]}</div>
                                    <div style="font-size: 13px; opacity: 0.9;">${p[1].quantidade} vendidos - R$ ${p[1].valor.toFixed(2)}</div>
                                </div>
                            `).join('') : '<div style="opacity: 0.8;">Nenhum produto vendido</div>'}
                        </div>
                    </div>
                </div>
                
                <!-- Distribuição por Hora -->
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 30px;">
                    <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">📊 Distribuição de Vendas por Hora</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 10px; margin-top: 20px;">
                        ${Object.entries(vendasPorHora).map(([hora, dados]) => {
                            const percentual = totalValor > 0 ? (dados.valor / totalValor * 100) : 0;
                            const altura = Math.max(percentual * 2, 5); // Mínimo 5px para visibilidade
                            const cor = dados.valor === valorPico ? '#28a745' : dados.valor === valorVale ? '#dc3545' : '#667eea';
                            
                            return `
                                <div style="text-align: center;">
                                    <div style="height: 150px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 5px;">
                                        <div style="
                                            width: 100%;
                                            height: ${altura}%;
                                            background: ${cor};
                                            border-radius: 4px 4px 0 0;
                                            position: relative;
                                            transition: all 0.3s;
                                            cursor: pointer;
                                        " 
                                        onmouseover="this.style.opacity='0.7'; this.style.transform='translateY(-5px)'"
                                        onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'"
                                        title="${dados.quantidade} vendas - R$ ${dados.valor.toFixed(2)}">
                                        </div>
                                    </div>
                                    <div style="font-size: 11px; font-weight: bold; color: #666;">${hora}h</div>
                                    <div style="font-size: 10px; color: #999;">${dados.quantidade}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px;">
                        <strong>Legenda:</strong>
                        <span style="margin-left: 20px; color: #28a745;">🟢 Horário de Pico</span>
                        <span style="margin-left: 20px; color: #dc3545;">🔴 Horário de Vale</span>
                        <span style="margin-left: 20px; color: #667eea;">🔵 Outros Horários</span>
                    </div>
                </div>
                
                <!-- Análise por Dia da Semana -->
                <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 30px;">
                    <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">📅 Análise por Dia da Semana</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin-top: 20px;">
                        ${Object.entries(vendasPorDiaSemana).map(([dia, dados]) => {
                            const cores = {
                                'Domingo': '#dc3545',
                                'Segunda': '#667eea',
                                'Terça': '#4facfe',
                                'Quarta': '#43e97b',
                                'Quinta': '#f093fb',
                                'Sexta': '#ff9800',
                                'Sábado': '#28a745'
                            };
                            return `
                                <div style="background: ${cores[dia]}; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px; font-weight: bold;">${dia}</div>
                                    <div style="font-size: 24px; font-weight: bold; margin: 10px 0;">${dados.quantidade}</div>
                                    <div style="font-size: 12px; opacity: 0.9;">vendas</div>
                                    <div style="font-size: 16px; font-weight: bold; margin-top: 10px;">R$ ${dados.valor.toFixed(2)}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <!-- Recomendações Estratégicas -->
                ${gerarRecomendacoesEstrategicas(vendasPorHora, horaPico, horaVale, vendasPorDiaSemana, produtosPico, produtosVale)}
            </div>
        `;
        
        // Habilitar botão de exportação
        document.getElementById('btnExportarHorarioCSV').disabled = false;
        
        mostrarNotificacao('✅ Relatório gerado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao gerar relatório</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
        document.getElementById('btnExportarHorarioCSV').disabled = true;
    }
}

/**
 * Gerar recomendações estratégicas baseadas nos dados
 */
function gerarRecomendacoesEstrategicas(vendasPorHora, horaPico, horaVale, vendasPorDiaSemana, produtosPico, produtosVale) {
    const recomendacoes = [];
    
    // 1. Otimização do horário de pico
    recomendacoes.push({
        icone: '🔥',
        titulo: 'Otimização do Horário de Pico',
        cor: '#28a745',
        dicas: [
            `Reforce a equipe às ${horaPico}:00 para atender melhor a alta demanda`,
            `Destaque os produtos top sellers (${produtosPico.map(p => p[0]).join(', ')}) neste horário`,
            `Considere promoções relâmpago para aumentar ainda mais as vendas`,
            `Prepare estoque extra dos produtos mais vendidos antes do horário de pico`
        ]
    });
    
    // 2. Aproveitamento do horário de vale
    recomendacoes.push({
        icone: '💡',
        titulo: 'Oportunidades no Horário de Menor Movimento',
        cor: '#ff9800',
        dicas: [
            `Use o horário das ${horaVale}:00 para promoções especiais (happy hour)`,
            `Ofereça combos atrativos para estimular vendas neste período`,
            `Considere reduzir custos operacionais neste horário (menos funcionários)`,
            `Aproveite para organizar estoque e preparar para horários de pico`
        ]
    });
    
    // 3. Análise semanal
    const melhorDia = Object.entries(vendasPorDiaSemana).sort((a, b) => b[1].valor - a[1].valor)[0];
    const piorDia = Object.entries(vendasPorDiaSemana).sort((a, b) => a[1].valor - b[1].valor)[0];
    
    recomendacoes.push({
        icone: '📅',
        titulo: 'Padrão Semanal',
        cor: '#667eea',
        dicas: [
            `${melhorDia[0]} é seu melhor dia (R$ ${melhorDia[1].valor.toFixed(2)}) - maximize este dia!`,
            `${piorDia[0]} precisa de atenção - considere promoções especiais`,
            `Planeje compras e estoque baseado nos dias de maior movimento`,
            `Ajuste escalas de trabalho de acordo com os dias mais movimentados`
        ]
    });
    
    // 4. Análise de períodos
    const manha = [6, 7, 8, 9, 10, 11].reduce((sum, h) => sum + vendasPorHora[h].valor, 0);
    const tarde = [12, 13, 14, 15, 16, 17].reduce((sum, h) => sum + vendasPorHora[h].valor, 0);
    const noite = [18, 19, 20, 21, 22, 23].reduce((sum, h) => sum + vendasPorHora[h].valor, 0);
    
    const periodos = [
        { nome: 'Manhã (6h-11h)', valor: manha },
        { nome: 'Tarde (12h-17h)', valor: tarde },
        { nome: 'Noite (18h-23h)', valor: noite }
    ].sort((a, b) => b.valor - a.valor);
    
    recomendacoes.push({
        icone: '⏰',
        titulo: 'Distribuição por Período',
        cor: '#4facfe',
        dicas: [
            `${periodos[0].nome} é seu período mais forte (R$ ${periodos[0].valor.toFixed(2)})`,
            `Concentre esforços de marketing no período mais fraco (${periodos[2].nome})`,
            `Adapte o mix de produtos para cada período do dia`,
            `Considere horários de funcionamento baseados nos períodos de maior movimento`
        ]
    });
    
    // 5. Oportunidades de crescimento
    recomendacoes.push({
        icone: '🚀',
        titulo: 'Oportunidades de Crescimento',
        cor: '#f093fb',
        dicas: [
            `Crie programas de fidelidade para aumentar frequência de compra`,
            `Desenvolva combos estratégicos com os produtos mais vendidos`,
            `Implemente vendas por WhatsApp para horários alternativos`,
            `Considere delivery nos horários de menor movimento físico`
        ]
    });
    
    return `
        <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">💡 Recomendações Estratégicas</h3>
            <div style="display: grid; gap: 20px; margin-top: 20px;">
                ${recomendacoes.map(rec => `
                    <div style="border-left: 4px solid ${rec.cor}; padding: 20px; background: #f8f9fa; border-radius: 0 8px 8px 0;">
                        <h4 style="margin: 0 0 15px 0; color: ${rec.cor}; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">${rec.icone}</span>
                            <span>${rec.titulo}</span>
                        </h4>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${rec.dicas.map(dica => `<li style="margin-bottom: 8px; color: #666;">${dica}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Exportar relatório de horário para CSV
 */
function exportarRelatorioHorarioCSV() {
    if (!window.dadosRelatorioHorarioAtual) {
        mostrarNotificacao('Gere o relatório primeiro!', 'error');
        return;
    }

    const { vendasPorHora, vendasPorDiaSemana, periodo } = window.dadosRelatorioHorarioAtual;
    
    // Cabeçalho do CSV
    let csv = 'ANÁLISE DE VENDAS POR HORÁRIO\n\n';
    csv += `Período: ${periodo.dataInicial} até ${periodo.dataFinal}\n`;
    csv += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
    
    // Tabela por hora
    csv += 'VENDAS POR HORA\n';
    csv += 'Hora,Quantidade de Vendas,Valor Total (R$),Itens Vendidos,Ticket Médio (R$)\n';
    
    Object.entries(vendasPorHora).forEach(([hora, dados]) => {
        const ticketMedio = dados.quantidade > 0 ? (dados.valor / dados.quantidade) : 0;
        csv += `${hora}:00,${dados.quantidade},${dados.valor.toFixed(2)},${dados.itens},${ticketMedio.toFixed(2)}\n`;
    });
    
    // Tabela por dia da semana
    csv += '\n\nVENDAS POR DIA DA SEMANA\n';
    csv += 'Dia,Quantidade de Vendas,Valor Total (R$),Ticket Médio (R$)\n';
    
    Object.entries(vendasPorDiaSemana).forEach(([dia, dados]) => {
        const ticketMedio = dados.quantidade > 0 ? (dados.valor / dados.quantidade) : 0;
        csv += `${dia},${dados.quantidade},${dados.valor.toFixed(2)},${ticketMedio.toFixed(2)}\n`;
    });
    
    // Criar arquivo e download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const nomeArquivo = `analise_vendas_horario_${periodo.dataInicial}_${periodo.dataFinal}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', nomeArquivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarNotificacao('✅ Arquivo CSV exportado com sucesso!', 'success');
}
