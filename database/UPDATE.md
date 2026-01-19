# Atualização do Banco de Dados - Tabela Caixa Aberto

## Descrição
Esta atualização adiciona a tabela `caixa_aberto` que armazena o estado atual do caixa (se está aberto ou fechado).

## Como aplicar

### Opção 1: MySQL Workbench
1. Abra o MySQL Workbench
2. Conecte ao servidor MySQL
3. Abra o arquivo `add_caixa_aberto.sql`
4. Execute o script

### Opção 2: Linha de comando
```bash
mysql -u root -p BomboniereERP < database/add_caixa_aberto.sql
```

## Benefícios
- ✅ Estado do caixa persiste no banco de dados
- ✅ Múltiplos dispositivos veem o mesmo estado
- ✅ Mais confiável que localStorage
- ✅ Permite auditoria e controle de caixas abertos
