<div align="center">

# NyaySetu

### Judiciary Database Intelligence Platform

An AI-powered platform for querying Indian judiciary databases using natural language. Built as a capstone project for the DBMS course at DA-IICT.

[![License](https://img.shields.io/badge/License-EPL%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%203.5%20Flash-8E75B2?logo=googlegemini&logoColor=white)](https://ai.google.dev/)

</div>

---

## About

NyaySetu bridges the gap between complex SQL and everyday language. Users can ask questions like *"Show me all pending criminal cases"* and the platform automatically generates, validates, and executes the SQL — returning results in a clean, paginated interface.

**Key capabilities:**

- **Natural Language Querying** — Powered by Google Gemini, converts plain English questions to PostgreSQL queries
- **Built-in SQL Editor** — Full SQL editor with syntax highlighting and server-side paginated results
- **Self-Healing Queries** — If AI-generated SQL fails, the system automatically diagnoses and retries (up to 2 attempts)
- **Safety Layer** — All write operations (`INSERT`, `UPDATE`, `DELETE`, `DROP`) are blocked at the API level
- **Query Logging** — Every executed query is logged with execution time and status

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 |
| Backend | Node.js · Express · TypeScript |
| Database | PostgreSQL (Neon Serverless) |
| ORM | Prisma |
| AI | Google Gemini 3.5 Flash |

## Database Schema

![ER Diagram](./Schema.png)

<details>
<summary>View all 17 tables</summary>

| Entity Tables | Relationship Tables |
|---|---|
| `CASE` | `HANDLED_BY` |
| `LAWYER` | `PARTICIPATES_IN` |
| `JUDGE` | `WORKS_FOR` |
| `COURT` | `HANDLES` |
| `LITIGANTS` | `FORMS` |
| `PANEL` | `HEARD_BY` |
| `FILING_DETAILS` | `IS_PRECEDENT` |
| `CASE_STATUS` | |
| `JUDGEMENT` | |
| `EVIDENCE` | |
| `WARRANT` | |
| `DOCUMENT_REPO` | |
| `HEARING` | |
| `HEARING_TRANSCRIPT` | |

</details>

## Project Structure

```
NyaySetu/
├── client/                    # React frontend
│   └── src/
│       ├── components/
│       │   └── AiAssistant.tsx
│       ├── App.tsx
│       ├── config.ts          # API base URL config
│       └── index.css
├── server/                    # Express backend
│   ├── prisma/
│   ├── aiService.ts           # Gemini integration & prompt engineering
│   ├── aiRoutes.ts            # AI endpoints with auto-healing
│   ├── server.ts              # Core API & middleware
│   └── schema.sql             # Database DDL
├── shared/
│   └── types.ts
└── Schema.png
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A [Neon](https://neon.tech/) PostgreSQL database (free tier)
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier)

### Installation

```bash
# Clone the repository
git clone <repository_url>
cd NyaySetu

# Install dependencies
cd server && npm install
cd ../client && npm install
```

### Configuration

Create `server/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
GEMINI_API_KEY="your_gemini_api_key"
```

### Running Locally

```bash
# Terminal 1 — Start the backend
cd server
npx prisma generate
npx prisma db push
npm run dev

# Terminal 2 — Start the frontend
cd client
npm run dev
```

## Deployment

The platform is designed to be easily deployed across standard cloud providers. The recommended stack is:
- **Frontend**: [Vercel](https://vercel.com) (Vite preset)
- **Backend**: [Render](https://render.com) (Node Web Service)
- **Database**: [Neon](https://neon.tech) (Serverless PostgreSQL)

Make sure to set the `VITE_API_URL` environment variable on the frontend to point to your backend, and the `DATABASE_URL`, `GEMINI_API_KEY`, and `CLIENT_URL` variables on your backend.

## License

Distributed under the Eclipse Public License. See [LICENSE](LICENSE) for details.
