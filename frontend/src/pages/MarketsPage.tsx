import { useEffect, useState } from 'react';
import { Search, Store, MapPin, Loader2 } from 'lucide-react';
import { marketsApi } from '@/api/services';
import type { Market } from '@/types';

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [total, setTotal] = useState(0);
  const [states, setStates] = useState<string[]>([]);

  useEffect(() => {
    marketsApi.list({ page_size: 200 }).then(r => {
      const all = r.data.results ?? [];
      const uniqueStates = [...new Set(all.map(m => m.state))].sort();
      setStates(uniqueStates);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page_size: 100 };
    if (search) params.search = search;
    if (state) params.state = state;
    marketsApi.list(params)
      .then(r => { setMarkets(r.data.results ?? []); setTotal(r.data.count ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, state]);

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <div>
          <h1>Market Explorer</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} markets in the system</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Search markets…" className="input pl-9"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={state} onChange={e => setState(e.target.value)}>
          <option value="">All States</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : markets.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No markets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map(m => (
            <div key={m.id} className="card-hover p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Store className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{m.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <MapPin className="w-3 h-3" /> {m.district}, {m.state}
                  </div>
                  {m.data_source && (
                    <div className="text-xs text-gray-400 mt-1.5">Source: {m.data_source}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
