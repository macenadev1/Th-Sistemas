const mysql = require('mysql2/promise');

const isProduction = process.env.NODE_ENV === 'production';

function getDbConfig() {
    const config = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
        queueLimit: 0
    };

    if (!isProduction) {
        // Em desenvolvimento local, mantém valores padrão para facilitar setup.
        config.host = config.host || '127.0.0.1';
        config.user = config.user || 'root';
        config.password = config.password || '';
        config.database = config.database || 'BomboniereERP';
    }

    return config;
}

function validateDbConfig(config) {
    const required = ['host', 'user', 'database'];
    const missing = required.filter((key) => !config[key]);

    if (missing.length > 0) {
        throw new Error(
            `Configuracao do banco incompleta. Variaveis ausentes: ${missing.join(', ')}. ` +
            'Configure DB_HOST, DB_USER e DB_NAME no ambiente.'
        );
    }
}

const dbConfig = {
    ...getDbConfig()
};

let pool;

async function initDatabase() {
    try {
        validateDbConfig(dbConfig);

        pool = mysql.createPool(dbConfig);
        console.log(`Tentando conectar ao MySQL em ${dbConfig.host}:${dbConfig.port} (database: ${dbConfig.database})`);

        const connection = await pool.getConnection();
        console.log('Conectado ao MySQL com sucesso!');
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
