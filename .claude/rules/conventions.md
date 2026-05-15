## UI Components

- Use shadcn/ui for all UI components: `npx shadcn@latest add <component>`
- Components land in `client/src/components/ui/`
- Utilities in `client/src/lib/utils.ts` (`cn()` helper)
- Import alias `@/` maps to `client/src/`
- Theme: Nova preset (Radix base, Geist font, neutral color scale, CSS variables)

## Key Conventions

- All forms use React Hook Form with Zod validation
- All API routes are prefixed with `/api`
- Authentication uses database sessions (not JWT)
- Role-based access: admin-only routes must be protected by role middleware
- Prisma is the only way to interact with the database — no raw SQL
- AI features (classification, summary, suggested reply) go through the Claude API
