## API

- All routes are prefixed with `/api`
- Authentication uses database sessions (not JWT)
- Role-based access: admin-only routes must be protected by `requireAdmin` middleware
- Request body validation uses Zod (`safeParse`); return the first issue message with a 400 status

## Database

- Prisma is the only way to interact with the database — no raw SQL
- Use Prisma-generated enums (from `src/generated/prisma/enums`) instead of hardcoded strings for enum fields

## AI

- All AI features (classification, summary, suggested reply) go through the Claude API
