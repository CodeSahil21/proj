# Mini ERP + CRM Operations Portal

A full-stack internal operations portal for wholesale/distribution companies.
Covers customer CRM, product inventory, and sales challan management with role-based access.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Backend | Express.js + TypeScript |
| ORM | Prisma 7 |
| Database | PostgreSQL (Neon for cloud, Docker for local) |
| Auth | JWT + bcrypt |
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS v4 + Radix UI primitives |
| State | React Query + Zustand |
| Routing | React Router v6 |
| Deploy | Render (API) + Vercel (Frontend) |
| Local Dev | Docker + docker-compose |

## Project Structure

```
proj/
├── backend/                  # Express API
│   ├── prisma/
│   │   ├── schema.prisma     # 7 models + enums
│   │   └── seed.ts           # Demo data seeder
│   ├── src/
│   │   ├── controllers/      # auth, user, customer, product, challan
│   │   ├── middleware/       # auth (JWT), errorHandler
│   │   ├── routes/           # one file per resource
│   │   ├── utils/            # pagination, challanNumber
│   │   ├── lib/prisma.ts     # Prisma singleton
│   │   ├── types/index.ts    # Shared types
│   │   └── index.ts          # Entry point
│   ├── prisma.config.ts      # Prisma 7 config (replaces schema url)
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── api/              # Axios API clients
│   │   ├── components/
│   │   │   ├── ui/           # button, input, card, badge, label
│   │   │   └── layout/       # AppLayout, ProtectedRoute
│   │   ├── pages/            # Login, Dashboard, Customers, Products, Challans, Users
│   │   ├── store/            # Zustand auth store
│   │   ├── types/            # Shared TypeScript types
│   │   ├── lib/              # axios instance, cn utility
│   │   └── App.tsx           # Router + QueryClient setup
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
│
└── docker-compose.yml        # Postgres + backend + frontend
```

## Roles & Permissions

| Role | Customers | Products | Challans | Users |
|------|-----------|----------|----------|-------|
| ADMIN | Full | Full | Full | Full |
| SALES | Read/Write | Read | Create/Confirm | — |
| WAREHOUSE | — | Full | Read | — |
| ACCOUNTS | Read | Read | Read | — |

## Quick Start — Local Dev (with Docker)

### Prerequisites
- Docker Desktop running
- Node.js 20+

### 1. Start the database

```bash
docker-compose up postgres -d
```

### 2. Run backend

```bash
cd backend
cp .env.example .env          # already pre-filled for Docker Postgres
npm install
npm run db:migrate            # run Prisma migrations
npm run db:seed               # seed demo users + products
npm run dev                   # starts on http://localhost:3000
```

### 3. Run frontend

```bash
cd frontend
npm install
npm run dev                   # starts on http://localhost:5173
```

### 4. (Optional) Full Docker stack

```bash
docker-compose up --build
```

## API Reference

### Auth
```
POST   /api/auth/login        { email, password }
GET    /api/auth/me           Bearer token required
```

### Customers
```
GET    /api/customers         ?search=&status=&page=&limit=
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id
GET    /api/customers/:id/followups
POST   /api/customers/:id/followups
```

### Products
```
GET    /api/products          ?search=&category=&lowStock=true
POST   /api/products
PUT    /api/products/:id
GET    /api/products/:id/movements
POST   /api/products/:id/stock   { quantity, movementType, reason }
```

### Challans
```
GET    /api/challans          ?search=&status=&page=&limit=
POST   /api/challans          { customerId, items[], notes }
GET    /api/challans/:id
PATCH  /api/challans/:id/confirm
PATCH  /api/challans/:id/cancel
```

### Users (Admin only)
```
GET    /api/users
POST   /api/users
PUT    /api/users/:id
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@erp.com | Admin@123 |
| Sales | sales@erp.com | Sales@123 |
| Warehouse | warehouse@erp.com | Warehouse@123 |
| Accounts | accounts@erp.com | Accounts@123 |

## Health Check

```
GET http://localhost:3000/health
→ { "status": "ok", "timestamp": "...", "env": "development" }
```

## Deployment

### Backend → Render
1. Connect GitHub repo, set root directory to `backend`
2. Build command: `npm install && npm run db:generate && npm run build`
3. Start command: `npm start`
4. Add environment variables from `.env.example` (use Neon DATABASE_URL)

### Frontend → Vercel
1. Connect GitHub repo, set root directory to `frontend`
2. Framework: Vite (auto-detected)
3. Add `VITE_API_URL` pointing to your Render backend URL

### Database → Neon
1. Create project at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL` in both Render env and local `.env`
3. Run `npm run db:migrate` once with the Neon URL to apply schema

## Key Design Decisions

- **Prisma 7**: Uses `prisma.config.ts` instead of `url` in schema (breaking change from v6)
- **Challan confirmation**: Atomic transaction — deducts stock and logs movements in a single DB transaction, preventing partial updates
- **No negative stock**: Both manual stock adjustments and challan confirmation check available stock before proceeding
- **Snapshots**: Challan stores customer + product data as JSON snapshots so historical records stay accurate even if master data changes
- **Challan numbers**: Format `CH-YYYYMM-XXXX`, auto-generated, monthly sequence reset
