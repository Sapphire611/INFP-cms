# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
