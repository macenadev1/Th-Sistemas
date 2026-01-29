/**
 * Script de Migração de Produtos - CSV para BomboniereERP
 * 
 * Migra produtos do sistema antigo para o novo sistema
 * - Cria categorias automaticamente
 * - Valida dados antes de inserir
 * - Pula produtos problemáticos
 * - Gera relatório detalhado
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '@Bomboniere2025',
    database: 'BomboniereERP'
};

// Caminho do arquivo CSV
const CSV_PATH = 'C:\\Users\\ADM\\Downloads\\Produtos.csv';

// Mapeamento inteligente de categorias
const CATEGORIA_MAPPING = {
    // Categorias explícitas do CSV
    'ALFAJOR': 'Alfajores',
    'SALGADINHO': 'Salgadinhos',
    
    // Categorização inteligente por palavras-chave
    'keywords': [
        { palavras: ['CHOCOLATE', 'CHOC', 'LACTA', 'HERSHEY', 'DIAMANTE', 'SONHO DE VALSA', 'OREO', 'SHOT', 'M&M'], categoria: 'Chocolates' },
        { palavras: ['BISCOITO', 'COOKIE'], categoria: 'Biscoitos' },
        { palavras: ['BALA', 'BOMBOM', 'DROPS'], categoria: 'Balas e Bombons' },
        { palavras: ['PIPOCA'], categoria: 'Pipocas' },
        { palavras: ['SALGADINHO', 'FOFURA', 'TORCIDA', 'LOBITOS', 'FLAME', 'POINT'], categoria: 'Salgadinhos' },
        { palavras: ['ALFAJOR', 'TORTUGUITA', 'TOTUGUITA'], categoria: 'Alfajores' },
        { palavras: ['PÃO DE MEL', 'TETA DE NEGA'], categoria: 'Doces Regionais' },
        { palavras: ['GELATINE', 'DOCILE', 'GELATIN'], categoria: 'Gelatinas' },
        { palavras: ['MARSHMALLOW', 'MAXMALLOWS'], categoria: 'Marshmallows' },
        { palavras: ['CHICLETE', 'TRIDENT', 'GOMA'], categoria: 'Chicletes' },
        { palavras: ['AMENDOIM', 'OVINHOS'], categoria: 'Amendoins' }
    ]
};

// Estatísticas da migração
const stats = {
    total: 0,
    sucesso: 0,
    pulados: 0,
    erros: 0,
    categoriasCriadas: 0,
    produtosPulados: []
};

/**
 * Parse CSV manualmente (mais robusto que bibliotecas)
 */
function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(';').map(h => h.replace(/"/g, '').trim());
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        // Parser robusto para CSV com aspas
        for (let char of lines[i]) {
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ';' && !insideQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        
        // Criar objeto produto
        const product = {};
        headers.forEach((header, index) => {
            product[header] = values[index] || '';
        });
        
        products.push(product);
    }
    
    return products;
}

/**
 * Determina categoria inteligente do produto
 */
function determinarCategoria(produto) {
    const nome = produto['Descrição'].toUpperCase();
    const categoriaCSV = produto['Categoria do Produto'].toUpperCase();
    
    // Se tem categoria explícita no CSV
    if (categoriaCSV && CATEGORIA_MAPPING[categoriaCSV]) {
        return CATEGORIA_MAPPING[categoriaCSV];
    }
    
    // Categorização inteligente por palavras-chave
    for (const rule of CATEGORIA_MAPPING.keywords) {
        for (const palavra of rule.palavras) {
            if (nome.includes(palavra)) {
                return rule.categoria;
            }
        }
    }
    
    // Categoria padrão
    return 'Diversos';
}

/**
 * Valida se produto tem dados essenciais
 */
function validarProduto(produto) {
    const erros = [];
    
    // Código de barras obrigatório
    const codigo = produto['Código de Barras'];
    if (!codigo || codigo.length < 3) {
        erros.push('Código de barras inválido ou ausente');
    }
    
    // Nome obrigatório
    const nome = produto['Descrição'];
    if (!nome || nome.length < 3) {
        erros.push('Nome/descrição inválido ou ausente');
    }
    
    // Preço de venda obrigatório
    const preco = parseFloat(produto['Preço Venda Varejo'].replace(',', '.'));
    if (isNaN(preco) || preco <= 0) {
        erros.push('Preço de venda inválido (zerado ou ausente)');
    }
    
    return {
        valido: erros.length === 0,
        erros: erros
    };
}

/**
 * Converte produto do CSV para formato do sistema
 */
function converterProduto(produto, categoriaId) {
    return {
        codigo_barras: produto['Código de Barras'],
        nome: produto['Descrição'].substring(0, 255), // Limite de 255 caracteres
        preco: parseFloat(produto['Preço Venda Varejo'].replace(',', '.')) || 0,
        preco_custo: parseFloat(produto['Preço de Custo'].replace(',', '.')) || 0,
        desconto_percentual: 0,
        estoque: 0, // NÃO migrar estoque
        estoque_minimo: 0, // NÃO migrar estoque mínimo
        categoria_id: categoriaId,
        fornecedor_id: null,
        ativo: produto['Ativo'].toUpperCase() === 'SIM' ? 1 : 0
    };
}

/**
 * Migração principal
 */
async function migrarProdutos() {
    let connection;
    
    try {
        console.log('\n🚀 INICIANDO MIGRAÇÃO DE PRODUTOS');
        console.log('=' .repeat(60));
        
        // Ler arquivo CSV
        console.log('\n📁 Lendo arquivo CSV...');
        if (!fs.existsSync(CSV_PATH)) {
            throw new Error(`Arquivo não encontrado: ${CSV_PATH}`);
        }
        
        const content = fs.readFileSync(CSV_PATH, 'utf-8');
        const produtos = parseCSV(content);
        stats.total = produtos.length;
        
        console.log(`✅ ${stats.total} produtos encontrados no CSV`);
        
        // Conectar ao banco
        console.log('\n🔌 Conectando ao banco de dados...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado ao MySQL');
        
        // Mapear categorias
        console.log('\n📂 Analisando e criando categorias...');
        const categoriasMap = new Map();
        const categoriasSet = new Set();
        
        // Primeira passagem: identificar todas as categorias
        for (const produto of produtos) {
            const validacao = validarProduto(produto);
            if (validacao.valido) {
                const categoria = determinarCategoria(produto);
                categoriasSet.add(categoria);
            }
        }
        
        // Criar categorias no banco
        for (const categoriaNome of categoriasSet) {
            try {
                // Verificar se já existe
                const [existing] = await connection.query(
                    'SELECT id FROM categorias_produtos WHERE nome = ?',
                    [categoriaNome]
                );
                
                if (existing.length > 0) {
                    categoriasMap.set(categoriaNome, existing[0].id);
                } else {
                    // Criar nova categoria
                    const [result] = await connection.query(
                        'INSERT INTO categorias_produtos (nome, descricao, ativo) VALUES (?, ?, TRUE)',
                        [categoriaNome, `Categoria ${categoriaNome} - Migração automática`]
                    );
                    categoriasMap.set(categoriaNome, result.insertId);
                    stats.categoriasCriadas++;
                }
            } catch (error) {
                console.error(`⚠️  Erro ao criar categoria ${categoriaNome}:`, error.message);
            }
        }
        
        console.log(`✅ ${stats.categoriasCriadas} categorias criadas`);
        console.log(`ℹ️  ${categoriasMap.size} categorias disponíveis`);
        
        // Migrar produtos
        console.log('\n📦 Migrando produtos...');
        console.log('━'.repeat(60));
        
        let contador = 0;
        for (const produto of produtos) {
            contador++;
            const validacao = validarProduto(produto);
            
            if (!validacao.valido) {
                stats.pulados++;
                stats.produtosPulados.push({
                    codigo: produto['Código de Barras'] || 'SEM CÓDIGO',
                    nome: produto['Descrição'] || 'SEM NOME',
                    motivo: validacao.erros.join(', ')
                });
                continue;
            }
            
            try {
                const categoria = determinarCategoria(produto);
                const categoriaId = categoriasMap.get(categoria);
                const produtoConvertido = converterProduto(produto, categoriaId);
                
                // Verificar se já existe (evitar duplicatas)
                const [existing] = await connection.query(
                    'SELECT id FROM produtos WHERE codigo_barras = ?',
                    [produtoConvertido.codigo_barras]
                );
                
                if (existing.length > 0) {
                    // Atualizar produto existente
                    await connection.query(
                        `UPDATE produtos SET 
                            nome = ?,
                            preco = ?,
                            preco_custo = ?,
                            categoria_id = ?,
                            ativo = ?
                         WHERE codigo_barras = ?`,
                        [
                            produtoConvertido.nome,
                            produtoConvertido.preco,
                            produtoConvertido.preco_custo,
                            produtoConvertido.categoria_id,
                            produtoConvertido.ativo,
                            produtoConvertido.codigo_barras
                        ]
                    );
                } else {
                    // Inserir novo produto
                    await connection.query(
                        `INSERT INTO produtos (
                            codigo_barras, nome, preco, preco_custo, 
                            desconto_percentual, estoque, estoque_minimo,
                            categoria_id, fornecedor_id, ativo
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            produtoConvertido.codigo_barras,
                            produtoConvertido.nome,
                            produtoConvertido.preco,
                            produtoConvertido.preco_custo,
                            produtoConvertido.desconto_percentual,
                            produtoConvertido.estoque,
                            produtoConvertido.estoque_minimo,
                            produtoConvertido.categoria_id,
                            produtoConvertido.fornecedor_id,
                            produtoConvertido.ativo
                        ]
                    );
                }
                
                stats.sucesso++;
                
                // Progress bar
                if (contador % 50 === 0) {
                    const progresso = Math.round((contador / stats.total) * 100);
                    console.log(`   ⏳ Progresso: ${contador}/${stats.total} (${progresso}%) - ${stats.sucesso} sucesso, ${stats.pulados} pulados`);
                }
                
            } catch (error) {
                stats.erros++;
                stats.produtosPulados.push({
                    codigo: produto['Código de Barras'] || 'SEM CÓDIGO',
                    nome: produto['Descrição'] || 'SEM NOME',
                    motivo: `Erro: ${error.message}`
                });
            }
        }
        
        console.log('━'.repeat(60));
        console.log('✅ Migração concluída!');
        
        // Relatório final
        console.log('\n📊 RELATÓRIO DE MIGRAÇÃO');
        console.log('=' .repeat(60));
        console.log(`📦 Total de produtos no CSV: ${stats.total}`);
        console.log(`✅ Produtos migrados com sucesso: ${stats.sucesso}`);
        console.log(`⚠️  Produtos pulados: ${stats.pulados}`);
        console.log(`❌ Erros: ${stats.erros}`);
        console.log(`📂 Categorias criadas: ${stats.categoriasCriadas}`);
        console.log('=' .repeat(60));
        
        // Detalhes dos produtos pulados
        if (stats.produtosPulados.length > 0) {
            console.log('\n⚠️  PRODUTOS PULADOS:');
            console.log('─'.repeat(60));
            
            const maxMostrar = 20;
            const produtosParaMostrar = stats.produtosPulados.slice(0, maxMostrar);
            
            for (const produto of produtosParaMostrar) {
                console.log(`   🔸 ${produto.codigo} - ${produto.nome.substring(0, 40)}`);
                console.log(`      Motivo: ${produto.motivo}`);
            }
            
            if (stats.produtosPulados.length > maxMostrar) {
                console.log(`\n   ... e mais ${stats.produtosPulados.length - maxMostrar} produtos pulados`);
            }
        }
        
        // Salvar relatório em arquivo
        const relatorio = {
            data: new Date().toISOString(),
            estatisticas: stats,
            produtosPulados: stats.produtosPulados
        };
        
        const relatorioPath = path.join(__dirname, '..', 'relatorio-migracao.json');
        fs.writeFileSync(relatorioPath, JSON.stringify(relatorio, null, 2));
        console.log(`\n💾 Relatório salvo em: ${relatorioPath}`);
        
    } catch (error) {
        console.error('\n❌ ERRO NA MIGRAÇÃO:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexão com banco de dados fechada');
        }
    }
}

// Executar migração
console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  MIGRAÇÃO DE PRODUTOS - CSV → BomboniereERP           ║');
console.log('╚════════════════════════════════════════════════════════╝');

migrarProdutos()
    .then(() => {
        console.log('\n✅ Script finalizado com sucesso!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Erro fatal:', error);
        process.exit(1);
    });
