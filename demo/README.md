# 🗃️ SQLite - Demo

Demonstração interativa do plugin de gerenciamento SQLite para ElysiaJS.

## Executar

```bash
cd demo
bun install
bun run start
```

## Acessar

- **Página inicial:** http://localhost:3000
- **Painel Admin:** http://localhost:3000/sqlite

## Banco de Dados

A demo cria automaticamente um banco `demo.db` com as seguintes tabelas:

| Tabela       | Descrição              |
| ------------ | ---------------------- |
| `clientes`   | Cadastro de clientes   |
| `produtos`   | Catálogo de produtos   |
| `pedidos`    | Histórico de pedidos   |
| `categorias` | Categorias de produtos |

## Queries de Exemplo

```sql
-- Listar clientes
SELECT * FROM clientes ORDER BY nome

-- Produtos acima de R$ 5000
SELECT * FROM produtos WHERE preco > 5000

-- Relatório de vendas
SELECT
  c.nome as cliente,
  p.nome as produto,
  pe.quantidade,
  pe.total,
  pe.status
FROM pedidos pe
JOIN clientes c ON pe.cliente_id = c.id
JOIN produtos p ON pe.produto_id = p.id
ORDER BY pe.data_pedido DESC
```
