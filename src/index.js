import { Elysia } from "elysia";
import { Database } from "bun:sqlite";
import { join } from "path";

// Mapeamento de extensões para MIME types
const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/**
 * Plugin de administração SQLite para ElysiaJS
 * @param {Object} config - Configuração do plugin
 * @param {string} config.dbPath - Caminho para o arquivo do banco SQLite
 * @param {string} config.prefix - Prefixo da rota (ex: '/admin')
 */
export const sqliteAdmin = ({ dbPath, prefix = "/admin" }) => {
  const db = new Database(dbPath);
  const uiPath = join(import.meta.dir, "ui", "dist");

  return (
    new Elysia({ prefix })
      // Servir index.html na raiz
      .get("/", async () => {
        const file = Bun.file(join(uiPath, "index.html"));
        return new Response(file, { headers: { "Content-Type": "text/html" } });
      })

      // Servir arquivos estáticos da pasta assets
      .get("/assets/*", async ({ params }) => {
        const filePath = join(uiPath, "assets", params["*"]);
        const file = Bun.file(filePath);
        if (!(await file.exists()))
          return new Response("Not found", { status: 404 });
        const ext = filePath.substring(filePath.lastIndexOf("."));
        return new Response(file, {
          headers: {
            "Content-Type": mimeTypes[ext] || "application/octet-stream",
          },
        });
      })

      // Lista todas as tabelas do banco
      .get("/api/tables", () => {
        const tables = db
          .query(
            `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `
          )
          .all();
        return { tables: tables.map((t) => t.name) };
      })

      // Executa query SQL arbitrária
      .post("/api/query", ({ body }) => {
        try {
          const { sql } = body;
          const isSelect = sql.trim().toLowerCase().startsWith("select");

          if (isSelect) {
            const results = db.query(sql).all();
            const columns = results.length > 0 ? Object.keys(results[0]) : [];
            return { success: true, columns, rows: results };
          } else {
            const result = db.run(sql);
            return {
              success: true,
              message: `Query executada. ${result.changes} linha(s) afetada(s).`,
            };
          }
        } catch (error) {
          return { success: false, error: error.message };
        }
      })

      // Conta total de registros de uma tabela
      .get("/api/table/:name/count", ({ params }) => {
        try {
          const result = db
            .query(`SELECT COUNT(*) as count FROM ${params.name}`)
            .get();
          return { success: true, count: result.count };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })

      // Insere um novo registro
      .post("/api/table/:name/insert", ({ params, body }) => {
        try {
          const columns = Object.keys(body);
          const placeholders = columns.map(() => "?").join(", ");
          const values = Object.values(body);
          const sql = `INSERT INTO ${params.name} (${columns.join(
            ", "
          )}) VALUES (${placeholders})`;
          const result = db.run(sql, values);
          return { success: true, id: result.lastInsertRowid };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })

      // Atualiza um registro (inline edit)
      .post("/api/table/:name/update", ({ params, body }) => {
        try {
          const { column, value, pkColumn, pkValue } = body;
          const sql = `UPDATE ${params.name} SET ${column} = ? WHERE ${pkColumn} = ?`;
          const result = db.run(sql, [value, pkValue]);
          return { success: true, changes: result.changes };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })

      // Exclui um registro
      .post("/api/table/:name/delete", ({ params, body }) => {
        try {
          const { column, value } = body;
          const sql = `DELETE FROM ${params.name} WHERE ${column} = ?`;
          const result = db.run(sql, [value]);
          return { success: true, changes: result.changes };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })

      // Retorna estrutura de uma tabela com foreign keys
      .get("/api/table/:name", ({ params }) => {
        try {
          const info = db.query(`PRAGMA table_info(${params.name})`).all();
          const foreignKeys = db
            .query(`PRAGMA foreign_key_list(${params.name})`)
            .all();

          // Enrich columns with FK info
          const columnsWithFK = info.map((col) => {
            const fk = foreignKeys.find((f) => f.from === col.name);
            if (fk) {
              return {
                ...col,
                fk: {
                  table: fk.table,
                  column: fk.to,
                },
              };
            }
            return col;
          });

          return { success: true, columns: columnsWithFK };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })

      // Retorna opções para foreign key (valores da tabela referenciada)
      .get("/api/table/:name/fk-options", ({ params, query }) => {
        try {
          const { refTable, refColumn } = query;
          if (!refTable || !refColumn) {
            return { success: false, error: "Missing refTable or refColumn" };
          }

          // Try to get a display column (first text column or the pk itself)
          const tableInfo = db.query(`PRAGMA table_info(${refTable})`).all();
          const displayCol =
            tableInfo.find(
              (c) =>
                c.type?.toUpperCase().includes("TEXT") && c.name !== refColumn
            )?.name || refColumn;

          const sql = `SELECT ${refColumn} as value, ${displayCol} as label FROM ${refTable} ORDER BY ${displayCol}`;
          const options = db.query(sql).all();

          return { success: true, options };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })
  );
};
