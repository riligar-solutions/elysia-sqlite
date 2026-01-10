/**
 * Demo - SQLite Plugin
 * Exemplo completo de uso do plugin de gerenciamento SQLite
 */

import { Elysia } from "elysia";
import { rateLimit } from 'elysia-rate-limit';
import { sqliteAdmin } from "../src/index.js";
import { Database } from "bun:sqlite";
import { join } from "path";

// ============================================
// 🗃️ Criação do banco de dados de demonstração
// ============================================

const DB_PATH = join(import.meta.dir, "demo.db");
const db = new Database(DB_PATH);

console.log("📦 Criando banco de dados de demonstração...\n");

// Criar tabelas
db.run(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    telefone TEXT,
    cidade TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco REAL NOT NULL,
    estoque INTEGER DEFAULT 0,
    categoria TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER REFERENCES clientes(id),
    produto_id INTEGER REFERENCES produtos(id),
    quantidade INTEGER NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'pendente',
    data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cor TEXT
  )
`);

// Inserir dados de exemplo
const clientes = [
  ["Ana Silva", "ana@email.com", "11999001234", "São Paulo"],
  ["Bruno Costa", "bruno@email.com", "21988765432", "Rio de Janeiro"],
  ["Carla Mendes", "carla@email.com", "31977654321", "Belo Horizonte"],
  ["Diego Ferreira", "diego@email.com", "41966543210", "Curitiba"],
  ["Elena Santos", "elena@email.com", "51955432109", "Porto Alegre"],
];

const produtos = [
  ['MacBook Pro 14"', "Notebook Apple M3 Pro", 12999.0, 15, "Eletrônicos"],
  ["iPhone 15 Pro", "Smartphone Apple 256GB", 8499.0, 30, "Eletrônicos"],
  ["AirPods Pro", "Fones com cancelamento de ruído", 1899.0, 50, "Acessórios"],
  ["Magic Keyboard", "Teclado sem fio Apple", 1299.0, 25, "Acessórios"],
  ["Studio Display", 'Monitor 27" 5K Retina', 9999.0, 8, "Eletrônicos"],
  ["Cadeira Gamer", "Cadeira ergonômica premium", 2499.0, 12, "Móveis"],
  ["Mesa Elevatória", "Mesa com ajuste de altura", 3299.0, 6, "Móveis"],
];

const categorias = [
  ["Eletrônicos", "#3b82f6"],
  ["Acessórios", "#10b981"],
  ["Móveis", "#f59e0b"],
  ["Software", "#8b5cf6"],
];

// Inserir clientes
const insertCliente = db.prepare(`
  INSERT OR IGNORE INTO clientes (nome, email, telefone, cidade) VALUES (?, ?, ?, ?)
`);
clientes.forEach((c) => insertCliente.run(...c));

// Inserir produtos
const insertProduto = db.prepare(`
  INSERT OR IGNORE INTO produtos (nome, descricao, preco, estoque, categoria) VALUES (?, ?, ?, ?, ?)
`);
produtos.forEach((p) => insertProduto.run(...p));

// Inserir categorias
const insertCategoria = db.prepare(`
  INSERT OR IGNORE INTO categorias (nome, cor) VALUES (?, ?)
`);
categorias.forEach((c) => insertCategoria.run(...c));

// Inserir pedidos de exemplo
const pedidos = [
  [1, 1, 1, 12999.0, "concluido"],
  [2, 2, 2, 16998.0, "enviado"],
  [3, 3, 3, 5697.0, "concluido"],
  [1, 4, 1, 1299.0, "pendente"],
  [4, 5, 1, 9999.0, "processando"],
  [5, 6, 2, 4998.0, "pendente"],
];

const insertPedido = db.prepare(`
  INSERT OR IGNORE INTO pedidos (cliente_id, produto_id, quantidade, total, status) VALUES (?, ?, ?, ?, ?)
`);
pedidos.forEach((p) => insertPedido.run(...p));

db.close();

console.log("✅ Banco de dados criado com sucesso!");
console.log("   📋 Tabelas: clientes, produtos, pedidos, categorias\n");

// ============================================
// 🚀 Inicialização do servidor
// ============================================

const app = new Elysia()
  .use(rateLimit({
    exclude: ['/admin', '/admin/*']
  }))
  // Página inicial com instruções
  .get("/", () => {
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SQLite - Demo</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            background: white;
            border-radius: 16px;
            padding: 48px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          }
          .logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 32px;
          }
          .logo i { font-size: 40px; color: #3b82f6; }
          .logo h1 { font-size: 28px; color: #1e293b; }
          .description {
            color: #64748b;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .tables {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 32px;
          }
          .tables h3 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #94a3b8;
            margin-bottom: 12px;
          }
          .table-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .table-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: white;
            border-radius: 6px;
            font-size: 14px;
            color: #334155;
          }
          .table-item i { color: #3b82f6; }
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 14px 28px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.2s;
          }
          .btn:hover { background: #2563eb; transform: translateY(-2px); }
          .queries {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
          }
          .queries h3 {
            font-size: 14px;
            color: #334155;
            margin-bottom: 12px;
          }
          .query-example {
            background: #1e293b;
            color: #a5f3fc;
            padding: 12px 16px;
            border-radius: 6px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            margin-bottom: 8px;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <i class="ti ti-database"></i>
            <h1>SQLite</h1>
          </div>
          <p class="description">
            Bem-vindo à demonstração do plugin de gerenciamento SQLite para ElysiaJS. 
            Um banco de dados de exemplo foi criado com dados fictícios para você explorar.
          </p>
          <div class="tables">
            <h3>Tabelas disponíveis</h3>
            <div class="table-list">
              <div class="table-item"><i class="ti ti-users"></i> clientes</div>
              <div class="table-item"><i class="ti ti-box"></i> produtos</div>
              <div class="table-item"><i class="ti ti-shopping-cart"></i> pedidos</div>
              <div class="table-item"><i class="ti ti-tag"></i> categorias</div>
            </div>
          </div>
          <a href="/admin/" class="btn">
            <i class="ti ti-external-link"></i>
            Abrir Painel Admin
          </a>
          <div class="queries">
            <h3>Experimente estas queries:</h3>
            <div class="query-example">SELECT * FROM clientes ORDER BY nome</div>
            <div class="query-example">SELECT * FROM produtos WHERE preco > 5000</div>
            <div class="query-example">SELECT c.nome, p.nome as produto, pe.total FROM pedidos pe JOIN clientes c ON pe.cliente_id = c.id JOIN produtos p ON pe.produto_id = p.id</div>
          </div>
        </div>
      </body>
      </html>
    `,
      { headers: { "Content-Type": "text/html" } }
    );
  })

  // Plugin SQLite
  .use(sqliteAdmin({ dbPath: DB_PATH, prefix: "/admin" }))

  .listen(3000);

console.log("🚀 Demo rodando em: http://localhost:3000");
console.log("📊 Painel Admin em: http://localhost:3000/admin\n");
console.log("💡 Dica: Experimente consultas SQL como:");
console.log("   SELECT * FROM clientes");
console.log("   SELECT * FROM produtos WHERE preco > 5000");
console.log(
  "   SELECT c.nome, pe.total FROM pedidos pe JOIN clientes c ON pe.cliente_id = c.id\n"
);
