# FinanceFlow

FinanceFlow is a full-stack MERN personal finance tracker centered on monthly budgets, sinking funds, and live dashboard updates. It is structured as a clean portfolio-ready starter that demonstrates backend modeling, aggregation-heavy analytics, and a modern React dashboard.

## Tech stack

- React + Vite + Tailwind CSS
- Node.js + Express
- MongoDB + Mongoose
- Socket.io for real-time sync
- Docker Compose for local development

## Features

- Track income and expenses with category tagging
- Define monthly budgets and spot overspending quickly
- Create sinking funds for future goals and allocate money into them
- View dashboard summary cards, recent activity, and trend charts
- Refresh connected clients in real time through Socket.io events

## Project structure

```text
project_resume/
  backend/
  frontend/
  docker-compose.yml
```

## Local setup

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run seed -w backend
npm run dev
```

## Docker setup

```bash
docker-compose up --build
```

## API routes

- `GET /api/health`
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/budgets`
- `POST /api/budgets`
- `GET /api/goals`
- `POST /api/goals`
- `POST /api/goals/:id/allocate`
- `GET /api/summary`

## Notes

- Goal allocations are implemented through a dedicated endpoint and also create a matching expense-style ledger entry.
- Seed demo data is available through `npm run seed -w backend` so the dashboard has realistic charts and totals on first launch.
- GitHub Actions CI is configured in `.github/workflows/ci.yml` to run backend tests and build the frontend on pushes and pull requests.
- If you want strict MongoDB multi-document transactions in local Docker, the next step is enabling a replica set configuration for MongoDB.
