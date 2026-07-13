import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// SCHEMA CONTEXT — Encodes the full judiciary database schema for the LLM
// ============================================================================

const SCHEMA_CONTEXT = `
You have access to a PostgreSQL judiciary database with the following schema.
All table and column names use double-quoted identifiers.

TABLE "CASE" (
  case_no VARCHAR(15) PRIMARY KEY,
  "type" VARCHAR(20) NOT NULL,          -- e.g. 'Civil', 'Criminal'
  "Category" VARCHAR(30) NOT NULL,      -- e.g. 'Family', 'Property'
  "Jurisdiction_Type" VARCHAR(30) NOT NULL,
  "Name" VARCHAR(100) NOT NULL,         -- case title
  "Description" TEXT,
  curr_status VARCHAR(20) NOT NULL      -- e.g. 'Pending', 'Closed', 'Active'
);

TABLE "LAWYER" (
  "BAR_Registration_No" VARCHAR(20) PRIMARY KEY,
  "Qualification" VARCHAR(100) NOT NULL,
  "Specialization" VARCHAR(100) NOT NULL,
  "Phone_No" VARCHAR(15) UNIQUE NOT NULL,
  "Email" VARCHAR(50) UNIQUE NOT NULL,
  "Office_Address" TEXT,
  "Experience" TEXT,
  "Status" VARCHAR(20) NOT NULL          -- e.g. 'Active', 'Inactive'
);

TABLE "JUDGE" (
  "ID" INT PRIMARY KEY,
  "Name" VARCHAR(100) NOT NULL,
  "Gender" VARCHAR(15) NOT NULL,
  "DOB" DATE NOT NULL,
  "Email" VARCHAR(50) UNIQUE NOT NULL,
  "Status" VARCHAR(20) NOT NULL,
  "Phone_No" VARCHAR(15) UNIQUE NOT NULL,
  "Address" TEXT,
  "Position" VARCHAR(30) NOT NULL,       -- e.g. 'Chief Justice', 'Judge'
  "Qualification" VARCHAR(50) NOT NULL,
  "Experience" VARCHAR(50)
);

TABLE "COURT" (
  "ID" INT PRIMARY KEY,
  "Location" TEXT NOT NULL,
  "Level" VARCHAR(20) NOT NULL,          -- e.g. 'District', 'High', 'Supreme'
  "Pin_Code" INT NOT NULL,
  "Email" VARCHAR(50) UNIQUE NOT NULL,
  "Phone_No" VARCHAR(15) UNIQUE NOT NULL
);

TABLE "LITIGANTS" (
  "ID" VARCHAR(20) PRIMARY KEY,
  "Name" VARCHAR(100) NOT NULL,
  "Type" VARCHAR(30) NOT NULL,           -- e.g. 'Plaintiff', 'Defendant'
  "Address" TEXT,
  "Phone" VARCHAR(15) UNIQUE NOT NULL,
  "Email" VARCHAR(50) UNIQUE NOT NULL,
  "Gender" VARCHAR(10)
);

TABLE "PANEL" (
  "ID" INT PRIMARY KEY,
  "type" VARCHAR(30) NOT NULL,
  form_date DATE NOT NULL,
  dissolve_date DATE                     -- NULL if still active
);

TABLE "FILING_DETAILS" (
  "ID" VARCHAR(15) PRIMARY KEY,
  "Registration_date" DATE NOT NULL,
  "filing_mode" VARCHAR(50) NOT NULL,    -- e.g. 'Online', 'Offline'
  case_no VARCHAR(15) REFERENCES "CASE"(case_no)
);

TABLE "CASE_STATUS" (
  "Status_ID" VARCHAR(15) PRIMARY KEY,
  case_no VARCHAR(15) REFERENCES "CASE"(case_no),
  status VARCHAR(20) NOT NULL,
  curr_stage VARCHAR(30) NOT NULL,
  is_dormant BOOLEAN NOT NULL,
  dormant_reason TEXT
);

TABLE "JUDGEMENT" (
  "ID" VARCHAR(25) PRIMARY KEY,
  "Decision_date" DATE NOT NULL,
  verdict TEXT NOT NULL,
  compensations TEXT,
  sentence_length_punishment TEXT,
  remark TEXT,
  case_no VARCHAR(15) REFERENCES "CASE"(case_no),
  panel_id INT REFERENCES "PANEL"("ID")
);

TABLE "EVIDENCE" (
  "ID" INT PRIMARY KEY,
  "Type" VARCHAR(20) NOT NULL,           -- e.g. 'Documentary', 'Physical'
  "Description" TEXT,
  "Submission_date" DATE NOT NULL,
  "Verified_Status" BOOLEAN NOT NULL,
  case_no VARCHAR(15) REFERENCES "CASE"(case_no)
);

TABLE "WARRANT" (
  "ID" VARCHAR(15) PRIMARY KEY,
  "Type" VARCHAR(20) NOT NULL,
  "Issue_Date" TIMESTAMP NOT NULL,
  "Exp_date" TIMESTAMP,
  "Status" VARCHAR(20) NOT NULL,
  case_no VARCHAR(15) REFERENCES "CASE"(case_no)
);

TABLE "DOCUMENT_REPO" (
  "ID" VARCHAR(20) PRIMARY KEY,
  "Name" VARCHAR(50) NOT NULL,
  "Type" VARCHAR(20) NOT NULL,
  "Link" TEXT NOT NULL,
  "BAR_Registration_No" VARCHAR(20) REFERENCES "LAWYER"("BAR_Registration_No"),
  case_no VARCHAR(15) REFERENCES "CASE"(case_no)
);

TABLE "HEARING" (
  "Hearing_No" INT PRIMARY KEY,
  case_no VARCHAR(15) REFERENCES "CASE"(case_no),
  court_id INT REFERENCES "COURT"("ID"),
  "Type" VARCHAR(20) NOT NULL,
  "Status" VARCHAR(20) NOT NULL
);

TABLE "HEARING_TRANSCRIPT" (
  "ID" INT NOT NULL,
  "Hearing_no" INT REFERENCES "HEARING"("Hearing_No"),
  "Text" TEXT NOT NULL,
  recorded_by INT REFERENCES "JUDGE"("ID"),
  court_id INT REFERENCES "COURT"("ID"),
  "Time_stamp" TIME NOT NULL,
  PRIMARY KEY ("Hearing_no", "ID")
);

-- Junction / relationship tables:
TABLE "HANDLED_BY" (
  "BAR_Registration_No" VARCHAR(20) REFERENCES "LAWYER",
  case_no VARCHAR(15) REFERENCES "CASE",
  PRIMARY KEY ("BAR_Registration_No", case_no)
);

TABLE "PARTICIPATES_IN" (
  litigant_id VARCHAR(20) REFERENCES "LITIGANTS",
  case_no VARCHAR(15) REFERENCES "CASE",
  PRIMARY KEY (litigant_id, case_no)
);

TABLE "WORKS_FOR" (
  judge_id INT REFERENCES "JUDGE",
  court_id INT REFERENCES "COURT",
  PRIMARY KEY (judge_id, court_id)
);

TABLE "HANDLES" (
  court_id INT REFERENCES "COURT",
  case_no VARCHAR(15) REFERENCES "CASE",
  PRIMARY KEY (court_id, case_no)
);

TABLE "FORMS" (
  judge_id INT REFERENCES "JUDGE",
  panel_id INT REFERENCES "PANEL",
  PRIMARY KEY (judge_id, panel_id)
);

TABLE "HEARD_BY" (
  hearing_no INT REFERENCES "HEARING",
  panel_id INT REFERENCES "PANEL",
  PRIMARY KEY (hearing_no, panel_id)
);

TABLE "IS_PRECEDENT" (
  case_no VARCHAR(15) REFERENCES "CASE",
  precedent_case_no VARCHAR(15) REFERENCES "CASE",
  PRIMARY KEY (case_no, precedent_case_no)
);
`.trim();

// ============================================================================
// SYSTEM PROMPT — Instructs the LLM on how to generate SQL
// ============================================================================

const SYSTEM_PROMPT = `
You are NyaySetu AI — an expert SQL assistant for a judiciary case management system.
Your job is to convert natural language questions into valid PostgreSQL queries.

DATABASE SCHEMA:
${SCHEMA_CONTEXT}

RULES:
1. Generate ONLY SELECT queries. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or CREATE statements.
2. Always use double-quoted identifiers for table and column names exactly as shown in the schema (e.g., "CASE", "BAR_Registration_No").
3. Use appropriate JOINs when the question involves multiple tables. Prefer INNER JOIN unless the question implies optional matches.
4. Add LIMIT 50 to queries that could return many rows, unless the user specifies a different limit.
5. Use meaningful column aliases with AS for computed columns.
6. For aggregate queries, always include a GROUP BY clause.
7. When filtering by text values, use ILIKE for case-insensitive matching unless exact match is intended.
8. Return results ordered in a sensible way (e.g., by date DESC, by count DESC).

RESPONSE FORMAT:
You must respond with ONLY a JSON object (no markdown, no code fences, no extra text) in this exact format:
{
  "sql": "YOUR SQL QUERY HERE",
  "explanation": "A brief, human-readable explanation of what the query does and why you structured it this way."
}

EXAMPLES:

User: "Show me all pending cases"
{
  "sql": "SELECT case_no, \\\"type\\\", \\\"Category\\\", \\\"Name\\\", \\\"Description\\\" FROM \\\"CASE\\\" WHERE curr_status ILIKE '%pending%' LIMIT 50;",
  "explanation": "Retrieves all cases with a 'Pending' status, showing their case number, type, category, name, and description."
}

User: "Which lawyer has handled the most cases?"
{
  "sql": "SELECT l.\\\"BAR_Registration_No\\\", l.\\\"Qualification\\\", l.\\\"Specialization\\\", COUNT(h.case_no) AS total_cases FROM \\\"LAWYER\\\" l INNER JOIN \\\"HANDLED_BY\\\" h ON l.\\\"BAR_Registration_No\\\" = h.\\\"BAR_Registration_No\\\" GROUP BY l.\\\"BAR_Registration_No\\\", l.\\\"Qualification\\\", l.\\\"Specialization\\\" ORDER BY total_cases DESC LIMIT 10;",
  "explanation": "Joins LAWYER with HANDLED_BY to count cases per lawyer, then ranks them by total cases handled in descending order."
}

User: "List all judges working at High Courts"
{
  "sql": "SELECT j.\\\"ID\\\", j.\\\"Name\\\", j.\\\"Position\\\", c.\\\"Location\\\" FROM \\\"JUDGE\\\" j INNER JOIN \\\"WORKS_FOR\\\" w ON j.\\\"ID\\\" = w.judge_id INNER JOIN \\\"COURT\\\" c ON w.court_id = c.\\\"ID\\\" WHERE c.\\\"Level\\\" ILIKE '%high%' LIMIT 50;",
  "explanation": "Joins JUDGE → WORKS_FOR → COURT to find judges assigned to courts with 'High' level."
}
`.trim();

// ============================================================================
// SQL VALIDATOR — Safety layer to block dangerous operations
// ============================================================================

// Allowed table names from the schema
const VALID_TABLES = new Set([
  'CASE', 'LAWYER', 'JUDGE', 'COURT', 'LITIGANTS', 'PANEL',
  'FILING_DETAILS', 'CASE_STATUS', 'JUDGEMENT', 'EVIDENCE',
  'WARRANT', 'DOCUMENT_REPO', 'HEARING', 'HEARING_TRANSCRIPT',
  'HANDLED_BY', 'PARTICIPATES_IN', 'WORKS_FOR', 'HANDLES',
  'FORMS', 'HEARD_BY', 'IS_PRECEDENT'
]);

// Dangerous SQL keywords that should never appear in AI-generated queries
const BLOCKED_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
  'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL',
  'COPY', 'VACUUM', 'REINDEX', 'CLUSTER'
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateSQL(sql: string): ValidationResult {
  if (!sql || !sql.trim()) {
    return { isValid: false, error: 'Empty SQL query received from AI.' };
  }

  const trimmed = sql.trim();

  // 1. Must start with SELECT (or WITH for CTEs)
  const upperTrimmed = trimmed.toUpperCase();
  if (!upperTrimmed.startsWith('SELECT') && !upperTrimmed.startsWith('WITH')) {
    return {
      isValid: false,
      error: 'Only SELECT queries are allowed. The AI generated a non-SELECT statement.'
    };
  }

  // 2. Block multiple statements (semicolon followed by more SQL)
  //    Allow a trailing semicolon but not multiple statements
  const withoutStrings = trimmed.replace(/'[^']*'/g, ''); // strip string literals
  const statements = withoutStrings.split(';').filter(s => s.trim().length > 0);
  if (statements.length > 1) {
    return {
      isValid: false,
      error: 'Multiple SQL statements detected. Only single queries are allowed.'
    };
  }

  // 3. Block dangerous keywords (check in the string-stripped version)
  const upperClean = withoutStrings.toUpperCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    //  Match whole words only to avoid false positives (e.g. "UPDATED_AT" containing "UPDATE")
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(upperClean)) {
      return {
        isValid: false,
        error: `Blocked dangerous SQL keyword: ${keyword}. Only SELECT queries are permitted.`
      };
    }
  }

  // 4. Block common injection patterns
  if (upperClean.includes('--') || upperClean.includes('/*')) {
    return {
      isValid: false,
      error: 'SQL comments are not allowed in AI-generated queries.'
    };
  }

  return { isValid: true };
}

// ============================================================================
// GEMINI API — Generates SQL from natural language
// ============================================================================

export interface GenerateSQLResult {
  sql: string;
  explanation: string;
}

export async function generateSQL(
  question: string,
  apiKey: string
): Promise<GenerateSQLResult> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please add it to your .env file.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: {
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }],
    },
    generationConfig: {
      temperature: 0.1,   // Low temperature for deterministic SQL generation
      maxOutputTokens: 1024,
    },
  });

  const result = await model.generateContent(question);
  const responseText = result.response.text().trim();

  // Parse the JSON response
  try {
    // Clean up response — sometimes the LLM wraps in code fences
    let cleanResponse = responseText;
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse
        .replace(/^```(?:json)?\s*\n?/, '')
        .replace(/\n?```\s*$/, '');
    }

    const parsed = JSON.parse(cleanResponse);

    if (!parsed.sql || typeof parsed.sql !== 'string') {
      throw new Error('Invalid response structure from AI: missing "sql" field.');
    }

    return {
      sql: parsed.sql.trim(),
      explanation: parsed.explanation || 'Query generated successfully.',
    };
  } catch (parseError: any) {
    console.error('Failed to parse AI response:', responseText);
    throw new Error(
      `Failed to parse AI response. Raw response: ${responseText.substring(0, 200)}`
    );
  }
}

// ============================================================================
// QUERY SUGGESTIONS — Asks the LLM for useful starter queries
// ============================================================================

export async function generateSuggestions(
  apiKey: string,
  context?: string
): Promise<Array<{ question: string; description: string }>> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });

  const prompt = `
You are NyaySetu AI for a judiciary database. Suggest 5 interesting and useful natural language questions a user could ask about the database.
${context ? `Focus on: ${context}` : 'Cover a variety of topics: cases, lawyers, judges, courts, evidence, hearings.'}

Respond with ONLY a JSON array (no code fences, no extra text):
[
  { "question": "...", "description": "Brief description of what this query reveals" }
]
`.trim();

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  try {
    let cleanResponse = responseText;
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse
        .replace(/^```(?:json)?\s*\n?/, '')
        .replace(/\n?```\s*$/, '');
    }

    return JSON.parse(cleanResponse);
  } catch {
    // Return default suggestions if parsing fails
    return [
      { question: 'Show me all pending cases', description: 'Lists cases with pending status' },
      { question: 'Which lawyer has handled the most cases?', description: 'Ranks lawyers by caseload' },
      { question: 'List all judges at High Courts', description: 'Shows judges assigned to High Courts' },
      { question: 'Show cases with unverified evidence', description: 'Finds cases where evidence needs verification' },
      { question: 'What are the most recent judgements?', description: 'Shows latest court decisions' },
    ];
  }
}
