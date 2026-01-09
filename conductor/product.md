# Initial Concept
Plugin ElysiaJS para gerenciamento de bancos de dados SQLite

# Product Guide - Elysia SQLite Admin

## Vision
A minimalist, web-based SQLite administration plugin for ElysiaJS applications. It empowers developers, system administrators, and technical stakeholders to manage data and inspect schemas without leaving their browser, following a "Content-First" design philosophy.

## Target Users
- **Developers:** Streamlining local database management during development.
- **System Administrators:** Inspecting and managing SQLite data in production/staging environments through a web interface.
- **Technical Stakeholders:** Performing data audits and exports (CSV/JSON) without requiring CLI expertise.

## Core Features
- **Data Management:** Full CRUD operations (Create, Read, Update, Delete) for table rows with paginated data browsing.
- **Schema Inspection:** Detailed view of table structures, indexes, and database relationships.
- **Data Portability:** Robust tools for exporting data to CSV/JSON and importing from external files.
- **Flexible Security:** 
    - Default authentication via username and password.
    - Integrated Multi-Factor Authentication (MFA) using TOTP (Time-based One-Time Password) when configured.
- **Plugin Integration:** Standalone mountable plugin that exposes UI and API routes under a customizable prefix (e.g., `/admin`).

## Visual Experience
- **Minimalist & Content-First:** A clean, high-density interface focused on readability, inspired by the RiLiGar design system.
- **Native Dark Mode:** Full support for dark and light modes to reduce eye strain and improve accessibility.
