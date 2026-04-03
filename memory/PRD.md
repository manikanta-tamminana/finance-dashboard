# Finance Dashboard System - PRD

## Problem Statement
Full-stack backend-focused finance dashboard system with clean architecture, strong access control, and well-structured APIs.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB (Motor async driver)
- **Frontend**: React + Shadcn UI + Recharts + Tailwind CSS
- **Auth**: JWT with httpOnly cookies, bcrypt password hashing
- **Database**: MongoDB with proper indexing

## User Personas
1. **Admin** - Full CRUD access to users and financial records
2. **Analyst** - Read access to financial records + dashboard summaries
3. **Viewer** - Read-only access to dashboard summaries

## Core Requirements
- JWT-based auth (register, login, logout, refresh, me)
- Role-based access control (RBAC) middleware
- Financial records CRUD with filtering (date range, category, type, search)
- Dashboard summary APIs (income, expenses, balance, categories, trends, recent)
- User management (admin-only CRUD)
- Pagination for records
- Soft delete for records
- Brute force login protection
- Seed data (3 users + 32 financial records)

## What's Been Implemented (Apr 3, 2026)
### Backend
- Complete FastAPI server with clean architecture
- JWT auth with httpOnly cookies + brute force protection
- RBAC middleware (require_roles decorator)
- Financial records CRUD with filtering & pagination
- Dashboard aggregation APIs (summary, categories, trends, recent)
- User management APIs (list, get, update, deactivate)
- MongoDB indexes and seed data
- Request logging middleware
- Proper error handling with HTTP status codes

### Frontend
- Login page with split-screen layout (hero image + form)
- Dashboard with summary cards, bar chart (monthly trends), pie chart (category breakdown), recent transactions table
- Records page with filtering (type, category, date range, search), pagination, CRUD dialogs
- Users page with role/status management
- Sidebar navigation with role-based visibility
- Auth context with automatic session management
- Responsive design with Manrope/IBM Plex Sans typography

## Prioritized Backlog
### P0 (Done)
- [x] Auth system with JWT + RBAC
- [x] Financial records CRUD
- [x] Dashboard summaries + charts
- [x] User management
- [x] Seed data

### P1 (Next)
- [ ] Swagger/OpenAPI documentation page
- [ ] Export records to CSV
- [ ] Unit tests (pytest)
- [ ] Rate limiting middleware

### P2 (Future)
- [ ] Password reset flow (forgot password)
- [ ] Audit logging
- [ ] Advanced analytics (YoY comparison)
- [ ] Dark mode toggle
- [ ] Email notifications for budget alerts

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Analyst | analyst@example.com | analyst123 |
| Viewer | viewer@example.com | viewer123 |
