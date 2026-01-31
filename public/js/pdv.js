const API_URL = 'http://localhost:3000/api';
let carrinho = [];
let serverOnline = false;
let pagamentos = []; // Array para armazenar os pagamentos

// Carregar histórico de fechamentos da API
async function carregarHistoricoFechamentos() {
    try {
        const response = await fetch('http://localhost:3000/api/caixa/fechamentos');
        const data = await response.json();
        return data.success ? data.fechamentos : [];
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        return [];
    }
}

// Verificar conexão com servidor
async function verificarConexao() {
    try {
        const response = await fetch(`${API_URL}/produtos`);
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

// Configuração do input de busca
const searchInput = document.getElementById('searchInput');
let bufferTimeout = null;

searchInput.addEventListener('keydown', function(e) {
    // Atalho + para aumentar quantidade
    if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const quantidadeInput = document.getElementById('quantidadeInput');
        quantidadeInput.value = parseInt(quantidadeInput.value || 1) + 1;
        quantidadeInput.style.background = '#d4edda';
        setTimeout(() => { quantidadeInput.style.background = 'white'; }, 200);
        return;
    }
    
    // Atalho - para diminuir quantidade
    if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const quantidadeInput = document.getElementById('quantidadeInput');
        const novoValor = Math.max(1, parseInt(quantidadeInput.value || 1) - 1);
        quantidadeInput.value = novoValor;
        quantidadeInput.style.background = '#f8d7da';
        setTimeout(() => { quantidadeInput.style.background = 'white'; }, 200);
        return;
    }
    
    if (e.key === 'Enter') {
        e.preventDefault();
        adicionarProduto(this.value.trim());
        this.value = '';
    }
});

// Suporte para leitores de código de barras
searchInput.addEventListener('input', function(e) {
    clearTimeout(bufferTimeout);
    bufferTimeout = setTimeout(() => {
        if (this.value.length >= 8) {
            adicionarProduto(this.value.trim());
            this.value = '';
        }
    }, 100);
});

async function adicionarProduto(codigo) {
    if (!codigo) {
        mostrarNotificacao('Digite um código válido!', 'error');
        return;
    }

    if (!caixaAberto) {
        mostrarNotificacao('⚠️ Caixa fechado! Abra o caixa antes de realizar vendas.', 'error');
        return;
    }

    if (!serverOnline) {
        mostrarNotificacao('Servidor offline! Verifique a conexão.', 'error');
        return;
    }

    // Obter quantidade do input
    const quantidadeInput = document.getElementById('quantidadeInput');
    const quantidadeDesejada = parseInt(quantidadeInput.value) || 1;
    
    if (quantidadeDesejada < 1) {
        mostrarNotificacao('Quantidade deve ser maior que zero!', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/produtos/${codigo}`);
        
        if (!response.ok) {
            mostrarNotificacao(`Produto "${codigo}" não encontrado!`, 'error');
            return;
        }

        const produto = await response.json();

        // Verificar estoque apenas se a configuração NÃO permite venda com estoque zero
        if (!configuracoes.permiteVendaEstoqueZero) {
            if (produto.estoque <= 0) {
                mostrarNotificacao(`Produto "${produto.nome}" sem estoque!`, 'error');
                return;
            }
        }

        // Verifica se já existe no carrinho
        const itemExistente = carrinho.find(item => item.codigo === codigo);
        if (itemExistente) {
            const novaQuantidade = itemExistente.quantidade + quantidadeDesejada;
            // Verifica estoque apenas se a configuração NÃO permite venda com estoque zero
            if (!configuracoes.permiteVendaEstoqueZero) {
                if (novaQuantidade > produto.estoque) {
                    mostrarNotificacao(`Estoque insuficiente! Disponível: ${produto.estoque}, no carrinho: ${itemExistente.quantidade}`, 'error');
                    return;
                }
            }
            itemExistente.quantidade = novaQuantidade;
        } else {
            // Verifica estoque apenas se a configuração NÃO permite venda com estoque zero
            if (!configuracoes.permiteVendaEstoqueZero) {
                if (quantidadeDesejada > produto.estoque) {
                    mostrarNotificacao(`Estoque insuficiente! Disponível: ${produto.estoque}`, 'error');
                    return;
                }
            }
            
            // Calcular preço com desconto já aplicado
            const descontoPercentual = parseFloat(produto.desconto_percentual) || 0;
            const precoOriginal = parseFloat(produto.preco);
            const precoComDesconto = precoOriginal * (1 - descontoPercentual / 100);
            
            carrinho.push({
                codigo: codigo,
                nome: produto.nome,
                preco: precoComDesconto,
                preco_original: precoOriginal,
                desconto_percentual: descontoPercentual,
                quantidade: quantidadeDesejada
            });
        }

        atualizarCarrinho();
        
        if (quantidadeDesejada > 1) {
            mostrarNotificacao(`✓ ${quantidadeDesejada}x ${produto.nome} adicionado!`, 'success');
        } else {
            mostrarNotificacao(`✓ ${produto.nome} adicionado!`, 'success');
        }
        
        // Resetar quantidade para 1
        quantidadeInput.value = 1;
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        mostrarNotificacao('Erro ao adicionar produto!', 'error');
    }
}

function atualizarCarrinho() {
    const cartItemsDiv = document.getElementById('cartItems');
    const totalItemsSpan = document.getElementById('totalItems');
    const subtotalSpan = document.getElementById('subtotal');
    const totalSpan = document.getElementById('total');

    if (carrinho.length === 0) {
        cartItemsDiv.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <p>Nenhum item adicionado ainda</p>
                <p style="font-size: 14px; margin-top: 10px;">Use o leitor de código de barras ou digite o código</p>
            </div>
        `;
    } else {
        cartItemsDiv.innerHTML = carrinho.map((item, index) => {
            const temDesconto = item.desconto_percentual && item.desconto_percentual > 0;
            const precoOriginal = item.preco_original || item.preco;
            
            return `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-name">${item.nome}</div>
                    <div class="item-details">
                        ${temDesconto ? 
                            `<span style="text-decoration: line-through; color: #999; margin-right: 8px;">R$ ${precoOriginal.toFixed(2)}</span>
                             <span style="color: #28a745; font-weight: bold;">R$ ${item.preco.toFixed(2)}</span>
                             <span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px;">-${item.desconto_percentual}%</span>`
                            :
                            `R$ ${item.preco.toFixed(2)} cada`
                        }
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 5px; background: #f8f9fa; padding: 5px; border-radius: 6px;">
                        <button onclick="diminuirQuantidadeItem(${index})" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 5px 10px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: bold;
                        " title="Diminuir quantidade">−</button>
                        <input type="number" 
                            value="${item.quantidade}" 
                            min="1" 
                            onchange="alterarQuantidadeItem(${index}, this.value)"
                            style="
                                width: 50px;
                                text-align: center;
                                border: 2px solid #ddd;
                                border-radius: 4px;
                                padding: 5px;
                                font-size: 14px;
                                font-weight: bold;
                            ">
                        <button onclick="aumentarQuantidadeItem(${index})" style="
                            background: #28a745;
                            color: white;
                            border: none;
                            padding: 5px 10px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: bold;
                        " title="Aumentar quantidade">+</button>
                    </div>
                    <div class="item-price" style="min-width: 80px;">R$ ${(item.preco * item.quantidade).toFixed(2)}</div>
                    <button onclick="removerItemCarrinho(${index})" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: bold;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'" title="Remover item">
                        ✕
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }

    const totalQuantidade = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
    const totalValor = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);

    totalItemsSpan.textContent = totalQuantidade;
    subtotalSpan.textContent = `R$ ${totalValor.toFixed(2)}`;
    totalSpan.textContent = `R$ ${totalValor.toFixed(2)}`;

    document.querySelector('.items-list h3').textContent = `📋 Itens da Venda (${carrinho.length})`;
}

function removerItemCarrinho(index) {
    if (index < 0 || index >= carrinho.length) {
        mostrarNotificacao('Item inválido!', 'error');
        return;
    }
    
    const item = carrinho[index];
    carrinho.splice(index, 1);
    atualizarCarrinho();
    mostrarNotificacao(`✓ ${item.nome} removido do carrinho!`, 'info');
}

async function aumentarQuantidadeItem(index) {
    if (index < 0 || index >= carrinho.length) return;
    
    const item = carrinho[index];
    
    // Verifica estoque apenas se a configuração NÃO permite venda com estoque zero
    if (!configuracoes.permiteVendaEstoqueZero) {
        try {
            const response = await fetch(`${API_URL}/produtos/${item.codigo}`);
            if (!response.ok) {
                mostrarNotificacao('Erro ao verificar estoque!', 'error');
                return;
            }
            
            const produto = await response.json();
            
            if (item.quantidade >= produto.estoque) {
                mostrarNotificacao(`Estoque máximo atingido! Disponível: ${produto.estoque}`, 'error');
                return;
            }
        } catch (error) {
            console.error('Erro ao aumentar quantidade:', error);
            mostrarNotificacao('Erro ao verificar estoque!', 'error');
            return;
        }
    }
    
    item.quantidade++;
    atualizarCarrinho();
    mostrarNotificacao(`✓ Quantidade aumentada para ${item.quantidade}`, 'success');
}

function diminuirQuantidadeItem(index) {
    if (index < 0 || index >= carrinho.length) return;
    
    const item = carrinho[index];
    
    if (item.quantidade <= 1) {
        mostrarNotificacao('Quantidade mínima é 1. Use o botão ✕ para remover o item.', 'error');
        return;
    }
    
    item.quantidade--;
    atualizarCarrinho();
    mostrarNotificacao(`✓ Quantidade diminuída para ${item.quantidade}`, 'info');
}

async function alterarQuantidadeItem(index, novaQuantidade) {
    if (index < 0 || index >= carrinho.length) return;
    
    const qtd = parseInt(novaQuantidade);
    
    if (isNaN(qtd) || qtd < 1) {
        mostrarNotificacao('Quantidade inválida!', 'error');
        atualizarCarrinho(); // Restaura valor anterior
        return;
    }
    
    const item = carrinho[index];
    
    // Verifica estoque apenas se a configuração NÃO permite venda com estoque zero
    if (!configuracoes.permiteVendaEstoqueZero) {
        try {
            const response = await fetch(`${API_URL}/produtos/${item.codigo}`);
            if (!response.ok) {
                mostrarNotificacao('Erro ao verificar estoque!', 'error');
                atualizarCarrinho();
                return;
            }
            
            const produto = await response.json();
            
            if (qtd > produto.estoque) {
                mostrarNotificacao(`Estoque insuficiente! Disponível: ${produto.estoque}`, 'error');
                atualizarCarrinho();
                return;
            }
        } catch (error) {
            console.error('Erro ao alterar quantidade:', error);
            mostrarNotificacao('Erro ao verificar estoque!', 'error');
            atualizarCarrinho();
            return;
        }
    }
    
    item.quantidade = qtd;
    atualizarCarrinho();
    mostrarNotificacao(`✓ Quantidade alterada para ${qtd}`, 'success');
}

function finalizarVenda() {
    if (!caixaAberto) {
        mostrarNotificacao('⚠️ Caixa fechado! Abra o caixa antes de realizar vendas.', 'error');
        return;
    }

    if (carrinho.length === 0) {
        mostrarNotificacao('Carrinho vazio! Adicione produtos primeiro.', 'error');
        return;
    }
    
    const total = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    
    // Atualizar valores (sem desconto manual)
    document.getElementById('subtotalVenda').textContent = `R$ ${total.toFixed(2)}`;
    document.getElementById('totalFinal').textContent = `R$ ${total.toFixed(2)}`;
    
    // Se já tem pagamentos, mostra o que já foi pago
    const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    if (pagamentos.length > 0) {
        const total = calcularTotalComDesconto();
        const faltante = total - totalPago;
        mostrarNotificacao(`Pagamentos anteriores mantidos! Falta: R$ ${faltante.toFixed(2)}`, 'info');
    }
    
    const valorInput = document.getElementById('valorPagamento');
    if (valorInput.resetarValor) {
        valorInput.resetarValor();
    } else {
        valorInput.value = '';
    }
    
    abrirModal('finalizacaoModal', () => {
        // Focar no input de valor
        setTimeout(() => {
            document.getElementById('valorPagamento').focus();
        }, 100);
    });
    
    // Atualizar interface com os pagamentos existentes
    atualizarPagamentos();
}

function selecionarFormaPagamento(forma) {
    // Esta função não é mais usada no novo fluxo
}

let valorPagamentoSelecionado = 0;

function abrirModalFormaPagamento(valor) {
    valorPagamentoSelecionado = valor;
    document.getElementById('valorSelecionadoTexto').textContent = `Valor: R$ ${valor.toFixed(2)}`;
    
    // Desfocar o input de valor para evitar que continue capturando teclas
    const valorInput = document.getElementById('valorPagamento');
    if (valorInput) {
        valorInput.blur();
    }
    
    document.getElementById('formaPagamentoModal').classList.add('active');
}

function fecharModalFormaPagamento() {
    document.getElementById('formaPagamentoModal').classList.remove('active');
    valorPagamentoSelecionado = 0;
    // Focar de volta no input de valor
    setTimeout(() => {
        document.getElementById('valorPagamento').focus();
    }, 100);
}

function selecionarFormaPagamentoComValor(forma) {
    const valor = valorPagamentoSelecionado;
    
    if (!valor || valor <= 0) {
        mostrarNotificacao('Valor inválido!', 'error');
        return;
    }
    
    const total = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    const faltante = total - totalPago;
    
    // Aceitar diferença de até 0.01 devido a arredondamento
    if (valor > faltante + 0.01) {
        // Se pagou a mais em dinheiro, permite (gera troco)
        if (forma !== 'dinheiro') {
            mostrarNotificacao(`Valor maior que o restante (R$ ${faltante.toFixed(2)})!`, 'error');
            return;
        }
    }
    
    // Adicionar pagamento
    pagamentos.push({ forma, valor });
    
    // Fechar modal de forma de pagamento
    fecharModalFormaPagamento();
    
    // Limpar input de valor
    const valorInput = document.getElementById('valorPagamento');
    if (valorInput.resetarValor) {
        valorInput.resetarValor();
    } else {
        valorInput.value = '';
    }
    
    // Atualizar interface
    atualizarPagamentos();
    
    // Verificar se pagamento está completo
    const novoTotalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    if (novoTotalPago >= total) {
        // Pagamento completo, mostrar modal de confirmação
        setTimeout(() => {
            mostrarModalConfirmacaoVenda();
        }, 300);
    } else {
        // Focar no input para próximo pagamento
        setTimeout(() => {
            document.getElementById('valorPagamento').focus();
        }, 100);
    }
}

function adicionarPagamento() {
    const forma = document.getElementById('formaPagamento').value;
    const valorInput = document.getElementById('valorPagamento');
    const valor = valorInput.getValorDecimal ? valorInput.getValorDecimal() : parseFloat(valorInput.value.replace(',', '.'));
    
    if (!valor || valor <= 0) {
        mostrarNotificacao('Digite um valor válido!', 'error');
        return;
    }
    
    const total = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    const faltante = total - totalPago;
    
    // Aceitar diferença de até 0.01 devido a arredondamento
    if (valor > faltante + 0.01) {
        // Se pagou a mais em dinheiro, permite (gera troco)
        if (forma !== 'dinheiro') {
            mostrarNotificacao(`Valor maior que o restante (R$ ${faltante.toFixed(2)})!`, 'error');
            return;
        }
    }
    
    // Adicionar pagamento
    pagamentos.push({ forma, valor });
    
    // Limpar input e focar
    if (valorInput.resetarValor) {
        valorInput.resetarValor();
    } else {
        valorInput.value = '';
    }
    valorInput.focus();
    
    // Atualizar interface
    atualizarPagamentos();
}

function mostrarModalConfirmacaoVenda() {
    const total = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    const troco = Math.max(0, totalPago - total);
    const temDinheiro = pagamentos.some(p => p.forma === 'dinheiro');
    
    document.getElementById('totalPagoConfirmacao').textContent = `R$ ${totalPago.toFixed(2)}`;
    
    if (temDinheiro && troco > 0) {
        document.getElementById('trocoConfirmacao').style.display = 'block';
        document.getElementById('trocoValorConfirmacao').textContent = `R$ ${troco.toFixed(2)}`;
    } else {
        document.getElementById('trocoConfirmacao').style.display = 'none';
    }
    
    document.getElementById('confirmacaoVendaModal').classList.add('active');
}

function confirmarVendaFinal() {
    document.getElementById('confirmacaoVendaModal').classList.remove('active');
    confirmarVenda();
}

function cancelarConfirmacaoVenda() {
    document.getElementById('confirmacaoVendaModal').classList.remove('active');
    // Focar no input novamente
    setTimeout(() => {
        document.getElementById('valorPagamento').focus();
    }, 100);
}

function removerPagamento(index) {
    pagamentos.splice(index, 1);
    atualizarPagamentos();
}

function atualizarPagamentos() {
    const total = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    const faltante = total - totalPago;
    const troco = totalPago - total;
    
    // Atualizar totais
    document.getElementById('totalPago').textContent = `R$ ${totalPago.toFixed(2)}`;
    document.getElementById('faltaPagar').textContent = `R$ ${Math.max(0, faltante).toFixed(2)}`;
    
    // Mudar cor do "Falta Pagar" e adicionar mensagem quando completo
    const faltaPagarDiv = document.getElementById('faltaPagar').parentElement;
    if (faltante <= 0) {
        document.getElementById('faltaPagar').style.color = '#28a745';
        document.getElementById('faltaPagar').textContent = '✓ PAGO';
        faltaPagarDiv.style.background = '#d4edda';
        faltaPagarDiv.style.padding = '10px';
        faltaPagarDiv.style.borderRadius = '8px';
    } else {
        document.getElementById('faltaPagar').style.color = '#dc3545';
        faltaPagarDiv.style.background = 'transparent';
        faltaPagarDiv.style.padding = '0';
    }
    
    // Mostrar troco se necessário
    const temDinheiro = pagamentos.some(p => p.forma === 'dinheiro');
    if (temDinheiro && troco > 0) {
        document.getElementById('trocoSection').style.display = 'block';
        document.getElementById('troco').textContent = `R$ ${troco.toFixed(2)}`;
    } else {
        document.getElementById('trocoSection').style.display = 'none';
    }
    
    // Habilitar botão confirmar se pagamento completo
    const btnConfirmar = document.getElementById('btnConfirmarVenda');
    btnConfirmar.disabled = totalPago < total;
    
    // Mudar aparência do botão quando pagamento estiver completo
    if (totalPago >= total) {
        btnConfirmar.style.background = '#28a745';
        btnConfirmar.style.borderColor = '#28a745';
        btnConfirmar.style.animation = 'pulse 1.5s infinite';
        btnConfirmar.innerHTML = '✓ CONFIRMAR VENDA [Enter] ✓';
    } else {
        btnConfirmar.style.background = '#6c757d';
        btnConfirmar.style.borderColor = '#6c757d';
        btnConfirmar.style.animation = 'none';
        btnConfirmar.innerHTML = '✓ CONFIRMAR VENDA [Enter]';
    }
    
    // Renderizar lista de pagamentos
    const lista = document.getElementById('listaPagamentos');
    if (pagamentos.length === 0) {
        lista.innerHTML = '<p style="text-align: center; color: #999; padding: 10px; font-size: 14px;">Nenhuma forma de pagamento adicionada</p>';
    } else {
        const icones = {
            'dinheiro': '💵',
            'debito': '💳',
            'credito': '💳',
            'pix': '📱'
        };
        
        const nomes = {
            'dinheiro': 'Dinheiro',
            'debito': 'Débito',
            'credito': 'Crédito',
            'pix': 'PIX'
        };
        
        lista.innerHTML = pagamentos.map((p, i) => `
            <div style="background: #fff; border: 1px solid #ddd; padding: 10px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-size: 18px; margin-right: 8px;">${icones[p.forma]}</span>
                    <strong>${nomes[p.forma]}</strong>
                    <span style="color: #666; margin-left: 10px;">R$ ${p.valor.toFixed(2)}</span>
                </div>
                <button onclick="removerPagamento(${i})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    ✕ Remover
                </button>
            </div>
        `).join('');
    }
}

// Função para inicializar os event listeners do modal de finalização
function inicializarInputPagamento() {
    const valorPagamentoInput = document.getElementById('valorPagamento');
    if (valorPagamentoInput) {
        // Formatar valor ao digitar (estilo PDV - centavos primeiro)
        let valorCentavos = 0;
        
        valorPagamentoInput.addEventListener('keydown', function(e) {
            // Não processar teclas se o modal de forma de pagamento estiver aberto
            const modalFormaPagamento = document.getElementById('formaPagamentoModal');
            if (modalFormaPagamento && modalFormaPagamento.classList.contains('active')) {
                return;
            }
            
            // Permitir teclas de navegação e controle
            if (e.key === 'Enter') {
                e.preventDefault();
                
                // Verificar se o pagamento já está completo
                const total = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
                const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
                
                // Se pagamento já está completo e não tem valor digitado, confirma a venda
                if (totalPago >= total && valorCentavos === 0) {
                    mostrarModalConfirmacaoVenda();
                    return;
                }
                
                const valor = valorCentavos / 100;
                
                if (!valor || valor <= 0) {
                    // Se não digitou valor mas pagamento está completo, mostra confirmação
                    if (totalPago >= total) {
                        mostrarModalConfirmacaoVenda();
                        return;
                    }
                    mostrarNotificacao('Digite um valor válido!', 'error');
                    return;
                }
                
                // Abrir modal de seleção de forma de pagamento
                abrirModalFormaPagamento(valor);
                return;
            }
            
            // Permitir Backspace, Delete, Tab, Escape, Arrow keys
            if (['Backspace', 'Delete', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                if (e.key === 'Backspace') {
                    e.preventDefault();
                    valorCentavos = Math.floor(valorCentavos / 10);
                    this.value = formatarMoeda(valorCentavos);
                }
                return;
            }
            
            // Apenas permitir números
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                valorCentavos = (valorCentavos * 10) + parseInt(e.key);
                this.value = formatarMoeda(valorCentavos);
            } else if (e.key.length === 1) {
                // Bloquear outras teclas
                e.preventDefault();
            }
        });
        
        // Limpar valor ao focar
        valorPagamentoInput.addEventListener('focus', function() {
            if (this.value === '' || this.value === '0,00') {
                valorCentavos = 0;
                this.value = '0,00';
            }
        });
        
        // Função auxiliar para formatar
        function formatarMoeda(centavos) {
            const reais = Math.floor(centavos / 100);
            const cents = centavos % 100;
            return `${reais},${cents.toString().padStart(2, '0')}`;
        }
        
        // Função para obter valor em decimal
        valorPagamentoInput.getValorDecimal = function() {
            return valorCentavos / 100;
        };
        
        // Função para resetar valor
        valorPagamentoInput.resetarValor = function() {
            valorCentavos = 0;
            this.value = '';
        };
    } else {
        console.warn('⚠️ Input de pagamento não encontrado!');
    }
}

// Inicializar quando os modais forem carregados
document.addEventListener('modalsLoaded', () => {
    inicializarInputPagamento();
});
// Caso os modais já tenham sido carregados antes deste script
if (document.getElementById('valorPagamento')) {
    inicializarInputPagamento();
}

async function confirmarVenda() {
    if (!caixaAberto) {
        mostrarNotificacao('⚠️ Caixa fechado! Não é possível finalizar a venda.', 'error');
        return;
    }

    const subtotal = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    const total = subtotal;
    const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    
    if (totalPago < total) {
        mostrarNotificacao('Pagamento insuficiente!', 'error');
        return;
    }
    
    if (pagamentos.length === 0) {
        mostrarNotificacao('Adicione pelo menos uma forma de pagamento!', 'error');
        return;
    }

    if (!serverOnline) {
        mostrarNotificacao('Servidor offline! Não foi possível finalizar.', 'error');
        return;
    }

    const troco = Math.max(0, totalPago - total);

    try {
        const response = await fetch(`${API_URL}/vendas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                itens: carrinho,
                subtotal: subtotal,
                desconto: 0,
                total: total,
                valor_pago: totalPago,
                troco: troco,
                formas_pagamento: pagamentos
            })
        });

        const result = await response.json();

        mostrarNotificacao('✓ Venda finalizada com sucesso!', 'success');
        
        // Atualizar total de vendas no caixa
        if (caixaAberto) {
            caixaData.totalVendas += total;
            caixaData.movimentacoes.push({
                tipo: 'venda',
                valor: total,
                dataHora: new Date(),
                observacao: `Venda - ${carrinho.length} item(ns)`
            });
            salvarEstadoCaixa();
        }
        
        // Guardar dados da venda para o cupom
        const dadosVenda = {
            numeroVenda: result.vendaId || '0000',
            itens: [...carrinho],
            subtotal: subtotal,
            desconto: 0,
            total: total,
            formasPagamento: [...pagamentos],
            troco: troco,
            operador: caixaData.operador || 'Sistema'
        };
        
        carrinho = [];
        pagamentos = [];
        atualizarCarrinho();
        fecharModal();
        
        // Mostrar cupom apenas se habilitado nas configurações
        if (configuracoes.imprimirCupom !== false) {
            mostrarCupom(dadosVenda);
        }
    } catch (error) {
        console.error('Erro ao finalizar venda:', error);
        mostrarNotificacao(error.message, 'error');
    }
}

function mostrarCupom(dados) {
    // Preencher data e hora
    const agora = new Date();
    document.getElementById('cupomDataHora').textContent = agora.toLocaleString('pt-BR');
    document.getElementById('cupomNumeroVenda').textContent = String(dados.numeroVenda).padStart(4, '0');
    
    // Preencher itens
    const itensHtml = dados.itens.map(item => {
        const temDesconto = item.desconto_percentual && item.desconto_percentual > 0;
        const precoOriginal = item.preco_original || item.preco;
        
        return `
        <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between;">
                <span>${item.nome}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #666; padding-left: 10px;">
                ${temDesconto ? 
                    `<span>${item.quantidade} x <s>R$ ${precoOriginal.toFixed(2)}</s> R$ ${item.preco.toFixed(2)} (-${item.desconto_percentual}%)</span>`
                    :
                    `<span>${item.quantidade} x R$ ${item.preco.toFixed(2)}</span>`
                }
                <span>R$ ${(item.preco * item.quantidade).toFixed(2)}</span>
            </div>
        </div>
    `;
    }).join('');
    document.getElementById('cupomItens').innerHTML = itensHtml;
    
    // Preencher totais
    document.getElementById('cupomSubtotal').textContent = `R$ ${dados.subtotal.toFixed(2)}`;
    document.getElementById('cupomTotal').textContent = `R$ ${dados.total.toFixed(2)}`;
    
    // Mostrar desconto se houver
    if (dados.desconto > 0) {
        document.getElementById('cupomDescontoDiv').style.display = 'block';
        document.getElementById('cupomDesconto').textContent = `-R$ ${dados.desconto.toFixed(2)}`;
    } else {
        document.getElementById('cupomDescontoDiv').style.display = 'none';
    }
    
    // Preencher formas de pagamento
    const nomes = {
        'dinheiro': 'Dinheiro',
        'debito': 'Cartão Débito',
        'credito': 'Cartão Crédito',
        'pix': 'PIX'
    };
    
    const formasHtml = dados.formasPagamento.map(fp => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span>${nomes[fp.forma]}:</span>
            <span>R$ ${fp.valor.toFixed(2)}</span>
        </div>
    `).join('');
    document.getElementById('cupomFormasPagamento').innerHTML = formasHtml;
    
    // Mostrar troco se houver
    if (dados.troco > 0) {
        document.getElementById('cupomTrocoDiv').style.display = 'block';
        document.getElementById('cupomTroco').textContent = `R$ ${dados.troco.toFixed(2)}`;
    } else {
        document.getElementById('cupomTrocoDiv').style.display = 'none';
    }
    
    // Preencher operador
    document.getElementById('cupomOperador').textContent = dados.operador;
    
    // Abrir modal
    abrirModal('cupomModal');
    
    // Obter configurações (usar valores padrão se não definidos)
    const tempoRenderizacao = (typeof configuracoes !== 'undefined' && configuracoes.tempoRenderizacaoCupom) || 500;
    const tempoFechamento = (typeof configuracoes !== 'undefined' && configuracoes.tempoFechamentoCupom) || 500;
    const timeoutFallback = (typeof configuracoes !== 'undefined' && configuracoes.timeoutFallbackCupom) || 3000;
    
    // Imprimir automaticamente após delay configurável (para renderizar o conteúdo)
    setTimeout(() => {
        
        let impressaoConcluida = false;
        let timeoutId;
        
        // Função para fechar o cupom
        const fecharCupom = (motivo) => {
            if (impressaoConcluida) return; // Evitar fechar duas vezes
            impressaoConcluida = true;
            
            // Limpar timeout
            clearTimeout(timeoutId);
            
            // Remover listener
            window.removeEventListener('afterprint', handleAfterPrint);
            
            // Fechar modal após tempo configurado
            setTimeout(() => {
                fecharModal('cupomModal');
            }, tempoFechamento);
        };
        
        // Handler do evento afterprint
        const handleAfterPrint = () => {
            fecharCupom('afterprint');
        };
        
        // Adicionar listener para depois da impressão
        window.addEventListener('afterprint', handleAfterPrint);
        
        // Abrir janela de impressão
        window.print();
        
        // Fallback: se o evento não funcionar, fechar após timeout configurável
        timeoutId = setTimeout(() => {
            if (!impressaoConcluida) {
                fecharCupom('timeout fallback');
            }
        }, timeoutFallback);
    }, tempoRenderizacao);
}

function imprimirCupom() {
    window.print();
}

function cancelarVenda() {
    if (carrinho.length === 0) {
        mostrarNotificacao('Não há venda para cancelar!', 'error');
        return;
    }

    if (confirm('Deseja realmente cancelar esta venda? Os pagamentos também serão cancelados.')) {
        carrinho = [];
        pagamentos = []; // Limpar pagamentos ao cancelar venda
        atualizarCarrinho();
        mostrarNotificacao('Venda e pagamentos cancelados!', 'info');
        searchInput.focus();
    }
}

// ==================== HISTÓRICO DE VENDAS ====================

let vendasCompletas = [];

async function abrirHistorico() {
    if (!serverOnline) {
        mostrarNotificacao('Servidor offline!', 'error');
        return;
    }

    abrirModal('historicoModal');
    const content = document.getElementById('historicoContent');
    content.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Carregando vendas...</p>';

    try {
        const response = await fetch(`${API_URL}/vendas`);
        if (!response.ok) throw new Error('Erro ao carregar histórico');
        
        vendasCompletas = await response.json();
        
        // Resetar filtro para "hoje" por padrão
        document.getElementById('filtroPeriodoVendas').value = 'hoje';
        
        // Aplicar filtros (mostra vendas de hoje por padrão)
        aplicarFiltrosVendas();

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                <p>Erro ao carregar histórico de vendas</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}

function aplicarFiltrosVendas() {
    const filtroPeriodo = document.getElementById('filtroPeriodoVendas').value;
    const content = document.getElementById('historicoContent');
    
    let vendasFiltradas = [...vendasCompletas];
    
    // Filtro por período
    if (filtroPeriodo !== 'todos') {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        vendasFiltradas = vendasFiltradas.filter(venda => {
            const dataVenda = new Date(venda.data_venda.replace(' ', 'T'));
            dataVenda.setHours(0, 0, 0, 0);
            
            if (filtroPeriodo === 'hoje') {
                return dataVenda.getTime() === hoje.getTime();
            } else if (filtroPeriodo === '7dias') {
                const seteDiasAtras = new Date(hoje);
                seteDiasAtras.setDate(hoje.getDate() - 7);
                return dataVenda >= seteDiasAtras;
            } else if (filtroPeriodo === '30dias') {
                const trintaDiasAtras = new Date(hoje);
                trintaDiasAtras.setDate(hoje.getDate() - 30);
                return dataVenda >= trintaDiasAtras;
            }
            return true;
        });
    }
    
    // Atualizar contador
    document.getElementById('contadorVendas').textContent = `${vendasFiltradas.length} venda(s) encontrada(s)`;
    
    // Renderizar vendas filtradas
    renderizarVendas(vendasFiltradas);
}

async function renderizarVendas(vendas) {
    const content = document.getElementById('historicoContent');
    
    if (vendas.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
                <p>Nenhuma venda encontrada no período selecionado</p>
            </div>
        `;
        return;
    }

    // Ordenar vendas da mais recente para a mais antiga
    vendas.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));

    let html = '<div style="padding: 10px;">';
    
    for (const venda of vendas) {
        const data = new Date(venda.data_venda.replace(' ', 'T'));
        const dataFormatada = data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Buscar formas de pagamento desta venda
        let formasPagamentoHtml = '';
        try {
            const detalhesResponse = await fetch(`${API_URL}/vendas/${venda.id}`);
            if (detalhesResponse.ok) {
                const detalhes = await detalhesResponse.json();
                if (detalhes.formas_pagamento && detalhes.formas_pagamento.length > 0) {
                    const icones = {
                        'dinheiro': '💵',
                        'debito': '💳',
                        'credito': '💳',
                        'pix': '📱'
                    };
                    const nomes = {
                        'dinheiro': 'Dinheiro',
                        'debito': 'Débito',
                        'credito': 'Crédito',
                        'pix': 'PIX'
                    };
                    formasPagamentoHtml = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">';
                    detalhes.formas_pagamento.forEach(fp => {
                        formasPagamentoHtml += `<span style="margin-right: 15px; font-size: 13px;">${icones[fp.forma_pagamento]} ${nomes[fp.forma_pagamento]}: R$ ${parseFloat(fp.valor).toFixed(2)}</span>`;
                    });
                    formasPagamentoHtml += '</div>';
                }
            }
        } catch (e) {
            console.error('Erro ao carregar formas de pagamento:', e);
        }

        html += `
            <div style="background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #28a745;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <strong style="font-size: 16px;">Venda #${venda.id}</strong>
                        <span style="color: #666; margin-left: 15px;">📅 ${dataFormatada}</span>
                    </div>
                    <div style="font-size: 20px; font-weight: bold; color: #28a745;">
                        R$ ${parseFloat(venda.total).toFixed(2)}
                    </div>
                </div>
                <div style="display: flex; gap: 20px; font-size: 14px; color: #666;">
                    <span>💵 Pago: R$ ${parseFloat(venda.valor_pago).toFixed(2)}</span>
                    <span>💰 Troco: R$ ${parseFloat(venda.troco).toFixed(2)}</span>
                    <span>📦 Itens: ${venda.quantidade_itens}</span>
                </div>
                ${formasPagamentoHtml}
            </div>
        `;
    }

    html += '</div>';
    content.innerHTML = html;
}

// Atalhos de teclado globais
document.addEventListener('keydown', function(e) {
    // Atalhos para modal de confirmação de venda
    const modalConfirmacao = document.getElementById('confirmacaoVendaModal');
    if (modalConfirmacao && modalConfirmacao.classList.contains('active')) {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmarVendaFinal();
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelarConfirmacaoVenda();
            return;
        }
    }
    
    // Atalhos para formas de pagamento (quando modal de forma de pagamento está aberto)
    const modalFormaPagamento = document.getElementById('formaPagamentoModal');
    
    if (modalFormaPagamento && modalFormaPagamento.classList.contains('active')) {
        if (e.key === '1') {
            e.preventDefault();
            selecionarFormaPagamentoComValor('dinheiro');
            return;
        }
        if (e.key === '2') {
            e.preventDefault();
            selecionarFormaPagamentoComValor('debito');
            return;
        }
        if (e.key === '3') {
            e.preventDefault();
            selecionarFormaPagamentoComValor('credito');
            return;
        }
        if (e.key === '4') {
            e.preventDefault();
            selecionarFormaPagamentoComValor('pix');
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            fecharModalFormaPagamento();
            return;
        }
    }

    if (e.key === 'F1') {
        e.preventDefault();
        abrirModal('ajudaModal');
    }
    if (e.key === 'F2') {
        e.preventDefault();
        finalizarVenda();
    }
    if (e.key === 'F3') {
        e.preventDefault();
        cancelarVenda();
    }
    if (e.key === 'F4') {
        e.preventDefault();
        abrirCadastro();
    }
    if (e.key === 'F5') {
        e.preventDefault();
        abrirHistorico();
    }
    if (e.key === 'F6') {
        e.preventDefault();
        abrirGerenciarProdutos();
    }
    
    // F7 para gerenciar caixa
    if (e.key === 'F7') {
        e.preventDefault();
        abrirMenuCaixa();
    }
    
    // F8 para configurações
    if (e.key === 'F8') {
        e.preventDefault();
        abrirConfiguracoes();
    }
    
    // F9 para buscar por nome
    if (e.key === 'F9') {
        e.preventDefault();
        abrirBuscaPorNome();
    }
    
    // F10 para abrir Menu ERP em nova aba
    if (e.key === 'F10') {
        e.preventDefault();
        window.open('erp.html', '_blank');
    }
    
    // Atalho Delete para remover último item do carrinho
    if (e.key === 'Delete') {
        // Só funciona se não houver modal aberto
        const modalAberto = document.querySelector('.modal.active');
        if (!modalAberto && carrinho.length > 0) {
            e.preventDefault();
            removerItemCarrinho(carrinho.length - 1);
            return;
        }
    }
    
    // Atalho ESC para fechar modals (verifica qual está aberto)
    if (e.key === 'Escape') {
        e.preventDefault();
        
        // Verificar qual modal está aberto e fechar apenas ele
        const modalAjuda = document.getElementById('ajudaModal');
        const modalConfirmacao = document.getElementById('confirmacaoVendaModal');
        const modalFormaPagamento = document.getElementById('formaPagamentoModal');
        const modalFinalizacao = document.getElementById('finalizacaoModal');
        
        // Fecha modals na ordem de prioridade (o mais recente primeiro)
        if (modalAjuda && modalAjuda.classList.contains('active')) {
            fecharModal('ajudaModal');
            return;
        }
        if (modalConfirmacao && modalConfirmacao.classList.contains('active')) {
            cancelarConfirmacaoVenda();
            return;
        }
        if (modalFormaPagamento && modalFormaPagamento.classList.contains('active')) {
            fecharModalFormaPagamento();
            return;
        }
        if (modalFinalizacao && modalFinalizacao.classList.contains('active')) {
            fecharModal('finalizacaoModal');
            return;
        }
        
        // Verificar se há modal aninhado aberto (fechar apenas ele)
        // Prioridade: nível 2 > nível 1 > principal
        const modaisNivel2 = document.querySelectorAll('.modal-nested-level-2.active');
        if (modaisNivel2.length > 0) {
            const ultimoNivel2 = modaisNivel2[modaisNivel2.length - 1];
            fecharModal(ultimoNivel2.id);
            return;
        }
        
        const modaisAninhados = document.querySelectorAll('.modal-nested.active');
        if (modaisAninhados.length > 0) {
            // Pegar o último modal aninhado (o que está por cima)
            const ultimoAninhado = modaisAninhados[modaisAninhados.length - 1];
            fecharModal(ultimoAninhado.id);
            return;
        }
        
        // Se não há modal aninhado, fecha o último modal principal aberto
        const modaisPrincipais = document.querySelectorAll('.modal.active:not(.modal-nested)');
        if (modaisPrincipais.length > 0) {
            const ultimoPrincipal = modaisPrincipais[modaisPrincipais.length - 1];
            fecharModal(ultimoPrincipal.id);
        }
    }
});

// Mantém foco no input
setInterval(() => {
    const modalAberto = document.querySelector('.modal.active');
    if (!modalAberto && document.activeElement !== searchInput) {
        searchInput.focus();
    }
}, 1000);

// Verificar conexão periodicamente
setInterval(verificarConexao, 5000);

// Inicialização
verificarConexao();
atualizarCarrinho();
searchInput.focus();

// Configurar input de quantidade
const quantidadeInput = document.getElementById('quantidadeInput');
if (quantidadeInput) {
    quantidadeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchInput.focus();
        }
    });
    
    // Garantir que seja sempre pelo menos 1
    quantidadeInput.addEventListener('change', function() {
        if (this.value < 1 || !this.value) {
            this.value = 1;
        }
    });
}

// Inicializar: carregar configurações primeiro, depois estado do caixa
Promise.all([
    carregarConfiguracoes(),
    carregarEstadoCaixa()
]).then(() => {
    atualizarStatusCaixa();
});

// ========================================
// BUSCA DE PRODUTOS POR NOME
// ========================================

let timeoutBusca = null;

function abrirBuscaPorNome() {
    abrirModal('buscarProdutoModal');
    
    // Focar no input após um pequeno delay
    setTimeout(() => {
        const input = document.getElementById('inputBuscaProduto');
        if (input) {
            input.value = '';
            input.focus();
            document.getElementById('resultadosBusca').innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Digite para buscar produtos...</p>';
        }
    }, 100);
}

async function buscarProdutosPorNome(termo) {
    if (!termo || termo.length < 2) {
        document.getElementById('resultadosBusca').innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Digite pelo menos 2 caracteres...</p>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/produtos/buscar?termo=${encodeURIComponent(termo)}`);
        const produtos = await response.json();

        const container = document.getElementById('resultadosBusca');
        
        if (produtos.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #ff9800; padding: 40px; font-size: 18px;">Nenhum produto encontrado!</p>';
            return;
        }

        container.innerHTML = produtos.map(produto => `
            <div style="
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: white;
                transition: all 0.2s;
                cursor: pointer;
            " 
            onmouseover="this.style.borderColor='#667eea'; this.style.background='#f8f9ff'"
            onmouseout="this.style.borderColor='#e0e0e0'; this.style.background='white'"
            onclick="selecionarProdutoBusca('${produto.codigo_barras}')">
                <div style="flex: 1;">
                    <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 5px;">
                        ${produto.nome}
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        <span style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; margin-right: 10px;">
                            📦 ${produto.codigo_barras || 'Sem código'}
                        </span>
                        <span style="background: ${produto.estoque > 0 ? '#d4edda' : '#f8d7da'}; padding: 4px 8px; border-radius: 4px; color: ${produto.estoque > 0 ? '#155724' : '#721c24'};">
                            Estoque: ${produto.estoque}
                        </span>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: bold; color: #28a745;">
                        R$ ${parseFloat(produto.preco).toFixed(2)}
                    </div>
                    <button onclick="event.stopPropagation(); selecionarProdutoBusca('${produto.codigo_barras}')" 
                        style="
                            background: #28a745;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            font-size: 14px;
                            font-weight: bold;
                            cursor: pointer;
                            margin-top: 5px;
                        ">
                        ➕ Adicionar
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        document.getElementById('resultadosBusca').innerHTML = '<p style="text-align: center; color: #dc3545; padding: 40px;">Erro ao buscar produtos!</p>';
    }
}

function selecionarProdutoBusca(codigoBarras) {
    fecharModal('buscarProdutoModal');
    adicionarProduto(codigoBarras);
    setTimeout(() => {
        document.getElementById('searchInput').focus();
    }, 100);
}

// Inicializar busca quando o modal for carregado
document.addEventListener('modalsLoaded', () => {
    const inputBusca = document.getElementById('inputBuscaProduto');
    if (inputBusca) {
        inputBusca.addEventListener('input', function() {
            clearTimeout(timeoutBusca);
            timeoutBusca = setTimeout(() => {
                buscarProdutosPorNome(this.value.trim());
            }, 300);
        });

        inputBusca.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                fecharModal('buscarProdutoModal');
            }
        });
    }
});
