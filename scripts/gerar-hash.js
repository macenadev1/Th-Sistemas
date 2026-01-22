// Script para gerar hash de senha
// Uso: node scripts/gerar-hash.js "suaSenha"

const bcrypt = require('bcrypt');

const senha = process.argv[2] || '@Bomboniere2025';
const saltRounds = 10;

bcrypt.hash(senha, saltRounds, (err, hash) => {
    if (err) {
        console.error('❌ Erro ao gerar hash:', err);
        process.exit(1);
    }
    
    console.log('\n✅ Hash gerado com sucesso!\n');
    console.log('Senha:', senha);
    console.log('Hash:', hash);
    console.log('\nUse este hash no INSERT da tabela usuarios ou na migration 001_erp_auth.sql\n');
});
