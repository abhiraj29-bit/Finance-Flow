# FinanceFlow — Production Personal Finance Platform

FinanceFlow is a full-stack, enterprise-grade personal finance management system engineered with the MERN stack (MongoDB, Express, React, Node.js). It demonstrates clean architecture, multi-tenant data isolation, ACID transaction atomicity, automated recurring background schedules, high-performance pagination, and real-time reactive updates.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |          React 18 Dashboard           |
                      |  (Vite, Tailwind CSS, Recharts, Axios)|
                      +---------------------------------------+
                                    |           ^
                   REST API (JWT)   |           | WebSocket (Scoped Room)
                                    v           |
                      +---------------------------------------+
                      |         Express.js API Server         |
                      |  Rate Limiting, Helmet, Error Handler |
                      +---------------------------------------+
                           |              |             |
                           |              |             +-----------------------+
                           v              v                                     v
               +----------------+  +----------------------+             +----------------+
               | Authentication |  | Transaction Ledger   |             | node-cron      |
               | (JWT + bcrypt) |  | CRUD + Filters +     |             | Recurring Job  |
               +----------------+  | Pagination           |             | Scheduler      |
                                   +----------------------+             +----------------+
                                          |        |                            |
                     ACID Session (Rollback)       v                            v
                                          +---------------------------------------+
                                          |          MongoDB 7 Replica Set        |
                                          |  Users, Transactions, Budgets, Goals, |
                                          |  RecurringSchedules (Compound Indexes)|
                                          +---------------------------------------+
```

---

## Key Engineering Highlights

### 1. Multi-Tenant Data Isolation (Phase 1)
- **Scoped Schemas**: `userId` foreign key added to `Transaction`, `Budget`, `Goal`, and `RecurringTransaction`.
- **Query Scoping**: Every controller query and aggregation stage enforces `{ userId: req.user._id }`.
- **Ownership Verification**: All mutations (`PUT`, `PATCH`, `DELETE`) verify resource ownership before execution.
- **Scoped WebSockets**: Socket.io connections authenticate with JWT and join `user:${userId}` rooms. Real-time mutations are never broadcast globally across tenants.
- **Compound Unique Indexes**:
  - `Budget`: `{ userId: 1, category: 1, month: 1 }` (unique per user, preventing collisions between tenants).
  - `Transaction`: `{ userId: 1, date: -1, createdAt: -1 }`, `{ userId: 1, category: 1 }`, `{ userId: 1, kind: 1 }`.
  - `Goal`: `{ userId: 1, targetDate: 1 }`.

### 2. ACID Transactions & Financial Atomicity (Phase 2)
- **MongoDB Transactions**: Sinking fund allocations (`POST /api/goals/:id/allocate`) execute inside an atomic session with `session.startTransaction()`.
- **Atomic Two-Phase Mutation**: Atomically increments goal `currentAmount` and inserts a matching ledger expense entry.
- **Rollback on Error**: Any failure immediately invokes `session.abortTransaction()`. No partial writes or orphaned records.
- **Removed Unsafe Fallbacks**: Non-atomic standalone write fallbacks have been completely excised.
- **Monetary Precision**: Uses integer paise calculations (`Math.round(amount * 100)`) throughout the pipeline, completely eliminating IEEE 754 floating-point rounding errors.
- **Validation Guardrails**: Rejects negative allocations, zero amounts, and allocations that exceed the remaining funding target.

### 3. Complete Transaction CRUD (Phase 3)
- Full REST semantics: `GET /api/transactions`, `POST /api/transactions`, `PUT /api/transactions/:id`, `PATCH /api/transactions/:id`, `DELETE /api/transactions/:id`.
- Request validation with Zod schemas.
- Proper HTTP status codes: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `409 Conflict`.

### 4. Advanced Pagination, Filtering & Sorting (Phase 5)
- Query parameters supported:
  - `page`: Page index (default: `1`)
  - `limit`: Page size (default: `10`, max: `100`)
  - `category`: Exact match or case-insensitive category filtering
  - `kind`: Filter by `income` or `expense`
  - `startDate` & `endDate`: Date range boundaries
  - `minAmount` & `maxAmount`: Monetary range bounds
  - `sortBy`: Field to sort (`date`, `amount`, `category`, `createdAt`)
  - `sortOrder`: `asc` or `desc`
- Standard metadata response:
  ```json
  {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalRecords": 85,
      "totalPages": 9
    }
  }
  ```

### 5. Timezone-Aware Recurring Transactions (Phase 6)
- **RecurringTransaction Model**: Stores schedule metadata, frequency (`daily`, `weekly`, `monthly`, `yearly`), `startDate`, `nextDueDate`, `endDate`, and `isActive`.
- **Background Cron Runner**: Timezone-aware scheduler (UTC) checks due schedules every hour and catch-up on server boots.
- **Idempotency Guarantee**: Each generated transaction has an `idempotencyKey` formatted as `recurring-${scheduleId}-${YYYY-MM-DD}` enforced with a unique database index. Multiple scheduler executions or restarts will never create duplicate entries.
- **Safety**: Does not generate future transactions prematurely, and automatically marks schedules completed upon reaching `endDate`.

### 6. Production Hardening (Phase 8)
- **Security Headers**: Integrated `helmet` with custom resource policy.
- **Rate Limiting**: `express-rate-limit` prevents brute-force on `/api/auth` (30 req / 15 min) and general API throttling (300 req / min).
- **Centralized Error Handling**: Automatically formats Zod validation issues, Mongoose CastErrors (invalid ObjectIds), duplicate key conflicts (11000), and JWT expiration.
- **Automated Testing Suite**: 37 automated tests using `node:test`, `supertest`, and `MongoMemoryReplSet`.

### 7. Conversational AI Financial Assistant
- **Dual-Engine Architecture**: Employs LangChain Tool-Calling with OpenAI (`gpt-4o-mini`) when `OPENAI_API_KEY` is present, and smoothly degrades to an ultra-fast, zero-dependency deterministic heuristic engine if no API key is configured.
- **Zero Data Leakage**: All AI tool functions and heuristic aggregations explicitly inject `{ userId: req.user._id }`, strictly preventing cross-tenant leakage.
- **Interactive Capabilities**:
  - Live net balance, income, expenses, and sinking fund reserves.
  - Category spending breakdown and budget limit warnings.
  - Sinking fund target dates, lock status, and completion progress.
  - Upcoming scheduled recurring subscriptions and bills.
- **Frontend Chat Widget**: Modern glassmorphic floating assistant with quick prompt pills, auto-scroll, real-time typing indicators, and markdown formatting.

---

## API Reference

### Authentication
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT | No |
| `GET` | `/api/auth/me` | Fetch currently authenticated user | Yes |

### Transactions
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/transactions` | List paginated & filtered transactions | Yes |
| `POST` | `/api/transactions` | Create new transaction | Yes |
| `PUT` | `/api/transactions/:id` | Full replacement of transaction | Yes |
| `PATCH` | `/api/transactions/:id` | Partial update of transaction fields | Yes |
| `DELETE` | `/api/transactions/:id` | Delete transaction | Yes |

### Budgets
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/budgets` | List all budgets for user | Yes |
| `POST` | `/api/budgets` | Upsert budget for category & month | Yes |

### Sinking Funds (Goals)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/goals` | List user savings goals | Yes |
| `POST` | `/api/goals` | Create new savings goal | Yes |
| `POST` | `/api/goals/:id/allocate` | Atomically lock funds into goal (ACID) | Yes |

### Recurring Transactions
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/recurring-transactions` | List all recurring schedules | Yes |
| `POST` | `/api/recurring-transactions` | Schedule new recurring payment | Yes |
| `PATCH` | `/api/recurring-transactions/:id` | Update, pause, or resume schedule | Yes |
| `DELETE` | `/api/recurring-transactions/:id` | Delete recurring schedule | Yes |

### AI Chatbot
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chat` | Process natural language financial query | Yes |

### Analytics & System
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/summary` | Dashboard metrics, trends, and budget health | Yes |
| `GET` | `/api/health` | Service health status check | No |

---

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB 7.0+ (with replica set enabled for ACID transactions) or Docker

### Local Setup

1. **Clone repository and install dependencies**:
   ```bash
   cd Finance-Flow
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Seed demo data**:
   ```bash
   npm run seed -w backend
   ```
   *Creates demo user `demo@financeflow.dev` (password: `password123`) with sample transactions, budgets, and sinking funds.*

4. **Run the development servers**:
   ```bash
   npm run dev
   ```
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:5004](http://localhost:5004)

---

### Docker Deployment (with Replica Set)

The included `docker-compose.yml` configures a single-node MongoDB 7 replica set (`rs0`), allowing full ACID transactions in containerized local and staging environments:

```bash
docker-compose up --build
```

---

## Database Migration Tool

To inspect or migrate legacy records created without `userId`:

```bash
# Dry run to check count of unassigned records:
node backend/src/scripts/migrateUserId.js

# Assign unassigned records to a specific verified user:
node backend/src/scripts/migrateUserId.js --assign-to-email user@example.com

# Safely archive unassigned records into legacy archive collections:
node backend/src/scripts/migrateUserId.js --archive
```

---

## Testing

The automated test suite runs against an in-memory MongoDB replica set (`MongoMemoryReplSet`) using Node's native test runner and Supertest:

```bash
npm test -w backend
```

Test coverage includes:
- **Authentication**: Registration, unique email, login, password checks, token expiry.
- **Transactions CRUD**: Creation, pagination, filtering, PUT, PATCH, DELETE, 404/400 handling.
- **Multi-Tenant Isolation**: Two-tenant cross-isolation checks on transactions, budgets, goals, and analytics summaries.
- **Financial Consistency & ACID**: Atomic allocations, transaction abort on error, over-allocation prevention, and idempotency key duplicate rejection.
- **Recurring Transactions**: Recurrence logic, automated execution, pause/resume, deletion, and restart idempotency.
- **AI Financial Assistant**: Scoped LLM tool calls & deterministic heuristic fallback, authenticated endpoints, empty payload protection, tenant isolation.
