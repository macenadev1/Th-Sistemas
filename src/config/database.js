const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'BomboniereERP',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0
};

let pool;

async function initDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('Conectado ao MySQL com sucesso!');

        const connection = await pool.getConnection();
        console.log('Pool de conexoes criado!');
        connection.release();

        return pool;
    } catch (error) {
        console.error('Erro ao conectar ao MySQL:', error.message);
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
