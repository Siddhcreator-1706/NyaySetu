export interface SavedQuery {
  id?: number;
  name: string;
  query: string;
  created_at?: string;
}

export interface QueryLog {
  id: number;
  query: string;
  status: string;
  execution_time_ms: number;
  executed_at: string;
}

export interface HealthStatus {
  status: string;
  database: string;
}

export interface QueryResponse {
  data?: any[];
  timeMs: number;
  error?: string;
}

// AI NL→SQL Types
export interface AiQueryRequest {
  question: string;
}

export interface AiQueryResponse {
  sql: string;
  explanation: string;
  rows: any[];
  executionTimeMs: number;
  error?: string;
}

export interface AiSuggestion {
  question: string;
  description: string;
}