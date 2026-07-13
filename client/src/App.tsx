import { useState } from 'react';
import AiAssistant from './components/AiAssistant';

type Tab = 'sql' | 'ai';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('sql');

  // ── SQL Editor state ──
  const [query, setQuery] = useState('SELECT * FROM "CASE" LIMIT 5;');
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ count: number; timeMs: number } | null>(null);

  const handleRunQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setRows([]);
    setColumns([]);
    setStats(null);

    try {
      const response = await fetch('http://localhost:5000/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to execute query');
        if (data.executionTimeMs) setStats({ count: 0, timeMs: data.executionTimeMs });
      } else {
        const returnedRows = data.rows || [];
        setRows(returnedRows);
        setStats({ count: returnedRows.length, timeMs: data.executionTimeMs });
        if (returnedRows.length > 0) setColumns(Object.keys(returnedRows[0]));
      }
    } catch (err: any) {
      setError(err.message || 'Could not connect to the API server.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunQuery();
    }
  };

  const handleRunInEditor = (sql: string) => {
    setQuery(sql);
    setActiveTab('sql');
  };

  return (
    <div className="app-container min-h-screen" style={{ background: 'var(--bg-root)' }}>
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-6 font-[Inter,sans-serif]">

        {/* ═══════════════ HEADER ═══════════════ */}
        <header className="mb-8 flex justify-between items-center animate-fade-in">
          <div className="flex items-center gap-4">
            {/* Logo mark */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-lg"
              style={{
                background: 'var(--gradient-primary)',
                boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
              }}
            >
              ⚖️
            </div>
            <div>
              <h1
                className="text-2xl font-bold m-0 bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 50%, #e9d5ff 100%)',
                }}
              >
                NyaySetu
              </h1>
              <p className="text-xs m-0 mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                Judiciary Database Intelligence Platform
              </p>
            </div>
          </div>

          {/* Status pill */}
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.15)',
              color: '#6ee7b7',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            PostgreSQL Connected
          </div>
        </header>

        {/* ═══════════════ TAB BAR ═══════════════ */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl mb-6 w-fit"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {[
            { id: 'sql' as Tab, label: 'SQL Editor', icon: '⚡', gradient: 'var(--gradient-primary)' },
            { id: 'ai' as Tab, label: 'AI Assistant', icon: '🧠', gradient: 'var(--gradient-ai)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer border-none"
              style={{
                background: activeTab === tab.id ? tab.gradient : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(148,163,184,0.7)',
                boxShadow: activeTab === tab.id
                  ? '0 4px 15px rgba(99,102,241,0.25)'
                  : 'none',
              }}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════ SQL EDITOR TAB ═══════════════ */}
        {activeTab === 'sql' && (
          <div className="animate-fade-in-up">
            {/* Editor Card */}
            <div
              className="rounded-2xl p-5 mb-6"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--glow-card)',
              }}
            >
              {/* Editor toolbar */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: '#eab308' }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
                  </div>
                  <span
                    className="text-[10px] font-semibold tracking-[0.15em] uppercase ml-2"
                    style={{ color: 'rgba(148,163,184,0.5)' }}
                  >
                    SQL Transaction
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] hidden sm:inline" style={{ color: 'rgba(148,163,184,0.4)' }}>
                    Ctrl+Enter to run
                  </span>
                  <button
                    onClick={handleRunQuery}
                    disabled={loading}
                    className="font-semibold py-2 px-5 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-none text-white text-sm"
                    style={{
                      background: 'var(--gradient-primary)',
                      boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-transparent border-t-white rounded-full animate-spin" />
                        Running...
                      </span>
                    ) : (
                      '⚡ Execute Query'
                    )}
                  </button>
                </div>
              </div>

              {/* SQL textarea */}
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                className="w-full h-[160px] text-sm p-4 rounded-xl resize-y outline-none leading-relaxed"
                style={{
                  background: 'var(--bg-input)',
                  color: '#fbbf24',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(99,102,241,0.3)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(99,102,241,0.08)')}
              />
            </div>

            {/* Results Card */}
            <div
              className="rounded-2xl p-6 min-h-[300px] flex flex-col"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--glow-card)',
              }}
            >
              {/* Results header */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold m-0" style={{ color: '#e2e8f0' }}>
                  Query Results
                </h2>
                {stats && (
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs px-2.5 py-1 rounded-md font-medium"
                      style={{
                        background: 'rgba(99,102,241,0.08)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99,102,241,0.12)',
                      }}
                    >
                      {stats.count} rows
                    </span>
                    <span
                      className="text-xs px-2.5 py-1 rounded-md font-medium"
                      style={{
                        background: 'rgba(16,185,129,0.08)',
                        color: '#6ee7b7',
                        border: '1px solid rgba(16,185,129,0.12)',
                      }}
                    >
                      ⏱ {stats.timeMs}ms
                    </span>
                  </div>
                )}
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex-1 flex flex-col justify-center items-center gap-4 py-16">
                  <div
                    className="w-10 h-10 rounded-full animate-spin"
                    style={{ border: '3px solid transparent', borderTopColor: '#6366f1' }}
                  />
                  <span className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    Executing transaction...
                  </span>
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div
                  className="p-4 rounded-xl text-sm whitespace-pre-wrap my-2 animate-fade-in"
                  style={{
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    color: '#fca5a5',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '13px',
                  }}
                >
                  <strong className="block mb-1.5" style={{ color: '#f87171' }}>
                    ⚠️ Execution Error
                  </strong>
                  {error}
                </div>
              )}

              {/* Table */}
              {!loading && !error && rows.length > 0 && (
                <div
                  className="overflow-x-auto rounded-xl animate-fade-in-up"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  <table className="w-full border-collapse text-sm text-left">
                    <thead>
                      <tr style={{ background: 'rgba(99,102,241,0.06)' }}>
                        {columns.map((col) => (
                          <th
                            key={col}
                            className="p-3 font-semibold text-xs tracking-wide whitespace-nowrap"
                            style={{
                              color: '#a5b4fc',
                              borderBottom: '1px solid var(--border-default)',
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="transition-colors"
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: rIdx % 2 === 0 ? 'transparent' : 'rgba(99,102,241,0.02)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = rIdx % 2 === 0 ? 'transparent' : 'rgba(99,102,241,0.02)')}
                        >
                          {columns.map((col) => (
                            <td
                              key={col}
                              className="p-3 text-sm"
                              style={{ color: '#cbd5e1' }}
                            >
                              {row[col] === null ? (
                                <em style={{ color: 'rgba(148,163,184,0.3)' }}>null</em>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Empty state */}
              {!loading && !error && rows.length === 0 && (
                <div className="flex-1 flex flex-col justify-center items-center py-16 gap-3">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{
                      background: 'rgba(99,102,241,0.06)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    🗃️
                  </div>
                  <h4 className="font-semibold m-0" style={{ color: 'rgba(226,232,240,0.7)' }}>
                    No records loaded
                  </h4>
                  <p className="text-xs m-0" style={{ color: 'rgba(148,163,184,0.5)' }}>
                    Write a query above and click "Execute Query" to fetch results.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ AI ASSISTANT TAB ═══════════════ */}
        {activeTab === 'ai' && (
          <div
            className="rounded-2xl p-6 animate-fade-in-up"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--glow-card)',
              minHeight: 'calc(100vh - 200px)',
            }}
          >
            <AiAssistant onRunInEditor={handleRunInEditor} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
