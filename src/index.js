import { Elysia } from "elysia";
import { Database } from "bun:sqlite";
import { join, dirname } from "path";
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createSessionManager } from './core/session.js';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

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
 * @param {string} config.prefix - Prefixo da rota (ex: '/database')
 * @param {string} config.configPath - Caminho para o arquivo de configuração de auth.
 *   Se não especificado, será salvo no mesmo diretório do banco de dados (recomendado para persistência em ambientes cloud como Fly.io)
 */
export const sqliteAdmin = ({ dbPath, prefix = "/database", configPath }) => {
  const db = new Database(dbPath);
  const uiPath = join(import.meta.dir, "ui", "dist");

  // Se configPath não for especificado, deriva do diretório do banco de dados
  // Isso garante que a configuração fique no mesmo volume persistente do banco
  const resolvedConfigPath = configPath || join(dirname(dbPath), "sqlite-admin-config.json");
  
  // Gerenciador de Sessão
  const sessionManager = createSessionManager();

  // Carregar Configuração
  let config = {};
  const loadConfig = () => {
    if (existsSync(resolvedConfigPath)) {
      try {
        config = JSON.parse(readFileSync(resolvedConfigPath, 'utf-8'));
      } catch (e) {
        console.error("Failed to load config", e);
      }
    }
  };
  loadConfig();

  const saveConfig = async (newConfig) => {
      config = { ...config, ...newConfig };
      try {
          await writeFile(resolvedConfigPath, JSON.stringify(config, null, 2));
          return true;
      } catch (e) {
          console.error("Failed to save config", e);
          return false;
      }
  };

  const isConfigured = () => !!(config.username && config.password);

  return (
    new Elysia({ prefix })
      // Middleware de Autenticação
      .derive(({ headers }) => {
          const cookies = headers.cookie || '';
          const sessionMatch = cookies.match(/admin-session=([^;]+)/);
          const token = sessionMatch ? sessionMatch[1] : null;
          const session = sessionManager.get(token);
          return { session };
      })
      .onBeforeHandle(({ path, set, session, body }) => {
        // Enforce trailing slash for root to ensure relative assets work
        if (path === prefix) {
            return Response.redirect(prefix + '/', 301);
        }

        // Permitir assets e HTML principal
        if (path.includes('/assets/') || path === prefix + '/') return;
        if (path.endsWith('index.html')) return;

        // Rotas Públicas de API
        if (path.endsWith('/auth/login') || path.endsWith('/auth/status') || path.endsWith('/auth/logout')) return;
        
        // Rota de Setup (só permitida se não configurado)
        if (path.endsWith('/api/setup')) {
            if (isConfigured()) {
                set.status = 403;
                return { success: false, error: "System already configured" };
            }
            return;
        }

        // Para todas as outras rotas /api/, exigir configuração e autenticação
        if (path.includes('/api/')) {
            if (!isConfigured()) {
                set.status = 403;
                return { success: false, error: "System not configured", code: "NOT_CONFIGURED" };
            }

            if (!session) {
                set.status = 401;
                return { success: false, error: "Unauthorized", code: "UNAUTHORIZED" };
            }
        }
      })

      // AUTH: Status
      .get("/auth/status", ({ session }) => {
          return {
              configured: isConfigured(),
              authenticated: !!session,
              user: session?.username,
              totpEnabled: !!config.totpSecret
          };
      })

      // AUTH: Setup (Onboarding)
      .post("/api/setup", async ({ body }) => {
          if (isConfigured()) {
              return { success: false, error: "Already configured" };
          }
          const { username, password } = body;
          if (!username || !password) {
              return { success: false, error: "Username and password required" };
          }
          
          if (await saveConfig({ username, password })) {
              // Criar sessão automaticamente
              const { token, expiresAt } = sessionManager.create(username);
              const expiresDate = new Date(expiresAt);
              
              return new Response(JSON.stringify({ success: true }), {
                  headers: {
                      'Content-Type': 'application/json',
                      'Set-Cookie': `admin-session=${token}; Path=${prefix}; HttpOnly; SameSite=Lax; Expires=${expiresDate.toUTCString()}`
                  }
              });
          }
          return { success: false, error: "Failed to save config" };
      })

      // AUTH: Login
      .post("/auth/login", ({ body, set }) => {
          if (!isConfigured()) {
              set.status = 403;
              return { success: false, error: "Not configured" };
          }
          
          const { username, password, totpCode } = body;
          
          if (username === config.username && password === config.password) {
              // 2FA Verification
              if (config.totpSecret) {
                  if (!totpCode) {
                      set.status = 401; // Require 2FA
                      return { success: false, error: "2FA code required", code: "2FA_REQUIRED" };
                  }
                  
                  const isValid = authenticator.check(totpCode, config.totpSecret);
                  if (!isValid) {
                      set.status = 401;
                      return { success: false, error: "Invalid 2FA code" };
                  }
              }

              const { token, expiresAt } = sessionManager.create(username);
              const expiresDate = new Date(expiresAt);
              
              return new Response(JSON.stringify({ success: true }), {
                  headers: {
                      'Content-Type': 'application/json',
                      'Set-Cookie': `admin-session=${token}; Path=${prefix}; HttpOnly; SameSite=Lax; Expires=${expiresDate.toUTCString()}`
                  }
              });
          }
          
          set.status = 401;
          return { success: false, error: "Invalid credentials" };
      })

      // AUTH: Logout
      .post("/auth/logout", ({ session }) => {
           return new Response(JSON.stringify({ success: true }), {
                  headers: {
                      'Content-Type': 'application/json',
                      'Set-Cookie': `admin-session=; Path=${prefix}; HttpOnly; SameSite=Lax; Max-Age=0`
                  }
              });
      })

      // DEBUG: List files in UI path
      .get("/api/debug/files", () => {
        try {
            const files = readdirSync(uiPath);
            const assetsPath = join(uiPath, 'assets');
            const assets = existsSync(assetsPath) 
                ? readdirSync(assetsPath) 
                : 'Assets folder missing';
            return { uiPath, files, assets };
        } catch (e) {
            return { error: e.message, stack: e.stack, uiPath };
        }
      })

      // TOTP: Generate
      .post("/api/totp/generate", async ({ session, set }) => {
          if (!session) { set.status = 401; return; }
          const secret = authenticator.generateSecret();
          const otpauth = authenticator.keyuri(session.username, 'SQLite Admin', secret);
          const qrCode = await QRCode.toDataURL(otpauth);
          return { success: true, secret, qrCode };
      })

      // TOTP: Verify & Enable
      .post("/api/totp/verify", async ({ body, session, set }) => {
          if (!session) { set.status = 401; return; }
          const { secret, code } = body;
          
          if (!authenticator.check(code, secret)) {
              return { success: false, error: "Invalid code" };
          }

          if (await saveConfig({ totpSecret: secret })) {
              return { success: true };
          }
          return { success: false, error: "Failed to save config" };
      })

      // TOTP: Disable
      .post("/api/totp/disable", async ({ body, session, set }) => {
          if (!session) { set.status = 401; return; }
          const { code } = body; // Confirm with code before disabling
          
          if (!authenticator.check(code, config.totpSecret)) {
             return { success: false, error: "Invalid code" };
          }

          // Remove secret
          const newConfig = { ...config };
          delete newConfig.totpSecret;
          config = newConfig; // Local update
          
          try {
              await writeFile(resolvedConfigPath, JSON.stringify(config, null, 2));
              return { success: true };
          } catch(e) {
              return { success: false, error: "Failed to save" };
          }
      })

      // Servir index.html na raiz
      .get("/", async () => {
        const file = Bun.file(join(uiPath, "index.html"));
        return new Response(file, {
          headers: {
            "Content-Type": "text/html",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        });
      })

      // Servir arquivos estáticos da pasta assets
      .get("/assets/*", async ({ params }) => {
        const filePath = join(uiPath, "assets", params["*"]);
        const file = Bun.file(filePath);
        const exists = await file.exists();
        
        if (!exists) {
            return new Response("Not found", { status: 404 });
        }
            
        const ext = filePath.substring(filePath.lastIndexOf("."));
        return new Response(file, {
          headers: {
            "Content-Type": mimeTypes[ext] || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable"
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

      // Lista linhas de uma tabela com paginação
      .get("/api/table/:name/rows", ({ params, query }) => {
        try {
          const page = parseInt(query.page) || 1;
          const limit = parseInt(query.limit) || 50;
          const offset = (page - 1) * limit;
          
          const rows = db.query(`SELECT * FROM ${params.name} LIMIT ${limit} OFFSET ${offset}`).all();
          const countResult = db.query(`SELECT COUNT(*) as count FROM ${params.name}`).get();
          const total = countResult.count;
          
          return {
            success: true,
            rows,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit)
            }
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
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

      // Resolve specific FK IDs to display values
      .post("/api/resolve-fk", ({ body }) => {
        try {
          const { table, idColumn, ids } = body;
          if (
            !table ||
            !idColumn ||
            !ids ||
            !Array.isArray(ids) ||
            ids.length === 0
          ) {
            return { success: true, values: {} };
          }

          // Identify display column
          const tableInfo = db.query(`PRAGMA table_info(${table})`).all();
          const displayCol =
            tableInfo.find(
              (c) =>
                c.type?.toUpperCase().includes("TEXT") && c.name !== idColumn
            )?.name || idColumn;

          const placeholders = ids.map(() => "?").join(",");
          // Handle potential duplicates in ids by using DISTINCT if needed, but Map handles it safely
          const sql = `SELECT ${idColumn} as id, ${displayCol} as label FROM ${table} WHERE ${idColumn} IN (${placeholders})`;

          const results = db.query(sql).all(...ids);

          // Convert to map: { [id]: label }
          const values = results.reduce((acc, row) => {
            acc[row.id] = row.label;
            return acc;
          }, {});

          return { success: true, values };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })

      // AI SQL Generation
      .post("/api/ai/sql", async ({ body }) => {
        try {
          const { prompt } = body;
          const apiKey = process.env.OPENROUTER_API_KEY;
          const model =
            process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct";

          if (!apiKey) {
            return {
              success: false,
              error: "OpenRouter API Key not configured",
            };
          }

          // Get database schema context
          const tables = db
            .query(
              "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            .all();
          let schemaContext = "";

          for (const t of tables) {
            const cols = db.query(`PRAGMA table_info(${t.name})`).all();
            schemaContext += `Table ${t.name}: ${cols
              .map((c) => c.name + "(" + c.type + ")")
              .join(", ")}\n`;
          }

          const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: model,
                messages: [
                  {
                    role: "system",
                    content: `You are a SQLite expert. Given the following database schema:\n${schemaContext}\nGenerate a valid SQLite query for the user's request. Return ONLY the raw SQL query, no markdown formatting, no explanations.`,
                  },
                  {
                    role: "user",
                    content: prompt,
                  },
                ],
              }),
            }
          );

          const data = await response.json();
          const sql = data.choices?.[0]?.message?.content
            ?.trim()
            .replace(/```sql/g, "")
            .replace(/```/g, "");

          return { success: true, sql };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })

      // Get full database schema for ERD
      .get("/api/meta/schema", () => {
        try {
          const tables = db
            .query(
              "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            .all();
          const schema = tables.map((t) => {
            const columns = db.query(`PRAGMA table_info(${t.name})`).all();
            const fks = db.query(`PRAGMA foreign_key_list(${t.name})`).all();
            return {
              name: t.name,
              columns,
              fks: fks.map((fk) => ({
                from: fk.from,
                table: fk.table,
                to: fk.to,
              })),
            };
          });
          return { success: true, schema };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })
  );
};
