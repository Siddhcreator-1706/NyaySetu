import { useState } from 'react';

function App() {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to execute query');
        if (data.executionTimeMs) {
          setStats({ count: 0, timeMs: data.executionTimeMs });
        }
      } else {
        const returnedRows = data.rows || [];
        setRows(returnedRows);
        setStats({ count: returnedRows.length, timeMs: data.executionTimeMs });

        if (returnedRows.length > 0) {
          setColumns(Object.keys(returnedRows[0]));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Could not connect to the API server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto p-8 font-sans text-slate-100 bg-[#0b0f19] min-h-screen box-border">

      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-indigo-400 m-0">
            NyaySetu SQL Terminal ⚖️
          </h1>
          <p className="mt-1 text-slate-400 text-sm">
            Run live SQL queries against the judiciary Neon PostgreSQL database.
          </p>
        </div>
      </header>

      {/* Editor Panel */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-5 mb-8 shadow-2xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-slate-400 font-semibold tracking-wider">
            WRITE SQL TRANSACTION
          </span>
          <button
            onClick={handleRunQuery}
            disabled={loading}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-md shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Running...' : '⚡ Run Query'}
          </button>
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-[150px] bg-[#070a13] text-yellow-400 font-mono text-base p-4 rounded-lg border border-slate-800 resize-y outline-none leading-relaxed box-border"
        />
      </div>

      {/* Results Workspace */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-6 min-h-[300px] shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-slate-100 m-0">
            Query Results
          </h2>
          {stats && (
            <span className="text-xs text-slate-500 font-medium">
              {stats.count} rows • {stats.timeMs}ms
            </span>
          )}
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex-1 flex flex-col justify-center items-center gap-3 py-12">
            <div className="w-9 h-9 border-3 border-transparent border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-slate-400 text-sm">Executing transaction against database...</span>
          </div>
        )}

        {/* Error Block */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-red-300 font-mono text-sm whitespace-pre-wrap my-4">
            <strong>⚠️ SQL Execution Error:</strong>
            <div className="mt-2">{error}</div>
          </div>
        )}

        {/* Successful Table Results */}
        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="bg-slate-800/20 border-b border-slate-800">
                  {columns.map((col) => (
                    <th key={col} className="p-3 text-slate-100 font-semibold border-b-2 border-slate-800">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className={`border-b border-slate-800/50 ${rIdx % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/10'}`}>
                    {columns.map((col) => (
                      <td key={col} className="p-3 text-slate-300">
                        {row[col] === null ? <em className="text-slate-600">null</em> : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && rows.length === 0 && (
          <div className="flex-1 flex flex-col justify-center items-center text-slate-500 py-16 gap-2">
            <span className="text-4xl">🗃️</span>
            <h4 className="text-slate-400 font-medium m-0">No records loaded</h4>
            <p className="text-xs m-0">Enter a query above and click "Run Query" to fetch results.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
