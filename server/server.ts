import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from './generated/prisma/client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error']
});

// Initialize database connection & helper tables in Postgres on startup
async function initDb() {
  try {
    // Check connectivity and wake up serverless Neon if needed
    await prisma.$queryRaw`SELECT 1`;
    console.log('Connected to Neon PostgreSQL database.');

    // Create saved_queries table in Postgres if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "saved_queries" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "query" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create query_logs table in Postgres if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "query_logs" (
        "id" SERIAL PRIMARY KEY,
        "query" TEXT NOT NULL,
        "status" VARCHAR(255) NOT NULL,
        "execution_time_ms" INTEGER NOT NULL,
        "executed_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('PostgreSQL NyaySetu helper tables verified/created successfully.');
  } catch (error: any) {
    console.error('Failed to initialize database connection:', error.message);
  }
}

initDb();

// Background cleanup: Prune query logs older than 7 days
async function pruneOldLogs() {
  try {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "query_logs"
      WHERE "executed_at" < NOW() - INTERVAL '7 days'
    `);
    console.log('Successfully checked and pruned query logs older than 7 days.');
  } catch (error: any) {
    console.error('Failed to run background log pruning:', error.message);
  }
}

// Run immediately on server start, then once every 24 hours
pruneOldLogs();
setInterval(pruneOldLogs, 24 * 60 * 60 * 1000);

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error: any) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.post('/api/query', async (req: Request<{}, {}, { query: string }>, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "SQL query string is required" })
    }

    let errorOccured = false;
    let errorMessage = '';
    let rows: any[] = [];
    const startTime = performance.now();

    try {
      rows = await prisma.$queryRawUnsafe(query);
    } catch (err: any) {
      errorOccured = true;
      errorMessage = err.message;
    } finally {
      const endTime = performance.now();
      const executionTimeMs = Math.round(endTime - startTime);

      const lowerQuery = query.trim().toLowerCase();

      const isSystemQuery = lowerQuery.includes('query_logs') ||
        lowerQuery.includes('saved_queries') ||
        lowerQuery.includes('information_schema') ||
        lowerQuery.includes('pg_');

      if (!isSystemQuery) {
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "query_logs" ("query", "status", "execution_time_ms") VALUES ($1, $2, $3)`,
            query,
            errorOccured ? `ERROR: ${errorMessage}` : 'SUCCESS',
            executionTimeMs
          );
        } catch (logError: any) {
          console.error('Failed to log query to PostgreSQL:', logError.message);
        }
      }

      if (errorOccured) {
        console.error(`Query Execution Error: [${query}] -> ${errorMessage}`);
        return res.status(400).json({
          error: `SQL Error: ${errorMessage}`,
          executionTimeMs
        });
      }

      return res.json({
        success: true,
        rows,
        executionTimeMs
      });
    }

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==========================================
// SAVED QUERIES APIs
// ==========================================

// GET all saved queries (ordered by most recent)
app.get('/api/saved-queries', async (req: Request, res: Response) => {
  try {
    const savedQueries = await prisma.$queryRawUnsafe(
      'SELECT * FROM "saved_queries" ORDER BY "created_at" DESC'
    );
    return res.json(savedQueries);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST save a query
app.post('/api/saved-queries', async (req: Request<{}, {}, { name: string; query: string }>, res: Response) => {
  const { name, query } = req.body;
  if (!name || !query) {
    return res.status(400).json({ error: 'Name and query string are required.' });
  }
  try {
    // In PostgreSQL, RETURNING * returns the newly created row with its serial ID
    const newQuery: any[] = await prisma.$queryRawUnsafe(
      'INSERT INTO "saved_queries" ("name", "query") VALUES ($1, $2) RETURNING *',
      name,
      query
    );
    return res.json(newQuery[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE a saved query
app.delete('/api/saved-queries/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  try {
    const numericId = parseInt(id, 10);
    await prisma.$executeRawUnsafe(
      'DELETE FROM "saved_queries" WHERE "id" = $1',
      numericId
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// QUERY LOGS APIs
// ==========================================

// GET recent logs (limit to last 50 queries)
app.get('/api/logs', async (req: Request, res: Response) => {
  try {
    const logs = await prisma.$queryRawUnsafe(
      'SELECT * FROM "query_logs" ORDER BY "executed_at" DESC LIMIT 50'
    );
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE all logs (clear entire log history)
app.delete('/api/logs', async (req: Request, res: Response) => {
  try {
    // TRUNCATE is the standard, fast way to clear a table in PostgreSQL
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "query_logs"');
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`NyaySetu Node.js server running on http://localhost:${PORT}`);
});