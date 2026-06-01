## UI Components

- Use shadcn/ui for all UI components: `npx shadcn@latest add <component>`
- Components land in `client/src/components/ui/`
- Utilities in `client/src/lib/utils.ts` (`cn()` helper)
- Import alias `@/` maps to `client/src/`
- Theme: Nova preset (Radix base, Geist font, neutral color scale, CSS variables)

## Data Fetching

- All server state fetching and mutations use TanStack Query (`useQuery`, `useMutation`) — no raw `useEffect` + `useState` for data fetching
- All forms use React Hook Form with Zod validation

## Testing

- `src/lib/` utilities and `src/hooks/` — unit tests with Vitest; mock external dependencies with `vi.mock`
- Page components and compound components — integration tests with React Testing Library; wrap with real `QueryClientProvider` (retry disabled), use `data-testid` for loading/error/empty states, never query by CSS class or internal tags
- Run unit tests: `bun run test:unit` | integration tests: `bun run test:integration` | all: `bun run test`
