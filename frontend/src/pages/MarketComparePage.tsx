import { useEffect, useState } from 'react';
import { BarChart3, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { pricesApi, cropsApi } from '@/api/services';
import type { Crop, MarketComparison } from '@/types';

const COLORS = ['#2d9a2d', '#3d833d', '#52b552', '#86ce86', '#1a7c1a', '#166316', '#154f15', '#0a1f0a'];

export default function MarketComparePage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [comparisons, setComparisons] = useState<MarketComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cropsApi.list({ page_size: 100 }).then(r => setCrops(r.data.results ?? []));
  }, []);

  useEffect(() => {
    if (!selectedCrop) return;
    setLoading(true); setError('');
    pricesApi.compare(Number(selectedCrop))
      .then(r => setComparisons(r.data.data ?? []))
      .catch(() => setError('Could not load comparison data.'))
      .finally(() => setLoading(false));
  }, [selectedCrop]);

  const chartData = comparisons
    .filter(c => c.latest_price != null)
    .sort((a, b) => (b.latest_price ?? 0) - (a.latest_price ?? 0));

  const cropName = crops.find(c => c.id === Number(selectedCrop))?.name ?? '';

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <div><h1>Market Comparison</h1>
          <p className="text-sm text-gray-500 mt-0.5">Compare latest prices across markets for a selected crop</p>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="form-group max-w-xs">
          <label className="label">Select Crop to Compare</label>
          <select className="input" value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)}>
            <option value="">Choose a crop…</option>
            {crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500" /> <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!selectedCrop ? (
        <div className="card p-12 text-center text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">Select a crop to compare market prices</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* Bar Chart */}
          {chartData.length > 0 && (
            <div className="card p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-1">{cropName} — Latest Price by Market</h3>
              <p className="text-xs text-gray-500 mb-4">Latest available modal price (INR/Quintal). Sorted by price.</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="market_name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Latest Price']} />
                  <Bar dataKey="latest_price" radius={[4, 4, 0, 0]} name="Latest Price">
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-header px-4 py-3">Market</th>
                    <th className="table-header px-4 py-3">State</th>
                    <th className="table-header px-4 py-3">Latest Price</th>
                    <th className="table-header px-4 py-3">Avg (30d)</th>
                    <th className="table-header px-4 py-3">Last Updated</th>
                    <th className="table-header px-4 py-3">Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparisons.map(c => (
                    <tr key={c.market_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.market_name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.state}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {c.latest_price != null ? `₹${c.latest_price.toLocaleString('en-IN')}` : <span className="text-gray-400">—</span>}
                        <span className="text-xs text-gray-400 font-normal ml-1">/{c.price_unit}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.avg_price_30d != null ? `₹${c.avg_price_30d.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.latest_date ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.record_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2 mt-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <strong>Important:</strong> This comparison is based on available market price records only.
              The highest listed price does not guarantee the best selling decision. Transportation, storage,
              quality, and market access costs may affect your actual net return. Prices shown are for demonstration
              purposes and may include synthetic data.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
