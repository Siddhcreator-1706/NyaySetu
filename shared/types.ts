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
