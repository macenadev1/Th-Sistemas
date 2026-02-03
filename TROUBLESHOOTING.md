# 🔧 Guia de Solução de Problemas

## Problemas Comuns e Soluções

### 🚫 Servidor não inicia

#### Erro: "EADDRINUSE: address already in use :::3000"
**Causa**: Porta 3000 já está sendo usada por outro processo.

**Solução**:
```powershell
# Ver qual processo está usando a porta
netstat -ano | findstr :3000

# Matar o processo (substitua PID pelo número encontrado)
taskkill /PID <PID> /F

# Ou use o script de parada
.\parar-servidor.bat
```

#### Erro: "Access denied for user 'root'@'localhost'"
**Causa**: Senha incorreta do MySQL ou usuário sem permissões.

**Solução**:
1. Verifique a senha em [src/config/database.js](src/config/database.js)
2. Certifique-se que o MySQL está rodando
3. Teste a conexão:
```bash
mysql -u root -p
# Digite: @Bomboniere2025
```

#### Erro: "Cannot find module 'node-telegram-bot-api'"
**Causa**: Dependências não instaladas.

**Solução**:
```bash
npm install
```

---

### 💬 Telegram Bot não responde

#### Bot criado mas não responde comandos
**Causa**: Token não configurado ou inválido.

**Solução**:
1. Verifique o arquivo `.env`:
```env
TELEGRAM_BOT_TOKEN=seu_token_aqui
```

2. Teste o token manualmente:
```bash
curl https://api.telegram.org/bot<SEU_TOKEN>/getMe
```

3. Reinicie o servidor após configurar o token

#### Bot responde mas não envia cupom de vendas
**Causa**: Sistema não consegue acessar a API do Telegram.

**Solução**:
1. Verifique sua conexão com internet
2. Verifique os logs do servidor:
```
🤖 Telegram Bot: @bomboniere_pdv_bot (ativo)
```

3. Teste envio manual via `/status`

---

### 💰 Problemas com Caixa

#### Caixa já aberto mas sistema diz que está fechado
**Causa**: Estado inconsistente no banco.

**Solução**:
```sql
-- Verificar estado do caixa
SELECT * FROM caixa_aberto;

-- Se necessário, fechar caixa manualmente
DELETE FROM caixa_aberto WHERE id = 1;
```

#### Diferença no fechamento de caixa
**Causa**: Movimentações não registradas ou erro de cálculo.

**Solução**:
1. Verifique o histórico de movimentações
2. Reforços e sangrias devem estar corretos
3. Compare com relatórios de vendas

---

### 🛒 Problemas com Vendas

#### Produto não encontrado no PDV
**Causa**: Código de barras incorreto ou produto inativo.

**Solução**:
1. Use **F6** para gerenciar produtos
2. Verifique se o produto está **ativo**
3. Confirme o código de barras

#### Erro "Estoque insuficiente"
**Causa**: Quantidade solicitada maior que estoque disponível.

**Solução**:
1. Verifique o estoque atual no gerenciamento de produtos
2. Ajuste a quantidade desejada
3. Ou atualize o estoque do produto

#### Promoção não está sendo aplicada
**Causa**: Configuração incorreta de promoção.

**Solução**:
1. Edite o produto (F6)
2. Verifique os campos:
   - **Quantidade Promocional**: ex: 7 (para 7 unidades)
   - **Preço Promocional**: ex: 1,00 (total por 7 unidades)
3. Adicione a quantidade promocional no carrinho para ativar

---

### 💸 Problemas Financeiros

#### Saldo negativo em Reposição ou Lucro
**Causa**: Gastos maiores que saldo disponível.

**Solução**:
1. Acesse **Configurar Saldo Inicial** no menu financeiro
2. Ajuste o saldo inicial do mês atual
3. Feche o mês anterior para transferir saldos corretamente

#### Fechamento de mês não funciona
**Causa**: Mês já possui saldo inicial.

**Solução**:
```sql
-- Verificar saldos iniciais
SELECT * FROM saldos_iniciais ORDER BY mes_ano DESC;

-- Se necessário, remover fechamento duplicado
DELETE FROM saldos_iniciais WHERE mes_ano = '2026-02-01';
```

---

### 📊 Problemas com Relatórios

#### Relatório não exibe vendas
**Causa**: Período selecionado incorreto ou sem vendas.

**Solução**:
1. Ajuste o período usando os botões pré-definidos
2. Verifique se há vendas no banco:
```sql
SELECT COUNT(*) FROM vendas WHERE DATE(data_venda) = CURDATE();
```

#### Exportar CSV não funciona
**Causa**: Relatório não foi gerado ainda.

**Solução**:
1. Clique em **Gerar Relatório** primeiro
2. Aguarde o carregamento completo
3. Depois clique em **Exportar CSV**

---

### 🔑 Problemas de Autenticação

#### Não consigo fazer login
**Causa**: Credenciais incorretas ou usuário inativo.

**Solução**:
```sql
-- Verificar usuários
SELECT id, nome, email, role, ativo FROM usuarios;

-- Resetar senha do admin
UPDATE usuarios 
SET senha_hash = '$2b$10$5Anx8VAnYODLYXJyxM79eOY./.VAuH8QWJVVqgtLFUAbAJwZOlVma'
WHERE email = 'admin@bomboniere.com';
```

Senha padrão: `@Bomboniere2025`

---

### 🖥️ Problemas de Interface

#### Modais não abrem ou não fecham
**Causa**: JavaScript com erro ou modal não carregado.

**Solução**:
1. Abra o Console do navegador (F12)
2. Verifique erros JavaScript
3. Recarregue a página (Ctrl+F5)

#### Atalhos de teclado não funcionam
**Causa**: Foco em elemento incorreto ou modal aberto.

**Solução**:
1. Clique na área principal da tela
2. Feche modais abertos (ESC)
3. Recarregue a página se necessário

---

### 🔍 Problemas de Busca

#### Busca de produtos lenta
**Causa**: Muitos produtos cadastrados sem índices.

**Solução**:
```sql
-- Adicionar índices (já devem existir)
CREATE INDEX idx_nome ON produtos(nome);
CREATE INDEX idx_codigo_barras ON produtos(codigo_barras);
```

#### Leitor de código de barras não funciona
**Causa**: Buffer timeout muito curto.

**Solução**:
1. Verifique em [public/js/pdv.js](public/js/pdv.js) linha ~75-82
2. Aumente o timeout se necessário (padrão: 100ms)
3. Configure o leitor para enviar Enter após o código

---

## 📞 Suporte Adicional

### Logs do Sistema
```bash
# Ver logs do servidor
npm start

# Verificar erros específicos
# Os logs aparecem no terminal onde o servidor está rodando
```

### Backup do Banco de Dados
```bash
# Fazer backup
mysqldump -u root -p@Bomboniere2025 BomboniereERP > backup.sql

# Restaurar backup
mysql -u root -p@Bomboniere2025 BomboniereERP < backup.sql
```

### Resetar Sistema (CUIDADO!)
```sql
-- ATENÇÃO: Isso apaga TODOS os dados!
DROP DATABASE BomboniereERP;
CREATE DATABASE BomboniereERP;
USE BomboniereERP;
SOURCE database/database.sql;
```

---

## 🆘 Ainda com problemas?

1. ✅ Verifique o [README.md](README-PDV-MYSQL.md) para configuração inicial
2. 📚 Consulte a [Documentação Completa](DOCS-INDEX.md)
3. 🔧 Verifique os [Logs do Servidor](#logs-do-sistema)
4. 💬 Configure o [Telegram Bot](CONFIGURAR-TELEGRAM.md) para monitoramento

---

**Última atualização**: Fevereiro 2026
