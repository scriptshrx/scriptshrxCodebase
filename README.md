# ScriptishRx AI Concierge v2.0

Fluid Intelligence for Wellness. An AI-powered concierge for booking appointments, finding wellness lounges, and managing your journey.

## Architecture

### Frontend (Next.js + Tailwind v4)
-   **Design System**: "Fluid Intelligence" (Glassmorphism, Dark Mode).
-   **Stack**: Next.js 15 (App Router), Tailwind CSS v4, Framer Motion.
-   **Location**: `frontend/`

### Backend (Node.js + Express + Prisma)
-   **Entry Point**: `src/server.js`
-   **Database**: SQLite (Dev) / Postgres (Prod) via Prisma.
-   **AI**: OpenAI Realtime API (WebSockets) for Voice.
-   **Location**: `backend/`

## Quick Start

### 1. Backend
```bash
cd backend
npm install
# Setup .env (see .env.example)
npm run build
npm start
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```