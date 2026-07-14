// ============================================================================
// API Configuration — Central API base URL for all fetch calls.
// In development, Vite proxies to localhost:5000.
// In production, set VITE_API_URL to your Railway backend URL.
// ============================================================================

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
