import { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { pricesApi, cropsApi, marketsApi } from '@/api/services';
import type { Crop, Market, PriceTrend } from '@/types';

export default function PricesPage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [days, setDays] = useState(365);
  const [trends, setTrends] = useState<PriceTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cropsApi.list({ page_size: 100 }).then(r => { setCrops(r.data.results ?? []); });
    marketsApi.list({ page_size: 200 }).then(r => { setMarkets(r.data.results ?? []); });
  }, []);

  const loadTrends = async () => {
    if (!selectedCrop || !selectedMarket) return;
    setLoading(true); setError('');
    try {
      const res = await pricesApi.trends(Number(selectedCrop), Number(selectedMarket), days);
      setTrends(res.data.data ?? []);
    } catch {
      setError('Could not load price trend data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (selectedCrop && selectedMarket) loadTrends(); }, [selectedCrop, selectedMarket, days]);

  const chartData = trends.map(t => ({
    date: t.date.slice(5),
    avg: Math.round(t.avg_price),
    min: t.min_price ? Math.round(t.min_price) : undefined,
    max: t.max_price ? Math.round(t.max_price) : undefined,
  }));

  const cropName = crops.find(c => c.id === Number(selectedCrop))?.name ?? '';
  const marketName = markets.find(m => m.id === Number(selectedMarket))?.name ?? '';

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <div><h1>Historical Price Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Explore price trends by crop and market</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="form-group">
            <label className="label">Crop</label>
            <select className="input" value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)}>
              <option value="">Select crop…</option>
              {crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Market</label>
            <select className="input" value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)}>
              <option value="">Select market…</option>
              {markets.map(m => <option key={m.id} value={m.id}>{m.name} — {m.state}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Period</label>
            <select className="input" value={days} onChange={e => setDays(Number(e.target.value))}>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
              <option value={365}>Last 1 year</option>
              <option value={730}>Last 2 years</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500" /> <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!selectedCrop || !selectedMarket ? (
        <div className="card p-12 text-center text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">Select a crop and market to view price trends</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : chartData.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="font-medium text-gray-600">No data available for this selection</p>
        </div>
      ) : (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">{cropName} — {marketName}</h3>
              <p className="text-xs text-gray-500">{trends.length} observations · Modal price (INR/Quintal)</p>
            </div>
            <button onClick={loadTrends} className="btn-ghost text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Min Price', value: Math.min(...trends.map(t => t.avg_price)) },
              { label: 'Avg Price', value: trends.reduce((s, t) => s + t.avg_price, 0) / trends.length },
              { label: 'Max Price', value: Math.max(...trends.map(t => t.avg_price)) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-bold text-gray-900">₹{Math.round(value).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={(v: number, name: string) => [`₹${v.toLocaleString('en-IN')}`, name === 'avg' ? 'Avg Price' : name === 'min' ? 'Min' : 'Max']} />
              <Legend formatter={v => v === 'avg' ? 'Average Price' : v === 'min' ? 'Min Price' : 'Max Price'} />
              <Line type="monotone" dataKey="min" stroke="#94d1a8" strokeWidth={1} dot={false} strokeDasharray="3 2" />
              <Line type="monotone" dataKey="avg" stroke="#2d9a2d" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="max" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="3 2" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 text-center mt-2">
            ⚠ Demo data is synthetic and labeled accordingly. Not real market prices.
          </p>
        </div>
      )}
    </div>
  );
}
