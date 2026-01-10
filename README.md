# @riligar/elysia-sqlite

[![Open Source](https://img.shields.io/badge/Open%20Source-RiLiGar-blue)](https://riligar.click/)
[![npm version](https://img.shields.io/npm/v/@riligar/elysia-sqlite.svg)](https://www.npmjs.com/package/@riligar/elysia-sqlite)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **An open source project by [RiLiGar](https://riligar.click/)**

A powerful Elysia plugin for SQLite database management with a beautiful built-in UI dashboard. Designed for Bun runtime.

## ✨ Features

-   📊 **Smart DataGrid** — Interactive table with pagination, sorting, and inline editing
-   🔗 **Foreign Key Preview** — Intelligently resolves and displays foreign key relationships
-   🔐 **Secure Admin** — Built-in authentication with session management and 2FA/TOTP
-   ⚡ **Zero Config** — Auto-detects database schema and provides instant CRUD interface
-   📤 **Easy Export** — Export your data to CSV or JSON with a single click
-   🧭 **Guided Onboarding** — Simple setup wizard for initial configuration
-   🤖 **AI SQL** — Generate SQL queries using natural language (requires OpenRouter key)

## 📦 Installation

```bash
bun add @riligar/elysia-sqlite
```

### Peer Dependencies

```bash
bun add elysia
```

## 🚀 Quick Start

```javascript
import { Elysia } from 'elysia'
import { sqliteAdmin } from '@riligar/elysia-sqlite'

const app = new Elysia()
    .use(
        sqliteAdmin({
            dbPath: 'demo.db',
            prefix: '/admin', // Optional: defaults to /admin
        })
    )
    .listen(3000)

console.log('🦊 Server running at http://localhost:3000')
console.log('📊 Admin Dashboard at http://localhost:3000/admin')
```

On first run, navigate to `/admin` (or your configured prefix) to start the onboarding wizard and configure your admin credentials.

## ⚙️ Configuration

### Plugin Options

These options are passed to the `sqliteAdmin` plugin at initialization.

| Option       | Type   | Default                       | Description                                                     |
| ------------ | ------ | ----------------------------- | --------------------------------------------------------------- |
| `dbPath`     | string | **Required**                  | Path to the SQLite database file                                |
| `prefix`     | string | `"/admin"`                    | URL prefix for the admin dashboard and API                      |
| `configPath` | string | Same directory as `dbPath`    | Path to save the runtime authentication config (JSON). Defaults to `sqlite-admin-config.json` in the same directory as your database file |

### Runtime Configuration (via UI)

The following settings are managed via the **Settings** tab in the dashboard and stored in the JSON file defined by `configPath`.

| Option            | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `username`        | Admin username for accessing the dashboard               |
| `password`        | Admin password (stored in plain text in config file - protect this file!) |
| `totpSecret`      | Secret key for Two-Factor Authentication (managed automatically) |

> **Note:** The configuration file contains sensitive credentials. Ensure it is included in your `.gitignore` if necessary or secured appropriately in production environments.

### Cloud Deployment (Fly.io, Railway, etc.)

When deploying to cloud platforms with ephemeral filesystems, ensure your database and config files are stored on a **persistent volume**.

**Fly.io Example:**

```toml
# fly.toml
[mounts]
  source = "data"
  destination = "/data"
```

```javascript
// Your app
sqliteAdmin({
    dbPath: '/data/app.db',
    // configPath automatically uses /data/sqlite-admin-config.json
})
```

The config file is automatically stored alongside your database, so both will persist across deployments when using the same volume.

## 🔌 API Endpoints

The plugin adds the following routes under your configured `prefix` (default `/admin`):

### Authentication

| Method | Path             | Description                                      |
| ------ | ---------------- | ------------------------------------------------ |
| POST   | `/auth/login`    | Authenticate user (username, password, 2FA code) |
| POST   | `/auth/logout`   | End session                                      |
| GET    | `/auth/status`   | Check if system is configured and user authenticated |
| POST   | `/api/setup`     | Initial setup (create admin credentials)         |

### Data Operations

| Method | Path                     | Description                                   |
| ------ | ------------------------ | --------------------------------------------- |
| GET    | `/api/tables`            | List all tables in database                   |
| GET    | `/api/table/:name/rows`  | Get rows for a table (pagination support)     |
| POST   | `/api/table/:name/insert`| Insert new record                             |
| POST   | `/api/table/:name/update`| Update record (inline edit)                   |
| POST   | `/api/table/:name/delete`| Delete record                                 |
| GET    | `/api/table/:name`       | Get table schema (columns and foreign keys)   |

### Advanced Features

| Method | Path                     | Description                                   |
| ------ | ------------------------ | --------------------------------------------- |
| POST   | `/api/query`             | Execute raw SQL query                         |
| POST   | `/api/ai/sql`            | Generate SQL from natural language prompt     |
| POST   | `/api/resolve-fk`        | Resolve IDs to display labels for foreign keys|
| GET    | `/api/meta/schema`       | Get full database schema for ERD              |

## 🤝 Contributing

Contributions are welcome! See our [GitHub repository](https://github.com/riligar-solutions/elysia-sqlite) for more information.

## 📄 License

MIT © [RiLiGar](https://riligar.click/)

<p align="center">
  Made with ❤️ by <a href="https://riligar.click/">RiLiGar</a>
</p>
