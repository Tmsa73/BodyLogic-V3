# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (Tailwind CSS, shadcn/ui, React Query)

## Artifacts

### Health & Fitness Tracker (`artifacts/health-app`)
- **URL**: `/` (root)
- **Type**: react-vite web app (mobile-style layout)
- **Description**: Full-stack personal health companion with 6 sections:
  1. **Home** – Dashboard with greeting, calorie ring, activity/sleep stats, streak, AI tip, recent activity
  2. **Nutrition** – Meal logger, calorie/macro progress rings, streak badge, today's meals list, add meal form
  3. **Fitness** – Weekly activity chart, workout logger, calories burned, sleep recovery card
  4. **AI Coach** – Conversational AI health coaching chat interface
  5. **History** – Filterable timeline of all logged events (meals, workouts, sleep)
  6. **Profile** – User info, goals, weekly stats, progress, edit profile form

### API Server (`artifacts/api-server`)
- **URL**: `/api`
- **Type**: Express 5 API server
- **Routes**: profile, nutrition (meals), fitness (workouts), sleep, ai (messages + insights), history, dashboard

## Database Schema

- `profile` – User profile with goals, weight, height, calorie targets
- `meals` – Food log entries with macros
- `workouts` – Workout log with type, duration, intensity, calories
- `sleep` – Sleep logs with bedtime, wake time, duration, quality
- `ai_messages` – AI coach conversation history

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/health-app run dev` — run health app frontend

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
