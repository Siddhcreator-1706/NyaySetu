import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
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
  router.post('/generate-sql', async (req: Request<{}, {}, { question: string; page?: number; pageSize?: number }>, res: Response) => {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: 'A question is required.',
        sql: '',
        explanation: '',
        rows: [],
        totalRows: 0,
        executionTimeMs: 0,
      });
    }

    try {
      // Step 1: Initial AI SQL Generation
      let { sql, explanation } = await generateSQL(question, apiKey);

      let rows: any[] = [];
      let executionError: string | null = null;
      let executionTimeMs = 0;
      
      const MAX_RETRIES = 2; // Auto-heal up to 2 times

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // Step 2: Validate safety
        const validation = validateSQL(sql);
        if (!validation.isValid) {
          if (attempt === 0) {
             return res.status(422).json({
               error: validation.error,
               sql,
               explanation,
               rows: [],
               executionTimeMs: 0,
             });
          } else {
             break; // Stop auto-healing if it generated a dangerous query during fix
          }
        }

        // Step 3: Execute the SQL
        const startTime = performance.now();
        executionError = null; // Reset for this attempt

        try {
          const cleanQuery = sql.replace(/;+\s*$/, '');
          const page = Math.max(1, req.body.page || 1);
          const pageSize = Math.max(1, req.body.pageSize || 50);
          const offset = (page - 1) * pageSize;
          
          const paginatedQuery = `SELECT * FROM (${cleanQuery}) AS user_query LIMIT ${pageSize} OFFSET ${offset}`;
          const countQuery = `SELECT COUNT(*) as total_count FROM (${cleanQuery}) AS user_query`;

          const runQueries = async () => {
            const dataRows = await prisma.$queryRawUnsafe<any[]>(paginatedQuery);
            const countResult = await prisma.$queryRawUnsafe<any[]>(countQuery);
            return { dataRows, count: Number(countResult[0]?.total_count || 0) };
          };

          try {
            const result = await runQueries();
            rows = result.dataRows;
            (req as any).totalRows = result.count;
          } catch (execErr: any) {
            if (execErr.message?.includes('terminating connection') || execErr.message?.includes('E57P01') || execErr.message?.includes('closed')) {
              console.warn('⚠️ Database connection dropped during AI query. Retrying immediately...');
              const result = await runQueries();
              rows = result.dataRows;
              (req as any).totalRows = result.count;
            } else {
              throw execErr;
            }
          }
        } catch (execErr: any) {
          executionError = execErr.message;
        }
        
        executionTimeMs = Math.round(performance.now() - startTime);

        // If no execution error, we successfully ran the query! Break out of the auto-healing loop.
        if (!executionError) {
          break;
        }

        // If we have an execution error (e.g. syntax error, missing column) AND we have retries left:
        if (executionError && attempt < MAX_RETRIES) {
          console.warn(`[Auto-Heal Attempt ${attempt + 1}] SQL failed: ${executionError.split('\n')[0]}`);
          const fixPrompt = `You generated this SQL query for the question "${question}":\n\n${sql}\n\nWhen executed in PostgreSQL, it produced this error:\n\n${executionError}\n\nCRITICAL FIX INSTRUCTIONS:\n1. If the error says a column does not exist, check the schema and ensure you are using the EXACT column name wrapped in double quotes (e.g., "Name" instead of name or NAME).\n2. If there is a syntax error, ensure you are using standard PostgreSQL syntax.\n3. If a relation does not exist, ensure you are joining the correct tables.\nPlease fix the SQL query to resolve this error. Return ONLY the fixed JSON object with "sql" and "explanation".`;
          
          try {
             const fixResult = await generateSQL(fixPrompt, apiKey);
             sql = fixResult.sql;
             explanation = fixResult.explanation + ` (Auto-corrected a SQL error on attempt ${attempt + 1})`;
          } catch (fixGenErr) {
             console.error('Failed to auto-heal:', fixGenErr);
             break; // Stop trying if the AI fails to generate a fix
          }
        }
      }

      // Step 4: Log the final query outcome
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
          totalRows: 0,
          executionTimeMs,
        });
      }

      return res.json({
        sql,
        explanation,
        rows,
        totalRows: (req as any).totalRows || 0,
        executionTimeMs,
      });

    } catch (err: any) {
      console.error('AI generation error:', err.message);
      
      let userFriendlyError = err.message;
      
      // Parse ugly Google API errors into friendly messages
      if (err.message?.includes('429 Too Many Requests') || err.message?.includes('Quota exceeded')) {
        userFriendlyError = "⚠️ AI Rate Limit Reached: You are sending requests too quickly. Please wait about 60 seconds and try again.";
      } else if (err.message?.includes('fetch failed')) {
        userFriendlyError = "⚠️ Network Error: Could not connect to the AI service. Please try again.";
      } else if (err.message?.includes('API_KEY')) {
        userFriendlyError = "⚠️ Configuration Error: Invalid or missing API Key.";
      } else if (err.message?.includes('503') || err.message?.includes('high demand')) {
        userFriendlyError = "⚠️ High Demand: Google's AI servers are currently overloaded. Please try again in a few moments.";
      } else {
        userFriendlyError = `⚠️ AI Error: An unexpected error occurred while generating the response. (${err.message})`;
      }

      return res.status(500).json({
        error: userFriendlyError,
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
