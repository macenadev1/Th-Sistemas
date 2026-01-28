# 🛡️ COMO PROTEGER O SERVIDOR DO OPERADOR

## 🎯 Objetivo
Evitar que o operador feche acidentalmente a janela do servidor Node.js, derrubando o sistema PDV/ERP.

---

## ✅ PROTEÇÕES JÁ IMPLEMENTADAS

### 1. **Janela Minimizada Automaticamente**
Quando o operador inicia o sistema pelo atalho da área de trabalho:
- O servidor **inicia MINIMIZADO** (não fica na frente)
- A janela aparece apenas na **BARRA DE TAREFAS**
- Menos visível = Menos chance de fechar acidentalmente

### 2. **Título de Aviso na Janela**
A janela do servidor tem o título:
```
SERVIDOR PDV - NAO FECHAR!
```
Se o operador passar o mouse na barra de tarefas, verá este aviso.

### 3. **Script de Parada Segura**
Criamos o arquivo `parar-servidor.bat` para:
- Parar o servidor **corretamente**
- Evitar que o operador feche forçadamente a janela
- Pedir confirmação antes de parar

---

## 📋 INSTRUÇÕES PARA O OPERADOR

### ▶️ Como INICIAR o Sistema:
1. Dê **duplo clique** no atalho **"PDV Bomboniere"** na área de trabalho
2. Aguarde o navegador abrir automaticamente
3. Faça login no sistema
4. **Pronto! O servidor está rodando em segundo plano**

### ⏹️ Como PARAR o Sistema (Final do Dia):
1. **FECHE o navegador** primeiro
2. Vá até a pasta do sistema
3. Execute o arquivo: **`parar-servidor.bat`**
4. Confirme que deseja parar (pressione **S** e Enter)
5. Aguarde a mensagem de confirmação

### ⚠️ O QUE O OPERADOR **NÃO DEVE FAZER**:
- ❌ **NÃO FECHE** a janela "SERVIDOR PDV - NAO FECHAR!" na barra de tarefas
- ❌ **NÃO CLIQUE** no X da janela minimizada do servidor
- ❌ **NÃO FORCE** o encerramento pelo Gerenciador de Tarefas
- ❌ **NÃO DESLIGUE** o computador sem parar o servidor antes

---

## 🔧 PROTEÇÕES ADICIONAIS (OPCIONAIS)

### Opção A: Criar um Serviço Windows
**Vantagem**: O servidor roda invisível em segundo plano, sem janela nenhuma.

**Como fazer**:
```powershell
# Instalar ferramenta (requer Node.js global)
npm install -g node-windows

# Criar arquivo de serviço (service-install.js)
# Executar: node service-install.js
```

### Opção B: Usar PM2 (Gerenciador de Processos)
**Vantagem**: Restart automático se o servidor cair, logs organizados.

**Como fazer**:
```bash
# Instalar PM2
npm install -g pm2-windows-startup pm2

# Configurar início automático
pm2-startup install

# Iniciar servidor com PM2
pm2 start src/server.js --name bomboniere-pdv

# Salvar configuração
pm2 save
```

### Opção C: Criar Atalho no Startup do Windows
**Vantagem**: Sistema inicia automaticamente quando o Windows iniciar.

**Como fazer**:
1. Pressione `Win + R`
2. Digite: `shell:startup` e pressione Enter
3. Copie o atalho "PDV Bomboniere" para esta pasta

---

## 🚨 TESTE DE SEGURANÇA

### Cenário 1: Operador clica acidentalmente no X
- **Resultado**: Janela minimizada não tem X visível
- **Proteção**: ✅ Eficaz

### Cenário 2: Operador fecha todas as janelas
- **Resultado**: Servidor continua rodando (janela minimizada separada)
- **Proteção**: ✅ Eficaz

### Cenário 3: Operador desliga o computador
- **Resultado**: Windows pergunta se quer fechar o servidor
- **Proteção**: ⚠️ Parcial (depende do Windows)

### Cenário 4: Operador força o encerramento
- **Resultado**: Servidor para (não tem como impedir 100%)
- **Proteção**: ❌ Não há proteção contra força bruta

---

## 📊 COMO VERIFICAR SE O SERVIDOR ESTÁ RODANDO

### Método 1: Pelo Navegador
Abra: http://localhost:3000
- ✅ Se abrir o sistema = Servidor rodando
- ❌ Se der erro "não foi possível conectar" = Servidor parado

### Método 2: Pela Barra de Tarefas
- Procure a janela: **"SERVIDOR PDV - NAO FECHAR!"**
- ✅ Se estiver lá = Servidor rodando
- ❌ Se não estiver = Servidor parado

### Método 3: Pelo Script de Verificação
Execute: `verificar.ps1`
- Mostrará se a porta 3000 está em uso

---

## 🔄 RECUPERAÇÃO DE EMERGÊNCIA

### Se o servidor parar acidentalmente:
1. Feche todos os navegadores abertos
2. Duplo clique no atalho **"PDV Bomboniere"** novamente
3. Aguarde o navegador abrir
4. Continue trabalhando normalmente

### Se houver erro "porta 3000 já está em uso":
Significa que há um processo "fantasma" rodando.

**Solução**:
1. Execute: `parar-servidor.bat`
2. Aguarde a confirmação
3. Inicie novamente pelo atalho

---

## 💡 DICAS IMPORTANTES

### Para o Administrador:
- ✅ Treine o operador para usar o atalho da área de trabalho
- ✅ Mostre como usar o `parar-servidor.bat` no final do dia
- ✅ Explique que a janela minimizada deve ficar aberta
- ✅ Configure backup automático do banco de dados

### Para o Operador:
- ✅ Use SEMPRE o atalho da área de trabalho para iniciar
- ✅ Não feche janelas que não conhece
- ✅ Pare o servidor CORRETAMENTE no final do dia
- ✅ Avise o administrador se algo der errado

---

## 📞 SOLUÇÃO DE PROBLEMAS

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| Sistema não abre no navegador | Servidor não iniciou | Execute o atalho novamente |
| Janela "SERVIDOR PDV" sumiu | Operador fechou | Execute o atalho novamente |
| Erro "porta 3000 em uso" | Processo duplicado | Execute `parar-servidor.bat` e reinicie |
| Servidor lento | Muitos processos rodando | Reinicie o computador |

---

## 🎓 TREINAMENTO DO OPERADOR

### Passo a Passo para o Primeiro Dia:

1. **Chegada**: Ligar o computador
2. **Iniciar Sistema**: Duplo clique em "PDV Bomboniere"
3. **Aguardar**: Navegador abre em ~10 segundos
4. **Login**: Digite usuário e senha
5. **Trabalhar**: Use o sistema normalmente
6. **Final do Dia**: Execute `parar-servidor.bat`
7. **Desligar**: Computador pode ser desligado

### ⚠️ AVISOS IMPORTANTES:
- A janela "SERVIDOR PDV - NAO FECHAR!" deve ficar sempre aberta
- Se fechar acidentalmente, basta abrir novamente pelo atalho
- **NUNCA feche o servidor durante o expediente**
- Sempre use o `parar-servidor.bat` para encerrar

---

## 📈 MONITORAMENTO

### Logs do Servidor:
- Local: Console da janela minimizada
- Útil para: Diagnosticar erros em tempo real

### Logs do Banco:
- Local: MySQL data directory
- Útil para: Auditoria e recuperação

### Backup Automático:
- Configurar via `cron` (veja GUIA-INSTALACAO-LOCAL.md)

---

**Última Atualização**: 28 de janeiro de 2026
**Versão**: 1.0
**Sistema**: PDV/ERP Bomboniere
