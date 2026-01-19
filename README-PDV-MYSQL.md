# 🛒 Sistema PDV com MySQL

Sistema de Ponto de Venda completo com banco de dados MySQL, 100% operável via teclado e leitor de código de barras.

---

## 🚀 Instalação e Configuração

### 1️⃣ Pré-requisitos

- **Node.js** (versão 14 ou superior) - [Download](https://nodejs.org/)
- **MySQL** (versão 5.7 ou superior) - [Download](https://dev.mysql.com/downloads/mysql/)

### 2️⃣ Configurar o MySQL

1. **Instale o MySQL** e anote a senha do usuário `root`

2. **Execute o script SQL** para criar o banco de dados:
   ```bash
   mysql -u root -p < database.sql
   ```
   
   Ou abra o MySQL Workbench e execute o conteúdo do arquivo `database.sql`

3. **Edite o arquivo `server.js`** e configure suas credenciais:
   ```javascript
   const dbConfig = {
       host: 'localhost',
       user: 'root',
       password: 'SUA_SENHA_AQUI', // Coloque sua senha
       database: 'pdv_sistema'
   };
   ```

### 3️⃣ Instalar Dependências

Abra o terminal nesta pasta e execute:

```bash
npm install
```

### 4️⃣ Iniciar o Servidor

```bash
npm start
```

Ou para desenvolvimento com auto-reload:

```bash
npm run dev
```

### 5️⃣ Acessar o Sistema

Abra o navegador em: **http://localhost:3000**

---

## ⌨️ Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| `ENTER` | Adicionar produto ao carrinho |
| `F1` | Abrir ajuda |
| `F2` | Finalizar venda |
| `F3` | Cancelar venda |
| `F4` | Cadastrar novo produto |
| `ESC` | Fechar modal |

---

## 📊 Estrutura do Banco de Dados

### Tabela: `produtos`
- `id` - ID único
- `codigo_barras` - Código de barras (único)
- `nome` - Nome do produto
- `preco` - Preço unitário
- `estoque` - Quantidade em estoque
- `ativo` - Se o produto está ativo

### Tabela: `vendas`
- `id` - ID da venda
- `total` - Valor total
- `valor_pago` - Valor pago pelo cliente
- `troco` - Valor do troco
- `data_venda` - Data e hora da venda

### Tabela: `itens_venda`
- Relaciona vendas com produtos
- Armazena quantidade e preços

---

## 🔌 API REST

### Produtos

- `GET /api/produtos` - Listar todos os produtos
- `GET /api/produtos/:codigo` - Buscar produto por código
- `POST /api/produtos` - Cadastrar novo produto
- `PUT /api/produtos/:id` - Atualizar produto

### Vendas

- `GET /api/vendas` - Listar vendas
- `GET /api/vendas/:id` - Detalhes de uma venda
- `POST /api/vendas` - Finalizar venda

### Estatísticas

- `GET /api/estatisticas` - Estatísticas do dia

---

## 📦 Produtos de Exemplo

O sistema já vem com produtos cadastrados para teste:

- `7891234567890` - Coca-Cola 2L - R$ 9,99
- `7891234567891` - Arroz 5kg - R$ 25,90
- `7891234567892` - Feijão 1kg - R$ 8,50
- `123` - Produto Teste - R$ 10,00

---

## 🔧 Troubleshooting

### Erro: "Cannot connect to MySQL"
- Verifique se o MySQL está rodando
- Confira usuário e senha no `server.js`
- Verifique se o banco `pdv_sistema` foi criado

### Erro: "Port 3000 already in use"
- Altere a porta no `server.js`: `const PORT = 3001;`

### Servidor Offline
- Certifique-se que o servidor Node.js está rodando (`npm start`)
- Verifique o firewall

---

## 💡 Recursos

✅ 100% operável via teclado  
✅ Compatível com leitores de código de barras  
✅ Banco de dados MySQL persistente  
✅ Controle de estoque automático  
✅ Histórico de vendas  
✅ Interface moderna e responsiva  
✅ API REST completa  
✅ Transações seguras (ACID)  

---

## 📝 Licença

MIT - Livre para uso comercial e pessoal

---

**Desenvolvido com ❤️ para facilitar sua operação de PDV!**
