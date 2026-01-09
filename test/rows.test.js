import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { sqliteAdmin } from "../src/index.js";
import { Database } from "bun:sqlite";
import { unlinkSync } from "node:fs";

const DB_PATH = "test_rows.db";
const CONFIG_PATH = "test_rows_config.json";

describe("Backend Pagination", () => {
  let app;
  let db;
  let cookie;

  beforeAll(async () => {
    db = new Database(DB_PATH);
    db.run("CREATE TABLE test_users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)");
    
    // Insert 100 rows
    const insert = db.prepare("INSERT INTO test_users (name, email) VALUES ($name, $email)");
    for (let i = 1; i <= 100; i++) {
      insert.run({ $name: `User ${i}`, $email: `user${i}@example.com` });
    }

    app = sqliteAdmin({ dbPath: DB_PATH, prefix: "/admin", configPath: CONFIG_PATH });

    // Setup Auth
    const setupReq = new Request("http://localhost/admin/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "password" })
    });
    const setupRes = await app.handle(setupReq);
    cookie = setupRes.headers.get("set-cookie");
  });

  afterAll(() => {
    db.close();
    try {
      unlinkSync(DB_PATH);
      unlinkSync(CONFIG_PATH);
    } catch (e) {}
  });

  it("should fetch list of tables", async () => {
    const response = await app.handle(new Request("http://localhost/admin/api/tables", {
        headers: { "Cookie": cookie }
    }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tables).toContain("test_users");
  });

  it("should fetch first page of rows", async () => {
    const response = await app.handle(new Request("http://localhost/admin/api/table/test_users/rows?page=1&limit=10", {
        headers: { "Cookie": cookie }
    }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.rows.length).toBe(10);
    expect(data.rows[0].name).toBe("User 1");
    expect(data.pagination.total).toBe(100);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(10);
    expect(data.pagination.totalPages).toBe(10);
  });

  it("should fetch second page of rows", async () => {
    const response = await app.handle(new Request("http://localhost/admin/api/table/test_users/rows?page=2&limit=10", {
        headers: { "Cookie": cookie }
    }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.rows[0].name).toBe("User 11");
  });

  it("should handle custom limit", async () => {
    const response = await app.handle(new Request("http://localhost/admin/api/table/test_users/rows?page=1&limit=5", {
        headers: { "Cookie": cookie }
    }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.rows.length).toBe(5);
    expect(data.pagination.totalPages).toBe(20);
  });
});
