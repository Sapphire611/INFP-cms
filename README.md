# Next.js + Shadcn UI Admin Dashboard

A modern admin dashboard built with Next.js 15, Shadcn UI, and Prisma.

## Features

- 🎨 **Modern UI** - Built with Shadcn UI components
- 📊 **Dashboard Analytics** - Interactive charts and data tables
- 🔐 **Authentication System** - Complete login/logout with middleware
- 📱 **Responsive Design** - Works on all devices
- 🌙 **Dark Mode** - Built-in theme switching
- 🎯 **TypeScript** - Full type safety
- 🗄️ **Database** - PostgreSQL with Prisma ORM

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Database

Make sure you have PostgreSQL running and update your `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/admin_dashboard"
```

### 3. Initialize Database

```bash
npm run init-db
```

This will create test users:
- `test@example.com` / `password123`
- `hello@arhamkhnz.com` / `password123`
- `hello@ammarkhnz.com` / `password123`

### 4. Start Development Server

```bash
npm run dev
```

### 5. Test Authentication

Visit `http://localhost:3000/test-login` to test the login system.

## Authentication System

The dashboard includes a complete authentication system:

### Features
- ✅ **Middleware Protection** - Automatic route protection
- ✅ **Cookie-based Sessions** - 7-day persistent login
- ✅ **User Status Display** - Shows user info in top-right and bottom-left
- ✅ **Auto Redirect** - Redirects based on login status
- ✅ **Logout Function** - Secure logout with cookie cleanup

### How it Works

1. **Login**: Users authenticate via `/api/auth/login`
2. **Session Storage**: User info stored in secure cookies
3. **Route Protection**: Middleware checks authentication on protected routes
4. **UI Integration**: User status displayed in dashboard components
5. **Logout**: Secure logout via `/api/auth/logout`

### Test the System

1. Visit `http://localhost:3000/test-login`
2. Login with test credentials
3. Access dashboard at `http://localhost:3000/dashboard`
4. See user info displayed in top-right and bottom-left
5. Try accessing dashboard without login (will redirect to login)

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/auth/          # Authentication APIs
│   ├── (main)/dashboard/  # Dashboard pages
│   └── test-login/        # Test page
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
├── middleware/            # Authentication middleware
└── types/                 # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run init-db` - Initialize database with test users

## Tech Stack

- **Framework**: Next.js 15
- **UI Library**: Shadcn UI
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Custom cookie-based system
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
