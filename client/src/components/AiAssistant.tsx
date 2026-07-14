import { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AiResponse {
  sql: string;
  explanation: string;
  rows: any[];
  executionTimeMs: number;
  error?: string;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  question?: string;
  response?: AiResponse;
  loading?: boolean;
  timestamp: Date;
}

interface AiAssistantProps {
  onRunInEditor?: (sql: string) => void;
}

// ---------------------------------------------------------------------------
// Suggestion chips
// ---------------------------------------------------------------------------
const DEFAULT_SUGGESTIONS = [
  { question: 'Show me all pending cases', description: 'Lists cases with pending status', icon: '📋' },
  { question: 'Which lawyer has handled the most cases?', description: 'Ranks lawyers by caseload', icon: '👨‍⚖️' },
  { question: 'List all judges working at High Courts', description: 'Judges assigned to High Courts', icon: '🏛️' },
  { question: 'Show cases with unverified evidence', description: 'Evidence needing verification', icon: '🔍' },
  { question: 'What are the most recent judgements?', description: 'Latest court decisions', icon: '⚖️' },
  { question: 'How many cases does each court handle?', description: 'Caseload distribution across courts', icon: '📊' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AiAssistant({ onRunInEditor }: AiAssistantProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Send question ──
  const sendQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMsgId = nextId.current++;
    const aiMsgId = nextId.current++;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', question, timestamp: new Date() },
      { id: aiMsgId, role: 'ai', loading: true, timestamp: new Date() },
    ]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/generate-sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data: AiResponse = await res.json();
      setMessages((prev) =>
        prev.map((msg) => (msg.id === aiMsgId ? { ...msg, loading: false, response: data } : msg))
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                loading: false,
                response: { sql: '', explanation: '', rows: [], executionTimeMs: 0, error: err.message || 'Failed to connect.' },
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const handleCopy = (sql: string, id: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Results table ──
  const renderTable = (rows: any[]) => {
    if (!rows?.length) return null;
    const cols = Object.keys(rows[0]);
    return (
      <div
        className="overflow-x-auto rounded-xl mt-3 max-h-[280px] overflow-y-auto"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        <table className="w-full border-collapse text-xs text-left">
          <thead>
            <tr style={{ background: 'rgba(99,102,241,0.06)' }}>
              {cols.map((c) => (
                <th
                  key={c}
                  className="p-2.5 font-semibold whitespace-nowrap tracking-wide sticky top-0"
                  style={{
                    color: '#a5b4fc',
                    borderBottom: '1px solid var(--border-default)',
                    background: 'var(--bg-card)',
                    fontSize: '10px',
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="transition-colors"
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(99,102,241,0.02)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(99,102,241,0.02)')}
              >
                {cols.map((c) => (
                  <td key={c} className="p-2.5 whitespace-nowrap max-w-[200px] truncate" style={{ color: '#94a3b8' }}>
                    {row[c] === null ? <em style={{ color: 'rgba(148,163,184,0.25)' }}>null</em> : String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── AI message bubble ──
  const renderAiMsg = (msg: ChatMessage) => {
    if (msg.loading) {
      return (
        <div className="flex items-start gap-3 mb-5 animate-fade-in">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
            style={{ background: 'var(--gradient-ai)', boxShadow: '0 4px 12px rgba(139,92,246,0.25)' }}
          >
            AI
          </div>
          <div className="flex-1 pt-0.5 space-y-2.5">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
              <span
                className="w-4 h-4 rounded-full animate-spin"
                style={{ border: '2px solid transparent', borderTopColor: '#a78bfa' }}
              />
              Analyzing your question &amp; generating SQL...
            </div>
            <div className="space-y-2 mt-1">
              <div className="h-3 rounded-md skeleton-shimmer w-4/5" />
              <div className="h-3 rounded-md skeleton-shimmer w-3/5" />
              <div className="h-10 rounded-lg skeleton-shimmer w-full mt-2" />
            </div>
          </div>
        </div>
      );
    }

    const r = msg.response!;
    const copyId = `sql-${msg.id}`;

    return (
      <div className="flex items-start gap-3 mb-6 animate-fade-in-up">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
          style={{ background: 'var(--gradient-ai)', boxShadow: '0 4px 12px rgba(139,92,246,0.25)' }}
        >
          AI
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          {/* Error */}
          {r.error && (
            <div
              className="p-3.5 rounded-xl text-sm"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.12)',
                color: '#fca5a5',
              }}
            >
              <strong className="block mb-1" style={{ color: '#f87171' }}>⚠️ Error</strong>
              {r.error}
            </div>
          )}

          {/* Explanation */}
          {r.explanation && (
            <div
              className="rounded-xl p-3.5"
              style={{
                background: 'rgba(139,92,246,0.04)',
                border: '1px solid rgba(139,92,246,0.1)',
              }}
            >
              <p className="text-sm leading-relaxed m-0" style={{ color: '#c4b5fd' }}>
                {r.explanation}
              </p>
            </div>
          )}

          {/* Generated SQL */}
          {r.sql && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
              }}
            >
              {/* SQL header bar */}
              <div
                className="flex items-center justify-between px-3.5 py-2"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <span
                  className="text-[10px] font-semibold tracking-[0.15em] uppercase"
                  style={{ color: 'rgba(148,163,184,0.4)' }}
                >
                  Generated SQL
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(r.sql, copyId)}
                    className="text-[10px] px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer border-none"
                    style={{
                      background: copiedId === copyId ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.08)',
                      color: copiedId === copyId ? '#6ee7b7' : '#818cf8',
                      border: `1px solid ${copiedId === copyId ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.12)'}`,
                    }}
                  >
                    {copiedId === copyId ? '✓ Copied' : '📋 Copy'}
                  </button>
                  {onRunInEditor && (
                    <button
                      onClick={() => onRunInEditor(r.sql)}
                      className="text-[10px] px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer border-none"
                      style={{
                        background: 'rgba(139,92,246,0.1)',
                        color: '#c4b5fd',
                        border: '1px solid rgba(139,92,246,0.15)',
                      }}
                    >
                      ⚡ Run in Editor
                    </button>
                  )}
                </div>
              </div>
              <pre
                className="p-3.5 text-xs leading-relaxed overflow-x-auto m-0 whitespace-pre-wrap"
                style={{ color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace" }}
              >
                {r.sql}
              </pre>
            </div>
          )}

          {/* Stats */}
          {r.executionTimeMs > 0 && !r.error && (
            <div className="flex items-center gap-2.5">
              <span
                className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                style={{ background: 'rgba(16,185,129,0.06)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.1)' }}
              >
                ⏱ {r.executionTimeMs}ms
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                style={{ background: 'rgba(99,102,241,0.06)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.1)' }}
              >
                📊 {r.rows?.length || 0} rows
              </span>
            </div>
          )}

          {/* Results */}
          {r.rows?.length > 0 && renderTable(r.rows)}

          {r.sql && !r.error && r.rows?.length === 0 && (
            <p className="text-xs italic m-0 mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>
              Query executed successfully but returned no rows.
            </p>
          )}
        </div>
      </div>
    );
  };

  // ── Main render ──
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-1 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center pt-8 pb-4 sm:pt-12 animate-fade-in">
            <h3 className="text-xl font-bold m-0 mb-1.5" style={{ color: '#e2e8f0' }}>
              NyaySetu AI Assistant
            </h3>
            <p className="text-sm m-0 mb-10 max-w-md px-4" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Ask questions about the judiciary database in plain English.
              I'll generate the SQL, execute it, and show you the results.
            </p>

            {/* Suggestion grid */}
            <div className="w-full max-w-2xl px-2">
              <p
                className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-4 text-left sm:text-center"
                style={{ color: 'rgba(148,163,184,0.4)' }}
              >
                Suggested questions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEFAULT_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendQuestion(s.question)}
                    disabled={isLoading}
                    className="text-left p-4 rounded-xl transition-all duration-200 cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed border-none flex items-start gap-3.5"
                    style={{
                      background: 'rgba(99,102,241,0.03)',
                      border: '1px solid var(--border-subtle)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(139,92,246,0.08)';
                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.03)';
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span className="text-xl shrink-0 leading-none mt-0.5">{s.icon}</span>
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-medium leading-tight" style={{ color: '#c4b5fd' }}>
                        {s.question}
                      </span>
                      <span className="text-xs leading-snug" style={{ color: 'rgba(148,163,184,0.45)' }}>
                        {s.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex items-start gap-3 mb-4 animate-fade-in">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                      style={{ background: 'var(--gradient-success)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}
                    >
                      U
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm m-0 leading-relaxed" style={{ color: '#e2e8f0' }}>{msg.question}</p>
                    </div>
                  </div>
                ) : (
                  renderAiMsg(msg)
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 pt-4 pb-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the judiciary database in plain English..."
            disabled={isLoading}
            className="flex-1 text-sm px-4 py-3 rounded-xl outline-none transition-all disabled:opacity-50"
            style={{
              background: 'var(--bg-input)',
              color: '#e2e8f0',
              border: '1px solid var(--border-subtle)',
              fontFamily: "'Inter', sans-serif",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(139,92,246,0.3)';
              e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(99,102,241,0.08)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-full sm:w-auto font-semibold px-5 py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none text-white text-sm whitespace-nowrap flex justify-center items-center"
            style={{
              background: 'var(--gradient-ai)',
              boxShadow: '0 4px 15px rgba(139,92,246,0.3)',
            }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full animate-spin"
                  style={{ border: '2px solid transparent', borderTopColor: '#fff' }}
                />
                Thinking...
              </span>
            ) : (
              '🧠 Ask AI'
            )}
          </button>
        </form>
        <p className="text-[10px] mt-2 text-center m-0" style={{ color: 'rgba(148,163,184,0.3)' }}>
          AI generates read-only SELECT queries · Dangerous operations are blocked automatically
        </p>
      </div>
    </div>
  );
}
