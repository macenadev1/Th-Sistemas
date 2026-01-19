const mysql = require('mysql2/promise');

const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '@Bomboniere2025',
    database: 'BomboniereERP',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

async function initDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('✅ Conectado ao MySQL com sucesso!');
        
        // Testar conexão
        const connection = await pool.getConnection();
        console.log('✅ Pool de conexões criado!');
        connection.release();
        
        return pool;
    } catch (error) {
        console.error('❌ Erro ao conectar ao MySQL:', error.message);
        console.log('\n📝 Instruções:');
        console.log('1. Certifique-se que o MySQL está rodando');
        console.log('2. Configure user/password no src/config/database.js');
        console.log('3. Execute o arquivo database/database.sql no MySQL');
        throw error;
    }
}

function getPool() {
    if (!pool) {
        throw new Error('Database pool not initialized');
    }
    return pool;
}

module.exports = {
    initDatabase,
    getPool,
    dbConfig
};
