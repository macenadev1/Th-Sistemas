// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const cron = require('node-cron');
const { initDatabase, getPool } = require('./config/database');
const TelegramBotService = require('./services/telegram-bot');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Importar rotas
const authRoutes = require('./routes/auth');
const produtosRoutes = require('./routes/produtos');
const vendasRoutes = require('./routes/vendas');
const caixaRoutes = require('./routes/caixa');
const configuracoesRoutes = require('./routes/configuracoes');
const clientesRoutes = require('./routes/clientes');
const fornecedoresRoutes = require('./routes/fornecedores');
const categoriasRoutes = require('./routes/categorias');
const financeiroRoutes = require('./routes/financeiro');

// Usar rotas
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/contas-pagar', financeiroRoutes);

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check endpoint (leve para verificar se servidor está online)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Job automático: Fechar mês todo dia 1º às 00:01
cron.schedule('1 0 1 * *', async () => {
    console.log('\n🔄 [CRON] Executando fechamento automático de mês...');
    
    try {
        const pool = getPool();
        const dataAtual = new Date();
        const mesAtual = dataAtual.getMonth(); // 0-11
        const anoAtual = dataAtual.getFullYear();
        
        // Mês anterior (o que está sendo fechado)
        const mesAnterior = mesAtual === 0 ? 12 : mesAtual;
        const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;
        
        // Fazer requisição interna para a rota de fechamento
        const axios = require('axios');
        const response = await axios.post(`http://localhost:${PORT}/api/contas-pagar/fechar-mes`, {
            ano: anoAnterior,
            mes: mesAnterior,
            forcar: false
        });
        
        if (response.data.success) {
            console.log(`✅ [CRON] Mês ${mesAnterior}/${anoAnterior} fechado automaticamente!`);
            console.log(`   Saldos transferidos para ${mesAtual + 1}/${anoAtual}:`);
            console.log(`   💵 Reposição: R$ ${response.data.dados.saldos_transferidos.reposicao.toFixed(2)}`);
            console.log(`   💰 Lucro: R$ ${response.data.dados.saldos_transferidos.lucro.toFixed(2)}`);
        }
    } catch (error) {
        if (error.response?.data?.error?.includes('já possui saldo')) {
            console.log('ℹ️  [CRON] Mês já foi fechado anteriormente (pulando)');
        } else {
            console.error('❌ [CRON] Erro ao fechar mês automaticamente:', error.message);
        }
    }
}, {
    timezone: "America/Sao_Paulo"
});

// Inicializar Telegram Bot
let telegramBot = null;
try {
    telegramBot = new TelegramBotService();
    // Disponibilizar globalmente para uso nas rotas
    global.telegramBot = telegramBot;
} catch (error) {
    console.warn('⚠️  Telegram Bot não inicializado:', error.message);
}

// Iniciar servidor
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
        console.log(`📱 Abra no navegador: http://localhost:${PORT}`);
        console.log(`\n📊 Sistema PDV com MySQL pronto para uso!`);
        console.log(`⏰ Job automático agendado: Fechamento de mês todo dia 1º às 00:01`);
        if (telegramBot && telegramBot.bot) {
            console.log(`🤖 Telegram Bot: @bomboniere_pdv_bot (ativo)\n`);
        } else {
            console.log(`⚠️  Telegram Bot: Não configurado (configure TELEGRAM_BOT_TOKEN no .env)\n`);
        }
    });
}).catch(error => {
    console.error('Erro ao inicializar:', error);
    process.exit(1);
});
