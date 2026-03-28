// ==================== MODULO FUNCIONARIOS E FOLHA ====================

let funcionariosLista = [];
let folhasLista = [];
let folhaDetalhesAtual = null;

function moedaBRL(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function dataBR(data) {
    if (!data) return '-';
    const dt = new Date(`${String(data).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('pt-BR');
}

function statusFolhaTag(status) {
    if (status === 'rascunho') return '<span style="background:#fff3cd;color:#856404;padding:3px 8px;border-radius:10px;font-size:12px;font-weight:700;">Rascunho</span>';
    if (status === 'fechada') return '<span style="background:#d1ecf1;color:#0c5460;padding:3px 8px;border-radius:10px;font-size:12px;font-weight:700;">Fechada</span>';
    if (status === 'paga') return '<span style="background:#d4edda;color:#155724;padding:3px 8px;border-radius:10px;font-size:12px;font-weight:700;">Paga</span>';
    return `<span>${status || '-'}</span>`;
}

function montarTelaFuncionarios() {
    const content = document.getElementById('funcionarios-content');
    if (!content || content.dataset.initialized === 'true') return;

    const hoje = new Date();

    content.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">
            <div style="background:#fff;padding:16px;border-radius:10px;border:1px solid #e9ecef;">
                <h3 style="margin-top:0;">+ Cadastrar Funcionário</h3>
                <form id="formFuncionario" onsubmit="salvarFuncionarioERP(event)">
                    <div style="display:grid;gap:10px;">
                        <input id="funcNome" type="text" placeholder="Nome" required style="padding:10px;border:1px solid #ddd;border-radius:6px;">
                        <label style="font-size:13px;color:#555;">Data de admissão</label>
                        <input id="funcDataAdmissao" type="date" required style="padding:10px;border:1px solid #ddd;border-radius:6px;">
                        <label style="font-size:13px;color:#555;">Salário base (R$)</label>
                        <input id="funcSalarioBase" type="number" min="0.01" step="0.01" required style="padding:10px;border:1px solid #ddd;border-radius:6px;">
                        <textarea id="funcObservacoes" placeholder="Observações (opcional)" rows="3" style="padding:10px;border:1px solid #ddd;border-radius:6px;"></textarea>
                        <button type="submit" class="btn btn-success">Salvar Funcionário</button>
                    </div>
                </form>
            </div>

            <div style="background:#fff;padding:16px;border-radius:10px;border:1px solid #e9ecef;">
                <h3 style="margin-top:0;">🧾 Gerar Folha Mensal</h3>
                <div style="display:grid;gap:10px;">
                    <label style="font-size:13px;color:#555;">Mês</label>
                    <input id="folhaMes" type="number" min="1" max="12" value="${hoje.getMonth() + 1}" style="padding:10px;border:1px solid #ddd;border-radius:6px;">
                    <label style="font-size:13px;color:#555;">Ano</label>
                    <input id="folhaAno" type="number" min="2020" max="2100" value="${hoje.getFullYear()}" style="padding:10px;border:1px solid #ddd;border-radius:6px;">
                    <label style="font-size:13px;color:#555;">Dia de fechamento</label>
                    <input id="folhaDiaFechamento" type="number" min="1" max="31" value="30" style="padding:10px;border:1px solid #ddd;border-radius:6px;">
                    <button class="btn btn-primary" onclick="gerarFolhaERP()">Gerar Folha</button>
                    <small style="color:#6c757d;">A folha nasce em rascunho para ajustar descontos e bonificações.</small>
                </div>
            </div>
        </div>

        <div style="margin-top:18px;background:#fff;padding:16px;border-radius:10px;border:1px solid #e9ecef;">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between;">
                <h3 style="margin:0;">Funcionários</h3>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input id="filtroFuncionarioNome" type="text" placeholder="Buscar por nome" oninput="renderFuncionariosERP()" style="padding:8px 10px;border:1px solid #ddd;border-radius:6px;">
                    <select id="filtroFuncionarioAtivo" onchange="renderFuncionariosERP()" style="padding:8px 10px;border:1px solid #ddd;border-radius:6px;">
                        <option value="todos">Todos</option>
                        <option value="ativos" selected>Ativos</option>
                        <option value="inativos">Inativos</option>
                    </select>
                </div>
            </div>
            <div id="funcionariosTabela" style="margin-top:12px;"></div>
        </div>

        <div style="margin-top:18px;background:#fff;padding:16px;border-radius:10px;border:1px solid #e9ecef;">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between;">
                <h3 style="margin:0;">Folhas de Pagamento</h3>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input id="filtroAnoFolha" type="number" min="2020" max="2100" value="${hoje.getFullYear()}" style="padding:8px 10px;border:1px solid #ddd;border-radius:6px;">
                    <button class="btn" onclick="carregarFolhasERP()">Filtrar</button>
                </div>
            </div>
            <div id="folhasTabela" style="margin-top:12px;"></div>
        </div>

        <div id="detalhesFolhaBox" style="margin-top:18px;background:#fff;padding:16px;border-radius:10px;border:1px solid #e9ecef;display:none;"></div>
    `;

    content.dataset.initialized = 'true';
}

async function carregarFuncionariosSection() {
    montarTelaFuncionarios();
    await Promise.all([carregarFuncionariosERP(), carregarFolhasERP()]);
}

async function carregarFuncionariosERP() {
    try {
        const response = await fetch(`${window.API_URL}/funcionarios`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao carregar funcionários');
        }

        funcionariosLista = data.data || [];
        renderFuncionariosERP();
    } catch (error) {
        console.error(error);
        const tabela = document.getElementById('funcionariosTabela');
        if (tabela) tabela.innerHTML = `<p style="color:#dc3545;">${error.message}</p>`;
    }
}

function renderFuncionariosERP() {
    const tabela = document.getElementById('funcionariosTabela');
    if (!tabela) return;

    const busca = (document.getElementById('filtroFuncionarioNome')?.value || '').toLowerCase();
    const status = document.getElementById('filtroFuncionarioAtivo')?.value || 'ativos';

    let dados = [...funcionariosLista];

    if (busca) {
        dados = dados.filter(item => String(item.nome || '').toLowerCase().includes(busca));
    }

    if (status === 'ativos') {
        dados = dados.filter(item => item.ativo === 1 || item.ativo === true);
    }

    if (status === 'inativos') {
        dados = dados.filter(item => item.ativo === 0 || item.ativo === false);
    }

    if (dados.length === 0) {
        tabela.innerHTML = '<p style="color:#6c757d;padding:8px;">Nenhum funcionário encontrado.</p>';
        return;
    }

    tabela.innerHTML = `
        <div style="overflow:auto;">
            <table style="width:100%;border-collapse:collapse;min-width:760px;">
                <thead>
                    <tr style="background:#f8f9fa;">
                        <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Nome</th>
                        <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Admissão</th>
                        <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Salário Base</th>
                        <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Status</th>
                        <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${dados.map(item => `
                        <tr>
                            <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${item.nome}</td>
                            <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${dataBR(item.data_admissao)}</td>
                            <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${moedaBRL(item.salario_base)}</td>
                            <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${item.ativo ? 'Ativo' : 'Inativo'}</td>
                            <td style="padding:10px;border-bottom:1px solid #f1f3f5;display:flex;gap:6px;flex-wrap:wrap;">
                                <button class="btn" onclick="editarFuncionarioERP(${item.id})">Editar</button>
                                ${item.ativo ? `<button class="btn" style="background:#dc3545;color:#fff;" onclick="desativarFuncionarioERP(${item.id})">Inativar</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function salvarFuncionarioERP(event) {
    event.preventDefault();

    const payload = {
        nome: document.getElementById('funcNome').value.trim(),
        data_admissao: document.getElementById('funcDataAdmissao').value,
        salario_base: Number(document.getElementById('funcSalarioBase').value),
        observacoes: document.getElementById('funcObservacoes').value.trim() || null
    };

    try {
        const response = await fetch(`${window.API_URL}/funcionarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao salvar funcionário');
        }

        mostrarNotificacao('Funcionário cadastrado com sucesso', 'success');
        document.getElementById('formFuncionario').reset();
        await carregarFuncionariosERP();
    } catch (error) {
        console.error(error);
        mostrarNotificacao(error.message, 'error');
    }
}

async function editarFuncionarioERP(id) {
    const funcionario = funcionariosLista.find(item => Number(item.id) === Number(id));
    if (!funcionario) return;

    const novoNome = prompt('Nome do funcionário:', funcionario.nome || '');
    if (novoNome === null) return;

    const novaAdmissao = prompt('Data de admissão (AAAA-MM-DD):', String(funcionario.data_admissao || '').slice(0, 10));
    if (novaAdmissao === null) return;

    const novoSalario = prompt('Salário base (R$):', Number(funcionario.salario_base || 0).toFixed(2));
    if (novoSalario === null) return;

    try {
        const response = await fetch(`${window.API_URL}/funcionarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: novoNome,
                data_admissao: novaAdmissao,
                salario_base: Number(novoSalario),
                observacoes: funcionario.observacoes || null,
                ativo: funcionario.ativo
            })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao editar funcionário');
        }

        mostrarNotificacao('Funcionário atualizado com sucesso', 'success');
        await carregarFuncionariosERP();
    } catch (error) {
        console.error(error);
        mostrarNotificacao(error.message, 'error');
    }
}

async function desativarFuncionarioERP(id) {
    if (!confirm('Deseja realmente inativar este funcionário?')) return;

    try {
        const response = await fetch(`${window.API_URL}/funcionarios/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao inativar funcionário');
        }

        mostrarNotificacao('Funcionário inativado com sucesso', 'success');
        await carregarFuncionariosERP();
    } catch (error) {
        console.error(error);
        mostrarNotificacao(error.message, 'error');
    }
}

async function gerarFolhaERP() {
    const mes = Number(document.getElementById('folhaMes').value);
    const ano = Number(document.getElementById('folhaAno').value);
    const dia_fechamento = Number(document.getElementById('folhaDiaFechamento').value);

    try {
        const response = await fetch(`${window.API_URL}/folha-pagamento/gerar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mes, ano, dia_fechamento })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao gerar folha');
        }

        mostrarNotificacao('Folha gerada com sucesso', 'success');
        await carregarFolhasERP();
    } catch (error) {
        console.error(error);
        mostrarNotificacao(error.message, 'error');
    }
}

async function carregarFolhasERP() {
    const tabela = document.getElementById('folhasTabela');
    if (!tabela) return;

    try {
        const ano = Number(document.getElementById('filtroAnoFolha').value);
        const response = await fetch(`${window.API_URL}/folha-pagamento?ano=${ano}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao carregar folhas');
        }

        folhasLista = data.data || [];

        if (folhasLista.length === 0) {
            tabela.innerHTML = '<p style="color:#6c757d;padding:8px;">Nenhuma folha encontrada para o ano selecionado.</p>';
            return;
        }

        tabela.innerHTML = `
            <div style="overflow:auto;">
                <table style="width:100%;border-collapse:collapse;min-width:860px;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Competência</th>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Status</th>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Bruto</th>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Descontos</th>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Líquido</th>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${folhasLista.map(item => `
                            <tr>
                                <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${String(item.mes).padStart(2, '0')}/${item.ano}</td>
                                <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${statusFolhaTag(item.status)}</td>
                                <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${moedaBRL(item.total_bruto)}</td>
                                <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${moedaBRL(item.total_descontos)}</td>
                                <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${moedaBRL(item.total_liquido)}</td>
                                <td style="padding:10px;border-bottom:1px solid #f1f3f5;display:flex;gap:6px;flex-wrap:wrap;">
                                    <button class="btn" onclick="detalharFolhaERP(${item.id})">Detalhes</button>
                                    ${item.status === 'rascunho' ? `<button class="btn" style="background:#17a2b8;color:#fff;" onclick="fecharFolhaERP(${item.id})">Fechar</button>` : ''}
                                    ${item.status === 'fechada' ? `<button class="btn btn-success" onclick="pagarFolhaERP(${item.id})">Pagar</button>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error(error);
        tabela.innerHTML = `<p style="color:#dc3545;">${error.message}</p>`;
    }
}

async function detalharFolhaERP(folhaId) {
    const box = document.getElementById('detalhesFolhaBox');
    if (!box) return;

    try {
        const response = await fetch(`${window.API_URL}/folha-pagamento/${folhaId}/detalhes`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao carregar detalhes da folha');
        }

        folhaDetalhesAtual = data.data;
        const folha = folhaDetalhesAtual.folha;
        const itens = folhaDetalhesAtual.itens || [];

        box.style.display = 'block';
        box.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <h3 style="margin:0;">Detalhes da Folha ${String(folha.mes).padStart(2, '0')}/${folha.ano}</h3>
                <div style="display:flex;gap:8px;align-items:center;">
                    ${folha.status === 'rascunho' ? `<button class="btn" onclick="recalcularFolhaERP(${folha.id})">Recalcular Proporcional</button>` : ''}
                    <div>${statusFolhaTag(folha.status)}</div>
                </div>
            </div>
            <p style="margin:10px 0;color:#6c757d;">Bruto: ${moedaBRL(folha.total_bruto)} | Descontos: ${moedaBRL(folha.total_descontos)} | Líquido: ${moedaBRL(folha.total_liquido)}</p>
            <div style="overflow:auto;">
                <table style="width:100%;border-collapse:collapse;min-width:960px;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Funcionário</th>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Base/Proporção</th>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Bonificação</th>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Desconto</th>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Líquido</th>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Pago</th>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #e9ecef;">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itens.map(item => {
                            const editavel = folha.status === 'rascunho';
                            return `
                                <tr>
                                    <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${item.funcionario_nome}</td>
                                    <td style="padding:10px;border-bottom:1px solid #f1f3f5;">
                                        <div><strong>${moedaBRL(item.salario_base)}</strong></div>
                                        <small style="color:#6c757d;">
                                            Integral: ${moedaBRL(item.salario_base_integral || item.salario_base)}
                                            • Dias: ${item.dias_trabalhados || item.dias_periodo || 0}/${item.dias_periodo || 0}
                                        </small>
                                    </td>
                                    <td style="padding:10px;border-bottom:1px solid #f1f3f5;">
                                        ${editavel
                                            ? `<input id="bonus-item-${item.id}" type="number" min="0" step="0.01" value="${Number(item.bonificacao || 0)}" style="padding:6px;border:1px solid #ddd;border-radius:6px;width:120px;">`
                                            : moedaBRL(item.bonificacao)}
                                    </td>
                                    <td style="padding:10px;border-bottom:1px solid #f1f3f5;">
                                        ${editavel
                                            ? `<input id="desconto-item-${item.id}" type="number" min="0" step="0.01" value="${Number(item.desconto_manual || 0)}" style="padding:6px;border:1px solid #ddd;border-radius:6px;width:120px;">`
                                            : moedaBRL(item.desconto_manual)}
                                    </td>
                                    <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${moedaBRL(item.liquido)}</td>
                                    <td style="padding:10px;border-bottom:1px solid #f1f3f5;">${item.pago ? 'Sim' : 'Não'}</td>
                                    <td style="padding:10px;border-bottom:1px solid #f1f3f5;">
                                        ${editavel ? `<button class="btn" onclick="atualizarItemFolhaERP(${folha.id}, ${item.id})">Salvar</button>` : '-'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error(error);
        box.style.display = 'block';
        box.innerHTML = `<p style="color:#dc3545;">${error.message}</p>`;
    }
}

async function atualizarItemFolhaERP(folhaId, itemId) {
    try {
        const bonificacao = Number(document.getElementById(`bonus-item-${itemId}`).value || 0);
        const desconto_manual = Number(document.getElementById(`desconto-item-${itemId}`).value || 0);

        const response = await fetch(`${window.API_URL}/folha-pagamento/${folhaId}/item/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bonificacao, desconto_manual })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao atualizar item');
        }

        mostrarNotificacao('Item atualizado com sucesso', 'success');
        await carregarFolhasERP();
        await detalharFolhaERP(folhaId);
    } catch (error) {
        console.error(error);
        mostrarNotificacao(error.message, 'error');
    }
}

async function fecharFolhaERP(folhaId) {
    if (!confirm('Fechar esta folha? Após fechar, não será possível editar itens.')) return;

    try {
        const response = await fetch(`${window.API_URL}/folha-pagamento/${folhaId}/fechar`, {
            method: 'PUT'
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao fechar folha');
        }

        mostrarNotificacao('Folha fechada com sucesso', 'success');
        await carregarFolhasERP();
    } catch (error) {
        console.error(error);
        mostrarNotificacao(error.message, 'error');
    }
}

async function pagarFolhaERP(folhaId) {
    if (!confirm('Confirmar pagamento da folha? Esta ação vai gerar lançamentos em contas a pagar.')) return;

    try {
        const response = await fetch(`${window.API_URL}/folha-pagamento/${folhaId}/pagar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origem_pagamento: 'lucro' })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao pagar folha');
        }

        mostrarNotificacao('Folha paga e lançada no financeiro', 'success');
        await carregarFolhasERP();
    } catch (error) {
        console.error(error);
        mostrarNotificacao(error.message, 'error');
    }
}

async function recalcularFolhaERP(folhaId) {
    try {
        const response = await fetch(`${window.API_URL}/folha-pagamento/${folhaId}/recalcular-proporcional`, {
            method: 'PUT'
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Erro ao recalcular folha');
        }

        mostrarNotificacao('Folha recalculada com sucesso', 'success');
        await carregarFolhasERP();
        await detalharFolhaERP(folhaId);
    } catch (error) {
        console.error(error);
        mostrarNotificacao(error.message, 'error');
    }
}
