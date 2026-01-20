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

        if (produto.estoque <= 0) {
            mostrarNotificacao(`Produto "${produto.nome}" sem estoque!`, 'error');
            return;
        }

        // Verifica se já existe no carrinho
        const itemExistente = carrinho.find(item => item.codigo === codigo);
        if (itemExistente) {
            const novaQuantidade = itemExistente.quantidade + quantidadeDesejada;
            if (novaQuantidade <= produto.estoque) {
                itemExistente.quantidade = novaQuantidade;
            } else {
                mostrarNotificacao(`Estoque insuficiente! Disponível: ${produto.estoque}, no carrinho: ${itemExistente.quantidade}`, 'error');
                return;
            }
        } else {
            if (quantidadeDesejada <= produto.estoque) {
                carrinho.push({
                    codigo: codigo,
                    nome: produto.nome,
                    preco: parseFloat(produto.preco),
                    quantidade: quantidadeDesejada
                });
            } else {
                mostrarNotificacao(`Estoque insuficiente! Disponível: ${produto.estoque}`, 'error');
                return;
            }
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
        cartItemsDiv.innerHTML = carrinho.map((item, index) => `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-name">${item.nome}</div>
                    <div class="item-details">
                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                            <span style="color: #666;">Qtd:</span>
                            <div style="display: flex; align-items: center; gap: 5px; background: #f8f9fa; padding: 5px; border-radius: 6px; border: 2px solid #667eea;">
                                <button onclick="alterarQuantidadeItem(${index}, -1)" style="
                                    background: #dc3545;
                                    color: white;
                                    border: none;
                                    width: 28px;
                                    height: 28px;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 18px;
                                    font-weight: bold;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                " title="Diminuir quantidade">−</button>
                                <input 
                                    type="number" 
                                    id="qtd-${index}"
                                    value="${item.quantidade}" 
                                    min="1"
                                    onchange="atualizarQuantidadeItem(${index}, this.value)"
                                    onclick="this.select()"
                                    style="
                                        width: 60px;
                                        text-align: center;
                                        border: none;
                                        background: white;
                                        font-size: 16px;
                                        font-weight: bold;
                                        padding: 5px;
                                        border-radius: 4px;
                                    ">
                                <button onclick="alterarQuantidadeItem(${index}, 1)" style="
                                    background: #28a745;
                                    color: white;
                                    border: none;
                                    width: 28px;
                                    height: 28px;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 18px;
                                    font-weight: bold;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                " title="Aumentar quantidade">+</button>
                            </div>
                            <span style="color: #666;">x R$ ${item.preco.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="item-price">R$ ${(item.preco * item.quantidade).toFixed(2)}</div>
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
        `).join('');
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
    
    // Confirmar remoção
    if (confirm(`Remover "${item.nome}" (${item.quantidade}x) do carrinho?`)) {
        carrinho.splice(index, 1);
        atualizarCarrinho();
        mostrarNotificacao(`✓ ${item.nome} removido do carrinho!`, 'info');
    }
}

// Atualizar quantidade de um item específico
function atualizarQuantidadeItem(index, novaQuantidade) {
    if (index < 0 || index >= carrinho.length) {
        mostrarNotificacao('Item inválido!', 'error');
        return;
    }
    
    const quantidade = parseInt(novaQuantidade);
    
    if (isNaN(quantidade) || quantidade < 1) {
        mostrarNotificacao('Quantidade inválida!', 'error');
        atualizarCarrinho();
        return;
    }
    
    const item = carrinho[index];
    const quantidadeAnterior = item.quantidade;
    
    carrinho[index].quantidade = quantidade;
    atualizarCarrinho();
    
    if (quantidade > quantidadeAnterior) {
        mostrarNotificacao(`✓ Quantidade de "${item.nome}" aumentada para ${quantidade}`, 'success');
    } else {
        mostrarNotificacao(`✓ Quantidade de "${item.nome}" reduzida para ${quantidade}`, 'info');
    }
}

// Aumentar ou diminuir quantidade
function alterarQuantidadeItem(index, incremento) {
    if (index < 0 || index >= carrinho.length) {
        mostrarNotificacao('Item inválido!', 'error');
        return;
    }
    
    const novaQuantidade = carrinho[index].quantidade + incremento;
    
    if (novaQuantidade < 1) {
        // Se tentar diminuir abaixo de 1, perguntar se quer remover
        if (confirm(`Remover "${carrinho[index].nome}" do carrinho?`)) {
            removerItemCarrinho(index);
        }
        return;
    }
    
    atualizarQuantidadeItem(index, novaQuantidade);
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

    // NÃO resetar pagamentos - mantém os pagamentos já adicionados
    // Apenas atualiza os valores baseado no novo total
    
    const total = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    const faltante = total - totalPago;
    
    document.getElementById('totalFinal').textContent = `R$ ${total.toFixed(2)}`;
    
    // Se já tem pagamentos, mostra o que já foi pago
    if (pagamentos.length > 0) {
        mostrarNotificacao(`Pagamentos anteriores mantidos! Falta: R$ ${faltante.toFixed(2)}`, 'info');
    }
    
    const valorInput = document.getElementById('valorPagamento');
    if (valorInput.resetarValor) {
        valorInput.resetarValor();
    } else {
        valorInput.value = '';
    }
    
    abrirModal('finalizacaoModal');
    
    // Atualizar interface com os pagamentos existentes
    atualizarPagamentos();
    
    setTimeout(() => {
        document.getElementById('valorPagamento').focus();
    }, 100);
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
    console.log('🔧 Inicializando input de pagamento...');
    const valorPagamentoInput = document.getElementById('valorPagamento');
    if (valorPagamentoInput) {
        console.log('✅ Input de pagamento encontrado!');
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
console.log('📋 Registrando listener para modalsLoaded...');
document.addEventListener('modalsLoaded', () => {
    console.log('🎯 Evento modalsLoaded recebido!');
    inicializarInputPagamento();
});
// Caso os modais já tenham sido carregados antes deste script
if (document.getElementById('valorPagamento')) {
    console.log('🔄 Modal já carregado, inicializando agora...');
    inicializarInputPagamento();
}

async function confirmarVenda() {
    if (!caixaAberto) {
        mostrarNotificacao('⚠️ Caixa fechado! Não é possível finalizar a venda.', 'error');
        return;
    }

    const total = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
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
                total: total,
                valor_pago: totalPago,
                troco: troco,
                formas_pagamento: pagamentos
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao finalizar venda');
        }

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
        
        carrinho = [];
        pagamentos = [];
        atualizarCarrinho();
        fecharModal();
        searchInput.focus();
    } catch (error) {
        console.error('Erro ao finalizar venda:', error);
        mostrarNotificacao(error.message, 'error');
    }
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

console.log('🚀 Sistema PDV MySQL inicializado!');

// Inicializar: carregar configurações primeiro, depois estado do caixa
Promise.all([
    carregarConfiguracoes(),
    carregarEstadoCaixa()
]).then(() => {
    atualizarStatusCaixa();
    console.log('✅ Sistema inicializado com configurações');
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
