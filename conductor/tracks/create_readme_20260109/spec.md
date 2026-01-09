# Track Specification: README Documentation for Elysia SQLite

## 1. Overview
Create a comprehensive `README.md` for `@riligar/elysia-sqlite` that mirrors the structure and quality of `@riligar/elysia-backup`. The goal is to provide clear, professional documentation that explains the plugin's purpose, features, installation, and usage, while adhering to RiLiGar's branding standards.

## 2. Functional Requirements
The `README.md` must include the following sections:

1.  **Header & Badges:**
    *   Project Title: `@riligar/elysia-sqlite`
    *   Badges: Open Source (RiLiGar), NPM Version, License (MIT).
    *   Introductory quote/banner linking to RiLiGar.

2.  **Features List:**
    *   Highlight "Smart DataGrid" (Editable cells, sorting, pagination, foreign key previews).
    *   Highlight "Secure Admin" (Built-in auth, TOTP/2FA support, onboarding wizard).
    *   Highlight "Zero Config" (Auto-detects schema, instant CRUD interface).
    *   Highlight "Export Options" (CSV/JSON export capabilities).

3.  **Installation & Usage:**
    *   Command: `bun add @riligar/elysia-sqlite`.
    *   Peer Dependencies: `elysia`, `@elysiajs/static`.
    *   **Quick Start:** Code snippet showing how to import and register the plugin in an Elysia app.
        *   Example usage of `sqliteAdmin({ dbPath: '...', ... })`.

4.  **Configuration:**
    *   Table detailing plugin options (e.g., `dbPath`, `prefix`, `auth` settings).
    *   Explanation of runtime configuration vs. initial setup.

## 3. Non-Functional Requirements
*   **Tone:** Professional, developer-friendly, and consistent with other RiLiGar projects.
*   **Format:** Standard Markdown.
*   **Visuals:** Use emojis and clear formatting (tables, code blocks) to enhance readability.

## 4. Acceptance Criteria
*   The `README.md` file exists in the root directory.
*   All specified sections (Header, Features, Installation, Configuration) are present and populated with accurate information.
*   Links to badges and external resources (RiLiGar website) are working.
*   Code snippets are syntactically correct and copy-paste ready.

## 5. Out of Scope
*   Creating a documentation website (e.g., Docusaurus).
*   Adding screenshots or GIFs (placeholders or descriptions are fine, but asset generation is not required for this specific task unless already available).
