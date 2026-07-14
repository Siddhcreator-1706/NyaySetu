# NyaySetu ⚖️

A judiciary database intelligence platform with AI-powered natural language querying and a built-in SQL editor.

## Features

- **SQL Editor** — Write and execute SQL queries against the judiciary PostgreSQL database with syntax-highlighted results
- **AI Assistant** — Ask questions in plain English (e.g., *"Show me all pending criminal cases"*) and get auto-generated, validated SQL
- **Query Safety** — Dangerous operations (`INSERT`, `UPDATE`, `DELETE`, `DROP`, etc.) are blocked at the API level
- **Query Logging** — All executed queries are logged with execution time and status

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 19, TypeScript, Vite, Tailwind v4 |
| Backend    | Node.js, Express, TypeScript            |
| Database   | PostgreSQL (Neon serverless)             |
| ORM        | Prisma                                  |
| AI         | Google Gemini 3.5 Flash                 |

## Project Structure

```
NyaySetu/
├── client/                  # React frontend (Vite)
│   ├── public/              # Static assets (favicon, icons)
│   └── src/
│       ├── components/      # React components
│       │   └── AiAssistant.tsx
│       ├── App.tsx          # Main app with tabbed navigation
│       ├── index.css        # Design system & global styles
│       └── main.tsx         # Entry point
│
├── server/                  # Express backend
│   ├── prisma/              # Prisma schema
│   ├── aiService.ts         # Gemini AI integration & SQL validation
│   ├── aiRoutes.ts          # AI API endpoints
│   ├── server.ts            # Express server & core API routes
│   └── schema.sql           # Full database DDL (17 tables)
│
└── shared/                  # Shared TypeScript types
    └── types.ts
```

## Database Schema

![Database Schema](./Schema.png)

The judiciary database contains **17 tables** modeling:

| Entity Tables          | Relationship Tables  |
|------------------------|----------------------|
| `CASE`                 | `HANDLED_BY`         |
| `LAWYER`               | `PARTICIPATES_IN`    |
| `JUDGE`                | `WORKS_FOR`          |
| `COURT`                | `HANDLES`            |
| `LITIGANTS`            | `FORMS`              |
| `PANEL`                | `HEARD_BY`           |
| `FILING_DETAILS`       | `IS_PRECEDENT`       |
| `CASE_STATUS`          |                      |
| `JUDGEMENT`            |                      |
| `EVIDENCE`             |                      |
| `WARRANT`              |                      |
| `DOCUMENT_REPO`        |                      |
| `HEARING`              |                      |
| `HEARING_TRANSCRIPT`   |                      |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A PostgreSQL instance (or [Neon](https://neon.tech/) serverless)
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier)

## Setup

### 1. Clone & Install

```bash
git clone <repository_url>
cd NyaySetu

# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 2. Configure Environment

Create `server/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
GEMINI_API_KEY="your_gemini_api_key_here"
```

### 3. Initialize Database

```bash
cd server
npx prisma generate
npx prisma db push
```

### 4. Run

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

## Deployment

### 1. Deploy Frontend (Vercel)
Vercel is the easiest way to host the React/Vite frontend.

1. Create a free account at [Vercel](https://vercel.com/) and connect your GitHub repository.
2. When importing the project, configure the following settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Click **Deploy**. Vercel will automatically build and host your frontend on a global CDN.
4. *Note: You will need to update the API URLs in `client/src/App.tsx` and `client/src/components/AiAssistant.tsx` from `http://localhost:5000` to your live backend URL before pushing to production.*

### 2. Deploy Backend (Render or Railway)
Because the backend uses Prisma, long-running database connections, and a custom Node Express server, deploying it to a dedicated container service like **Render** or **Railway** is highly recommended over Vercel serverless functions.

1. Create a Web Service on [Render](https://render.com/).
2. Set the Root Directory to `server`.
3. Set the Build Command to `npm install && npx prisma generate`.
4. Set the Start Command to `npm start` (ensure you have a start script in your `package.json` like `"start": "npx ts-node server.ts"`).
5. Add your Environment Variables (`DATABASE_URL`, `GEMINI_API_KEY`, etc.).

## API Endpoints

| Method | Endpoint                 | Description                          |
|--------|--------------------------|--------------------------------------|
| GET    | `/api/health`            | Database connectivity check          |
| POST   | `/api/query`             | Execute SQL query (SELECT only)      |
| GET    | `/api/saved-queries`     | List saved queries                   |
| POST   | `/api/saved-queries`     | Save a query                         |
| DELETE | `/api/saved-queries/:id` | Delete a saved query                 |
| GET    | `/api/logs`              | Recent query execution logs          |
| DELETE | `/api/logs`              | Clear all logs                       |
| POST   | `/api/ai/generate-sql`   | NL → SQL generation & execution      |
| POST   | `/api/ai/suggest-queries`| AI-generated query suggestions       |

## License

See [LICENSE](LICENSE) for details.
