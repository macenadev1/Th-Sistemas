const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { initDatabase } = require('./config/database');

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

// Usar rotas
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/configuracoes', configuracoesRoutes);

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
        console.log(`📱 Abra no navegador: http://localhost:${PORT}`);
        console.log(`\n📊 Sistema PDV com MySQL pronto para uso!\n`);
    });
}).catch(error => {
    console.error('Erro ao inicializar:', error);
    process.exit(1);
});
