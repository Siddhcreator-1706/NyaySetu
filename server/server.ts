import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import aiRoutes from './aiRoutes';
import dns from 'node:dns';

// Fix for Node 18+ 'fetch failed' error with Gemini API (IPv6 resolution issues)
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

// Fix: "Do not know how to serialize a BigInt" error when Prisma returns COUNT() results
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
const PORT = process.env.PORT || 5000;

const prisma = new PrismaClient({
  log: ['info']
});

// CORS — allow the Vercel frontend in production, everything in dev
app.use(cors({
  origin: process.env.CLIENT_URL?.replace(/\/$/, '') || '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

// Mount AI-powered NL→SQL routes
app.use('/api/ai', aiRoutes(prisma));

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

app.post('/api/query', async (req: Request<{}, {}, { query: string; page?: number; pageSize?: number }>, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "SQL query string is required" })
    }

    // ── Safety validation: block dangerous operations ──
    const trimmedUpper = query.trim().toUpperCase();
    const BLOCKED_OPS = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];
    const firstWord = trimmedUpper.split(/\s+/)[0];

    if (BLOCKED_OPS.includes(firstWord)) {
      return res.status(403).json({
        error: `🚫 Operation blocked: ${firstWord} statements are not allowed. This interface only supports SELECT queries for data safety.`,
        executionTimeMs: 0,
      });
    }

    let errorOccured = false;
    let errorMessage = '';
    let rows: any[] = [];
    let totalRows = 0;
    
    const page = Math.max(1, req.body.page || 1);
    const pageSize = Math.max(1, req.body.pageSize || 50);
    const offset = (page - 1) * pageSize;

    const startTime = performance.now();

    try {
      // Strip trailing semicolons for subquery wrapping
      const cleanQuery = query.replace(/;+\s*$/, '');
      const paginatedQuery = `SELECT * FROM (${cleanQuery}) AS user_query LIMIT ${pageSize} OFFSET ${offset}`;
      const countQuery = `SELECT COUNT(*) as total_count FROM (${cleanQuery}) AS user_query`;

      const runQueries = async () => {
        const dataRows = await prisma.$queryRawUnsafe(paginatedQuery) as any[];
        const countResult = await prisma.$queryRawUnsafe(countQuery) as any[];
        return { dataRows, count: Number(countResult[0]?.total_count || 0) };
      };

      try {
        const result = await runQueries();
        rows = result.dataRows;
        totalRows = result.count;
      } catch (err: any) {
        // Handle Neon serverless cold starts and dropped connections
        if (err.message?.includes('terminating connection') || err.message?.includes('E57P01') || err.message?.includes('closed')) {
          console.warn('⚠️ Database connection dropped (likely Neon scaled to zero). Reconnecting and retrying...');
          const result = await runQueries();
          rows = result.dataRows;
          totalRows = result.count;
        } else {
          throw err;
        }
      }
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
        return res.status(500).json({ error: errorMessage, executionTimeMs });
      }

      const totalPages = Math.ceil(totalRows / pageSize);

      res.json({
        rows,
        totalRows,
        page,
        pageSize,
        totalPages,
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