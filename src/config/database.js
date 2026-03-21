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
        queueLimit: 0,
        connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
        enableKeepAlive: true,
        keepAliveInitialDelay: Number(process.env.DB_KEEP_ALIVE_INITIAL_DELAY || 0),
        timezone: 'local'
    };

    if (!isProduction) {
        // Em desenvolvimento local, mantém valores padrão para facilitar setup.
        config.host = config.host || '127.0.0.1';
        config.user = config.user || 'root';
        config.password = config.password || '';
        config.database = config.database || 'BomboniereERP';
    }

    if (!config.host && process.env.MYSQLHOST) config.host = process.env.MYSQLHOST;
    if (!config.port && process.env.MYSQLPORT) config.port = Number(process.env.MYSQLPORT);
    if (!config.user && process.env.MYSQLUSER) config.user = process.env.MYSQLUSER;
    if (!config.password && process.env.MYSQLPASSWORD) config.password = process.env.MYSQLPASSWORD;
    if (!config.database && process.env.MYSQLDATABASE) config.database = process.env.MYSQLDATABASE;

    if (process.env.MYSQL_URL) {
        try {
            const parsedUrl = new URL(process.env.MYSQL_URL);
            config.host = config.host || parsedUrl.hostname;
            config.port = config.port || Number(parsedUrl.port || 3306);
            config.user = config.user || decodeURIComponent(parsedUrl.username || '');
            config.password = config.password || decodeURIComponent(parsedUrl.password || '');
            config.database = config.database || (parsedUrl.pathname || '').replace(/^\//, '');
        } catch (error) {
            console.warn('MYSQL_URL invalida. Ignorando parse da URL e usando variaveis DB_*/MYSQL* individuais.');
        }
    }

    return config;
}

function isTransientDbError(error) {
    if (!error) return false;

    const transientCodes = new Set([
        'PROTOCOL_CONNECTION_LOST',
        'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'EPIPE',
        'EAI_AGAIN',
        'ENOTFOUND'
    ]);

    if (transientCodes.has(error.code)) return true;

    const message = String(error.message || '').toLowerCase();
    return (
        message.includes('closed state') ||
        message.includes('connection is closed') ||
        message.includes('server has gone away')
    );
}

function createRetryWrapper(operationName, operation, maxAttempts = 3) {
    return async (...args) => {
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                return await operation(...args);
            } catch (error) {
                lastError = error;

                const shouldRetry = attempt < maxAttempts && isTransientDbError(error);
                if (!shouldRetry) {
                    throw error;
                }

                const delayMs = attempt * 300;
                console.warn(
                    `[DB] ${operationName} falhou por erro transitorio (${error.code || error.message}). ` +
                    `Tentativa ${attempt + 1}/${maxAttempts} em ${delayMs}ms...`
                );

                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        throw lastError;
    };
}

function makePoolResilient(dbPool) {
    const originalQuery = dbPool.query.bind(dbPool);
    const originalExecute = dbPool.execute.bind(dbPool);
    const originalGetConnection = dbPool.getConnection.bind(dbPool);

    dbPool.query = createRetryWrapper('query', originalQuery);
    dbPool.execute = createRetryWrapper('execute', originalExecute);
    dbPool.getConnection = createRetryWrapper('getConnection', originalGetConnection);

    return dbPool;
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

        pool = makePoolResilient(mysql.createPool(dbConfig));
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
