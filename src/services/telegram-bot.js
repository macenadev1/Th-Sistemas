const TelegramBot = require('node-telegram-bot-api');

class TelegramBotService {
    constructor() {
        // Token do BotFather
        const token = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!token) {
            console.warn('⚠️  TELEGRAM_BOT_TOKEN não configurado no .env');
            this.bot = null;
            return;
        }
        
        // Criar bot (polling = buscar mensagens ativamente)
        this.bot = new TelegramBot(token, { polling: true });
        
        // Chat ID padrão (do dono da loja)
        this.chatIdPadrao = process.env.TELEGRAM_CHAT_ID;
        
        console.log('✅ Telegram Bot inicializado!');
        console.log(`📱 Bot: @bomboniere_pdv_bot`);
        
        // Configurar comandos e listeners
        this.configurarComandos();
    }
    
    configurarComandos() {
        if (!this.bot) return;
        
        // Comando /start - Boas-vindas
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const nome = msg.from.first_name || 'Usuário';
            
            this.bot.sendMessage(chatId, 
                `🏪 *Bem-vindo ao Bot da Bomboniere, ${nome}!*\n\n` +
                `Você receberá notificações de:\n` +
                `✅ Vendas realizadas\n` +
                `✅ Cupons fiscais\n` +
                `✅ Fechamentos de caixa\n` +
                `✅ Alertas de estoque baixo\n\n` +
                `📋 *Comandos disponíveis:*\n` +
                `/status - Ver status da loja\n` +
                `/vendas - 📊 Estatísticas de vendas de hoje\n` +
                `/caixa - Status do caixa\n` +
                `/estoque - Produtos com estoque baixo\n` +
                `/help - Lista de comandos\n\n` +
                `🆔 *Seu Chat ID:* \`${chatId}\`\n` +
                `_(Configure este ID no arquivo .env como TELEGRAM_CHAT_ID)_`,
                { parse_mode: 'Markdown' }
            );
            
            console.log(`✅ Comando /start recebido de: ${nome} (${chatId})`);
        });
        
        // Comando /help - Ajuda
        this.bot.onText(/\/help/, (msg) => {
            const chatId = msg.chat.id;
            
            this.bot.sendMessage(chatId,
                `📋 *COMANDOS DISPONÍVEIS*\n\n` +
                `/start - Iniciar bot e ver instruções\n` +
                `/status - Ver status geral da loja\n` +
                `/vendas - 📊 Ver estatísticas de vendas de hoje\n` +
                `/caixa - Ver status do caixa\n` +
                `/estoque - Ver produtos com estoque baixo\n` +
                `/help - Mostrar esta mensagem\n\n` +
                `💡 _O bot envia notificações automáticas de vendas, fechamentos e alertas._`,
                { parse_mode: 'Markdown' }
            );
        });
        
        // Comando /status - Status geral
        this.bot.onText(/\/status/, async (msg) => {
            const chatId = msg.chat.id;
            
            try {
                // Aqui você pode buscar dados reais do banco
                // Por enquanto, mensagem genérica
                await this.bot.sendMessage(chatId,
                    `📊 *STATUS DA LOJA*\n\n` +
                    `🏪 Sistema: Online\n` +
                    `💰 Caixa: Consulte /caixa\n` +
                    `🛒 Vendas: Consulte /vendas\n` +
                    `📦 Estoque: Consulte /estoque\n\n` +
                    `_Use os comandos específicos para mais detalhes_`,
                    { parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.error('❌ Erro ao processar /status:', error);
            }
        });
        
        // Comando /vendas - Vendas do dia
        this.bot.onText(/\/vendas/, async (msg) => {
            const chatId = msg.chat.id;
            
            try {
                await this.bot.sendMessage(chatId, '⏳ Carregando estatísticas de vendas...');
                
                const estatisticas = await this.buscarEstatisticasVendas();
                
                if (!estatisticas.success) {
                    await this.bot.sendMessage(chatId,
                        `❌ *ERRO AO CARREGAR VENDAS*\n\n` +
                        `${estatisticas.error || 'Erro desconhecido'}`,
                        { parse_mode: 'Markdown' }
                    );
                    return;
                }
                
                const dados = estatisticas.dados;
                
                let mensagem = `🛒 *VENDAS DE HOJE*\n`;
                mensagem += `📅 ${new Date().toLocaleDateString('pt-BR')}\n\n`;
                mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
                
                // Estatísticas gerais
                mensagem += `📊 *RESUMO*\n\n`;
                mensagem += `🧾 Total de vendas: *${dados.totalVendas}*\n`;
                mensagem += `💰 Valor total: *R$ ${dados.valorTotal.toFixed(2)}*\n`;
                mensagem += `📈 Ticket médio: *R$ ${dados.ticketMedio.toFixed(2)}*\n`;
                mensagem += `📦 Itens vendidos: *${dados.totalItens}*\n\n`;
                
                // Produtos mais vendidos (top 5)
                if (dados.produtosMaisVendidos && dados.produtosMaisVendidos.length > 0) {
                    mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
                    mensagem += `🏆 *TOP ${Math.min(5, dados.produtosMaisVendidos.length)} MAIS VENDIDOS*\n\n`;
                    
                    dados.produtosMaisVendidos.slice(0, 5).forEach((produto, index) => {
                        const posicao = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
                        mensagem += `${posicao} *${produto.nome}*\n`;
                        mensagem += `   ${produto.quantidade} un. • R$ ${produto.valorTotal.toFixed(2)}\n\n`;
                    });
                } else {
                    mensagem += `\n_Nenhuma venda registrada hoje_`;
                }
                
                mensagem += `\n━━━━━━━━━━━━━━━━━━━━\n`;
                mensagem += `\n💡 _Atualizado em ${new Date().toLocaleTimeString('pt-BR')}_`;
                
                await this.bot.sendMessage(chatId, mensagem, { parse_mode: 'Markdown' });
                
            } catch (error) {
                console.error('❌ Erro ao processar /vendas:', error);
                await this.bot.sendMessage(chatId,
                    `❌ Erro ao buscar vendas. Tente novamente mais tarde.`
                );
            }
        });
        
        // Comando /caixa - Status do caixa
        this.bot.onText(/\/caixa/, async (msg) => {
            const chatId = msg.chat.id;
            
            await this.bot.sendMessage(chatId,
                `💰 *STATUS DO CAIXA*\n\n` +
                `_Funcionalidade em desenvolvimento..._\n` +
                `Em breve você poderá ver:\n` +
                `• Status (aberto/fechado)\n` +
                `• Saldo atual\n` +
                `• Total de vendas\n` +
                `• Movimentações`,
                { parse_mode: 'Markdown' }
            );
        });
        
        // Comando /estoque - Produtos com estoque baixo
        this.bot.onText(/\/estoque/, async (msg) => {
            const chatId = msg.chat.id;
            
            await this.bot.sendMessage(chatId,
                `📦 *ESTOQUE BAIXO*\n\n` +
                `_Funcionalidade em desenvolvimento..._\n` +
                `Em breve você verá a lista de produtos com estoque crítico.`,
                { parse_mode: 'Markdown' }
            );
        });
        
        // Handler para mensagens não reconhecidas
        this.bot.on('message', (msg) => {
            // Ignorar comandos conhecidos
            if (msg.text && msg.text.startsWith('/')) {
                const comando = msg.text.split(' ')[0];
                const comandosConhecidos = ['/start', '/help', '/status', '/vendas', '/caixa', '/estoque'];
                
                if (!comandosConhecidos.includes(comando)) {
                    this.bot.sendMessage(msg.chat.id,
                        `❓ Comando não reconhecido: ${comando}\n\n` +
                        `Use /help para ver os comandos disponíveis.`
                    );
                }
            }
        });
        
        // Log de erros
        this.bot.on('polling_error', (error) => {
            console.error('❌ Erro no polling do Telegram:', error.code);
        });
    }
    
    /**
     * Buscar estatísticas de vendas do dia
     */
    async buscarEstatisticasVendas() {
        try {
            const { getPool } = require('../config/database');
            const pool = getPool();
            
            // Buscar vendas de hoje
            const [vendas] = await pool.query(
                `SELECT 
                    COUNT(*) as total_vendas,
                    COALESCE(SUM(total), 0) as valor_total,
                    COALESCE(SUM(quantidade_itens), 0) as total_itens
                FROM vendas 
                WHERE DATE(data_venda) = CURDATE()`
            );
            
            const totalVendas = vendas[0].total_vendas;
            const valorTotal = parseFloat(vendas[0].valor_total);
            const totalItens = vendas[0].total_itens;
            const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
            
            // Buscar produtos mais vendidos de hoje
            const [produtosMaisVendidos] = await pool.query(
                `SELECT 
                    iv.nome_produto as nome,
                    SUM(iv.quantidade) as quantidade,
                    SUM(iv.subtotal) as valor_total
                FROM itens_venda iv
                INNER JOIN vendas v ON iv.venda_id = v.id
                WHERE DATE(v.data_venda) = CURDATE()
                GROUP BY iv.nome_produto
                ORDER BY quantidade DESC
                LIMIT 10`
            );
            
            return {
                success: true,
                dados: {
                    totalVendas,
                    valorTotal,
                    ticketMedio,
                    totalItens,
                    produtosMaisVendidos: produtosMaisVendidos.map(p => ({
                        nome: p.nome,
                        quantidade: parseInt(p.quantidade),
                        valorTotal: parseFloat(p.valor_total)
                    }))
                }
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas de vendas:', error);
            return {
                success: false,
                error: 'Erro ao consultar banco de dados: ' + error.message
            };
        }
    }

    /**
     * Enviar cupom de venda via Telegram
     */
    async enviarCupomVenda(venda) {
        if (!this.bot || !this.chatIdPadrao) {
            console.warn('⚠️  Bot não configurado ou Chat ID não definido');
            return { success: false, message: 'Bot não configurado' };
        }
        
        const cupom = this.gerarTextoCupom(venda);
        
        try {
            await this.bot.sendMessage(this.chatIdPadrao, cupom, {
                parse_mode: 'Markdown'
            });
            
            console.log(`✅ Cupom #${venda.id} enviado via Telegram`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao enviar cupom no Telegram:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Enviar alerta de estoque baixo
     */
    async enviarAlertaEstoque(produtos) {
        if (!this.bot || !this.chatIdPadrao) return { success: false };
        
        let mensagem = `⚠️ *ALERTA DE ESTOQUE BAIXO*\n\n`;
        mensagem += `${produtos.length} produto(s) precisam de reposição:\n\n`;
        
        produtos.slice(0, 10).forEach(p => {
            const estoque = p.estoque || 0;
            const minimo = p.estoque_minimo || 0;
            const icone = estoque === 0 ? '🔴' : '🟡';
            
            mensagem += `${icone} *${p.nome}*\n`;
            mensagem += `   Atual: ${estoque} un. | Mínimo: ${minimo} un.\n\n`;
        });
        
        if (produtos.length > 10) {
            mensagem += `_... e mais ${produtos.length - 10} produto(s)_\n\n`;
        }
        
        mensagem += `📊 Use /estoque para ver a lista completa`;
        
        try {
            await this.bot.sendMessage(this.chatIdPadrao, mensagem, {
                parse_mode: 'Markdown'
            });
            
            console.log(`✅ Alerta de estoque enviado (${produtos.length} produtos)`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao enviar alerta:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Enviar notificação de fechamento de caixa
     */
    async enviarFechamentoCaixa(dados) {
        if (!this.bot || !this.chatIdPadrao) return { success: false };
        
        const diferenca = dados.saldoReal - dados.saldoEsperado;
        const icone = diferenca === 0 ? '✅' : diferenca > 0 ? '💰' : '⚠️';
        
        let mensagem = `${icone} *CAIXA FECHADO*\n\n`;
        mensagem += `👤 Operador: ${dados.operador}\n`;
        mensagem += `📅 ${new Date().toLocaleString('pt-BR')}\n\n`;
        mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        mensagem += `💵 Abertura: R$ ${dados.valorAbertura.toFixed(2)}\n`;
        mensagem += `🛒 Vendas: R$ ${dados.totalVendas.toFixed(2)}\n`;
        mensagem += `➕ Reforços: R$ ${dados.totalReforcos.toFixed(2)}\n`;
        mensagem += `➖ Sangrias: R$ ${dados.totalSangrias.toFixed(2)}\n\n`;
        mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        mensagem += `💰 Esperado: R$ ${dados.saldoEsperado.toFixed(2)}\n`;
        mensagem += `💵 Real: R$ ${dados.saldoReal.toFixed(2)}\n`;
        
        if (diferenca !== 0) {
            const texto = diferenca > 0 ? 'SOBRA' : 'FALTA';
            mensagem += `\n${icone} *${texto}: R$ ${Math.abs(diferenca).toFixed(2)}*`;
        } else {
            mensagem += `\n✅ *CAIXA BATIDO!*`;
        }
        
        try {
            await this.bot.sendMessage(this.chatIdPadrao, mensagem, {
                parse_mode: 'Markdown'
            });
            
            console.log(`✅ Fechamento de caixa enviado via Telegram`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao enviar fechamento:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Gerar texto do cupom fiscal
     */
    gerarTextoCupom(venda) {
        const dataHora = new Date().toLocaleString('pt-BR');
        
        let cupom = `🧾 *CUPOM FISCAL - BOMBONIERE*\n\n`;
        cupom += `📅 ${dataHora}\n`;
        cupom += `🔢 Venda: #${venda.id}\n`;
        cupom += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        venda.itens.forEach(item => {
            const subtotal = (item.preco * item.quantidade).toFixed(2);
            cupom += `${item.quantidade}x ${item.nome}\n`;
            cupom += `   R$ ${item.preco.toFixed(2)} = R$ ${subtotal}\n`;
        });
        
        cupom += `\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        cupom += `💰 *TOTAL: R$ ${venda.total.toFixed(2)}*\n\n`;
        
        if (venda.formasPagamento && venda.formasPagamento.length > 0) {
            cupom += `💳 *Pagamento:*\n`;
            const nomes = { 
                dinheiro: '💵 Dinheiro', 
                debito: '💳 Débito', 
                credito: '💳 Crédito', 
                pix: '📱 PIX' 
            };
            venda.formasPagamento.forEach(fp => {
                cupom += `${nomes[fp.forma]}: R$ ${fp.valor.toFixed(2)}\n`;
            });
            cupom += `\n`;
        }
        
        if (venda.troco && venda.troco > 0) {
            cupom += `💵 Troco: R$ ${venda.troco.toFixed(2)}\n\n`;
        }
        
        cupom += `_Obrigado pela preferência! 🙏_`;
        
        return cupom;
    }
    
    /**
     * Enviar mensagem personalizada
     */
    async enviarMensagem(mensagem, chatId = null) {
        if (!this.bot) return { success: false };
        
        const destinatario = chatId || this.chatIdPadrao;
        
        if (!destinatario) {
            console.warn('⚠️  Chat ID não definido');
            return { success: false };
        }
        
        try {
            await this.bot.sendMessage(destinatario, mensagem, {
                parse_mode: 'Markdown'
            });
            
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = TelegramBotService;
