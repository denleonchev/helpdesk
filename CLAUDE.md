# Helpdesk — AI Ticket Management Platform

## Project Overview

AI-powered support ticket system. Incoming emails are auto-classified, summarized, and answered using Claude AI. Complex issues are routed to human support agents.

**User roles:** Admin (seeded at deployment, manages agents) and Support Agent (handles escalated tickets).

**Ticket statuses:** `open` → `resolved` → `closed`  
**Ticket categories:** `general_question`, `technical_question`, `refund_request`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript, Tailwind CSS v4, React Router |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | Database sessions |
| AI | Claude API (Anthropic) |
| Email | SendGrid or Mailgun (inbound webhook + outbound) |
| Runtime | Bun |
| Deployment | Docker + cloud provider |

## Monorepo Structure

```
/client     React frontend (Vite + TypeScript)
/server     Express backend (TypeScript)
```

**Dev commands (run from root):**
- `bun run dev` — start both client and server
- `bun run dev:server` — server only
- `bun run dev:client` — client only

Server runs on port 3000. Health check: `GET /api/health`.

## Key Conventions

- All forms use React Hook Form with Zod validation
- All API routes are prefixed with `/api`
- Authentication uses database sessions (not JWT)
- Role-based access: admin-only routes must be protected by role middleware
- Prisma is the only way to interact with the database — no raw SQL
- AI features (classification, summary, suggested reply) go through the Claude API
