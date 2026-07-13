import { Router, Request, Response } from 'express';
import { PrismaClient } from './generated/prisma/client';
import { generateSQL, validateSQL, generateSuggestions } from './aiService';

// ============================================================================
// AI ROUTES — Express router for AI-powered NL→SQL endpoints
// ============================================================================

export default function aiRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const apiKey = process.env.GEMINI_API_KEY || '';

  // --------------------------------------------------------------------------
  // POST /api/ai/generate-sql
  // Converts a natural language question → SQL → executes → returns results
  // --------------------------------------------------------------------------
  router.post('/generate-sql', async (req: Request<{}, {}, { question: string }>, res: Response) => {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: 'A question is required.',
        sql: '',
        explanation: '',
        rows: [],
        executionTimeMs: 0,
      });
    }

    try {
      // Step 1: Generate SQL from natural language via Gemini
      const { sql, explanation } = await generateSQL(question, apiKey);

      // Step 2: Validate the generated SQL for safety
      const validation = validateSQL(sql);
      if (!validation.isValid) {
        return res.status(422).json({
          error: validation.error,
          sql,
          explanation,
          rows: [],
          executionTimeMs: 0,
        });
      }

      // Step 3: Execute the validated SQL
      let rows: any[] = [];
      let executionError: string | null = null;
      const startTime = performance.now();

      try {
        rows = await prisma.$queryRawUnsafe(sql);
      } catch (execErr: any) {
        executionError = execErr.message;
      }

      const endTime = performance.now();
      const executionTimeMs = Math.round(endTime - startTime);

      // Step 4: Log the AI query (tagged as AI-generated)
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "query_logs" ("query", "status", "execution_time_ms") VALUES ($1, $2, $3)`,
          `[AI] ${sql}`,
          executionError ? `ERROR: ${executionError}` : 'SUCCESS',
          executionTimeMs
        );
      } catch (logErr: any) {
        console.error('Failed to log AI query:', logErr.message);
      }

      if (executionError) {
        return res.status(400).json({
          error: `SQL Execution Error: ${executionError}`,
          sql,
          explanation,
          rows: [],
          executionTimeMs,
        });
      }

      return res.json({
        sql,
        explanation,
        rows,
        executionTimeMs,
      });

    } catch (err: any) {
      console.error('AI generation error:', err.message);
      return res.status(500).json({
        error: `AI Error: ${err.message}`,
        sql: '',
        explanation: '',
        rows: [],
        executionTimeMs: 0,
      });
    }
  });

  // --------------------------------------------------------------------------
  // POST /api/ai/suggest-queries
  // Returns AI-generated query suggestions for the judiciary database
  // --------------------------------------------------------------------------
  router.post('/suggest-queries', async (req: Request<{}, {}, { context?: string }>, res: Response) => {
    try {
      const { context } = req.body || {};
      const suggestions = await generateSuggestions(apiKey, context);
      return res.json({ suggestions });
    } catch (err: any) {
      console.error('AI suggestion error:', err.message);
      return res.status(500).json({
        error: `AI Error: ${err.message}`,
        suggestions: [],
      });
    }
  });

  return router;
}
