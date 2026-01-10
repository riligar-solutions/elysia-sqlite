# Tech Stack - Elysia SQLite

## Core Technologies
- **Runtime:** Bun (fast all-in-one JavaScript runtime)
- **Language:** JavaScript (utilizing Modern ES Modules)
- **Backend Framework:** ElysiaJS (high-performance web framework for Bun)
- **Frontend Framework:** React (Vite-powered for fast development and building)
- **Database:** SQLite (lightweight, file-based database)

## Key Libraries
- **Security:** 
    - `otplib`: For Time-based One-Time Password (TOTP) generation and verification.
    - `qrcode`: For generating MFA setup QR codes.
- **Frontend Utilities:** 
    - `Vite`: Frontend build tool and development server.
    - `PostCSS`: CSS transformation and processing.
- **Backend Utilities:**
    - `@elysiajs/static`: For serving the admin UI static assets.

## Infrastructure and Tooling
- **Package Manager:** Bun
- **Build System:** Vite (for UI), Bun (for runtime/server)
