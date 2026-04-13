# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project Overview

**INFP-CMS** is a content management system built with Next.js 15, Supabase, and Shadcn UI. It manages CMS users and WeChat users with a hybrid authentication system (custom JWT + Supabase Auth).

**Status**: Recently migrated from Prisma + PostgreSQL to Supabase (see MIGRATION.md for details).

## Common Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Database & Scripts
npm run init-db          # Initialize database with test users
npm run generate:presets # Generate theme presets
```

## Architecture

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (migrated from Prisma + PostgreSQL)
- **UI**: Shadcn UI + Radix UI + Tailwind CSS
- **State**: Zustand + React Query
- **Forms**: React Hook Form + Zod
- **Auth**: Custom JWT + Supabase Auth (hybrid approach)

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # Protected routes (requires auth)
│   │   └── dashboard/     # Dashboard pages
│   ├── (external)/        # Public routes
│   └── api/               # API routes
│       ├── auth/          # Authentication endpoints
│       ├── users/         # User management
│       ├── wechat-users/  # WeChat user management
│       └── dashboard/     # Dashboard statistics
├── components/
│   ├── ui/                # Shadcn UI components
│   └── data-table/        # Reusable data table components
├── config/                # App configuration
├── hooks/                 # Custom React hooks
├── lib/                   # Core utilities
│   ├── supabase-client.ts
│   ├── supabase-server.ts
│   ├── supabase-admin.ts  # Bypasses RLS
│   └── auth.ts            # Authentication helpers
├── middleware/            # Auth middleware
├── navigation/            # Navigation configuration
├── services/              # Business logic layer
│   ├── userService.ts
│   └── wechatUserService.ts
├── stores/                # Zustand stores
└── types/                 # TypeScript types
```

## Key Concepts

### Authentication System

The app uses a **hybrid authentication approach**:

- Custom JWT tokens for CMS user sessions
- Supabase Auth available for integration
- bcrypt for password hashing (strength: 10)
- Cookie-based sessions with HttpOnly and SameSite=Strict
- Middleware protects all `/dashboard` routes

**Important**: Users must have `isActive: true` to login. Only `admin` and `user` types can access the CMS dashboard.

### Database Operations

- **Always use service layer functions** (`userService.ts`, `wechatUserService.ts`) instead of direct Supabase calls
- Service functions maintain consistent interfaces and handle errors properly
- Use `supabase-admin` (from `src/lib/supabase-admin.ts`) only when bypassing RLS is necessary
- Database columns use snake_case in Supabase but camelCase in TypeScript interfaces

### User Management

- **Admin**: Full system access, can manage users
- **User**: Basic CMS access (if account is active)
- **WeChat Users**: Managed separately with openid/unionid authentication

### Data Tables

The app includes a sophisticated data table component with:

- Drag-and-drop column reordering
- Column visibility controls
- Pagination and sorting
- Search and filtering
- See `src/components/data-table/` for implementation

## Development Patterns

### Adding New Features

1. **Create API Route** in `src/app/api/`
   - Use service layer for data operations
   - Validate requests with Zod schemas
   - Return consistent JSON responses

2. **Create Service Function** in `src/services/`
   - Export async functions with clear names
   - Use Supabase client for database operations
   - Handle errors appropriately

3. **Create Dashboard Page** in `src/app/(main)/dashboard/`
   - Use "use client" directive for interactivity
   - Import UI components from `src/components/ui/`
   - Add navigation entry in `src/navigation/sidebar/sidebar-items.ts`

### Adding Navigation Items

Edit `src/navigation/sidebar/sidebar-items.ts`:

```typescript
{
  title: "New Feature",
  url: "/dashboard/new-feature",
  icon: IconComponent,
}
```

### Environment Variables

Required variables (see `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (use carefully!)

## Important Files

- `src/lib/auth.ts`: Authentication helpers and password hashing
- `src/middleware/auth-middleware.ts`: Route protection logic
- `src/services/userService.ts`: User CRUD operations
- `src/services/wechatUserService.ts`: WeChat user operations
- `supabase-setup.sql`: Database schema for Supabase

## Testing

After making changes:

1. Test authentication flow (`/login`, `/logout`)
2. Verify database operations through service layer
3. Check API responses with proper error handling
4. Ensure UI components render correctly

## Deployment Notes

- The project is deployed on Vercel
- Environment variables must be configured in Vercel dashboard
- Supabase connection requires valid credentials
- Health check available at `/api/health`

## Migration Notes

The project was recently migrated from Prisma to Supabase. Key changes:

- Prisma has been removed from dependencies
- All database operations now use Supabase client
- Existing authentication logic was preserved (JWT + bcrypt)
- API interfaces remain backward compatible

See `MIGRATION.md` for detailed migration documentation.
