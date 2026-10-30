import { useEffect, useState } from 'react';
import { Trash2, AlertCircle, Loader2, Download, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { predictionsApi, reportsApi } from '@/api/services';
import type { PredictionRecord } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';

export default function PredictionHistoryPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const load = async (p = 1) => {
    setLoading(true); setError('');
    try {
      const res = await predictionsApi.list({ page: p, page_size: 20 });
      setRecords(res.data.results ?? []);
      setTotalCount(res.data.count ?? 0);
    } catch {
      setError('Could not load prediction history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this prediction record?')) return;
    setDeleting(id);
    try {
      await predictionsApi.delete(id);
      setRecords(r => r.filter(x => x.id !== id));
      setTotalCount(c => c - 1);
    } catch {
      alert('Could not delete prediction.');
    } finally {
      setDeleting(null);
    }
  };

  const downloadReport = (format: 'csv' | 'pdf') => {
    const token = localStorage.getItem('access_token') ?? '';
    const url = format === 'csv' ? reportsApi.downloadCsv() : reportsApi.downloadPdf();
    // Trigger download with auth header via fetch
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `predictions.${format}`;
        a.click();
      })
      .catch(() => alert('Download failed.'));
  };

  const statusBadge = (status: string) => {
    if (status === 'ok') return <span className="badge-green">Success</span>;
    if (status === 'no_model') return <span className="badge-amber">No Model</span>;
    return <span className="badge-red">{status}</span>;
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <div>
          <h1>Prediction History</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalCount} total predictions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadReport('csv')} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => downloadReport('pdf')} className="btn-secondary text-sm">
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500" /> <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : records.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No predictions yet</p>
          <p className="text-sm mt-1">Go to <a href="/predict" className="text-primary-600 hover:underline">Predict Price</a> to generate your first forecast.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header px-4 py-3">Crop</th>
                  <th className="table-header px-4 py-3">Market</th>
                  <th className="table-header px-4 py-3">Target Date</th>
                  <th className="table-header px-4 py-3">Predicted Price</th>
                  <th className="table-header px-4 py-3">Change</th>
                  <th className="table-header px-4 py-3">Algorithm</th>
                  <th className="table-header px-4 py-3">Status</th>
                  <th className="table-header px-4 py-3">Generated</th>
                  <th className="table-header px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map(r => {
                  const changePct = r.price_change_pct ? Number(r.price_change_pct) : null;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.crop_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{r.market_name ?? '—'}</div>
                        <div className="text-xs text-gray-400">{r.market_district}, {r.market_state}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.target_date}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {r.predicted_price ? `₹${Number(r.predicted_price).toLocaleString('en-IN')}` : '—'}
                        <div className="text-xs text-gray-400 font-normal">{r.price_unit}</div>
                      </td>
                      <td className="px-4 py-3">
                        {changePct != null ? (
                          <span className={`flex items-center gap-0.5 font-medium ${changePct > 0 ? 'text-green-600' : changePct < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {changePct > 0 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{r.algorithm?.replace(/_/g, ' ') ?? '—'}</td>
                      <td className="px-4 py-3">{statusBadge(r.prediction_status)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          {deleting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCount > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, totalCount)} of {totalCount}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-xs px-3 py-1.5">Previous</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= totalCount} className="btn-ghost text-xs px-3 py-1.5">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" />
        All predicted prices are data-driven estimates. Not guaranteed market prices.
      </p>
    </div>
  );
}
