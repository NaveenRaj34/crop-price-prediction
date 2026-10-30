import { useEffect, useState } from 'react';
import { Shield, Upload, Brain, Database, RefreshCw, CheckCircle, Clock, AlertTriangle, Loader2, Play } from 'lucide-react';
import { analyticsApi, datasetsApi, modelsApi } from '@/api/services';
import type { ModelVersion, DatasetImport } from '@/types';

export default function AdminDashboardPage() {
  const [dashData, setDashData] = useState<{ crop_count: number; market_count: number; price_record_count: number } | null>(null);
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [imports, setImports] = useState<DatasetImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainMsg, setTrainMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [dash, mods, imps] = await Promise.all([
        analyticsApi.dashboard(),
        modelsApi.list(),
        datasetsApi.list(),
      ]);
      setDashData(dash.data.data as typeof dashData);
      setModels(mods.data.results ?? []);
      setImports(imps.data.results ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleTrain = async () => {
    setTraining(true); setTrainMsg('');
    try {
      const res = await modelsApi.train();
      setTrainMsg(res.data.message ?? 'Training started.');
      setTimeout(() => load(), 5000);
    } catch {
      setTrainMsg('Training trigger failed.');
    } finally {
      setTraining(false);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await modelsApi.activate(id);
      load();
    } catch { alert('Activation failed.'); }
  };

  const statusBadge = (status: string) => {
    if (status === 'completed') return <span className="badge-green flex items-center gap-1"><CheckCircle className="w-3 h-3" />Completed</span>;
    if (status === 'training') return <span className="badge-blue flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Training</span>;
    return <span className="badge-red">{status}</span>;
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-600" />
          <h1>Admin Dashboard</h1>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Crops', value: dashData?.crop_count ?? '—', icon: Database },
          { label: 'Total Markets', value: dashData?.market_count ?? '—', icon: Database },
          { label: 'Price Records', value: dashData?.price_record_count?.toLocaleString() ?? '—', icon: Database },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="stat-card">
            <Icon className="w-4 h-4 text-gray-400" />
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Model Training */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-gray-900">ML Models</h3>
          </div>
          <button onClick={handleTrain} disabled={training} className="btn-primary text-sm">
            {training ? <><Loader2 className="w-4 h-4 animate-spin" />Training…</> : <><Play className="w-4 h-4" />Train All Models</>}
          </button>
        </div>
        {trainMsg && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 text-sm text-blue-700">{trainMsg}</div>
        )}
        {loading ? <div className="skeleton h-20 w-full" /> : models.length === 0 ? (
          <p className="text-sm text-gray-500">No models trained yet. Click "Train All Models" to start.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header px-3 py-2">Algorithm</th>
                  <th className="table-header px-3 py-2">Version</th>
                  <th className="table-header px-3 py-2">RMSE</th>
                  <th className="table-header px-3 py-2">R²</th>
                  <th className="table-header px-3 py-2">Status</th>
                  <th className="table-header px-3 py-2">Active</th>
                  <th className="table-header px-3 py-2">Trained</th>
                  <th className="table-header px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {models.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium capitalize">{m.algorithm.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-gray-600">{m.version}</td>
                    <td className="px-3 py-2">{m.metrics?.rmse?.toFixed(2) ?? '—'}</td>
                    <td className="px-3 py-2">{m.metrics?.r2?.toFixed(4) ?? '—'}</td>
                    <td className="px-3 py-2">{statusBadge(m.training_status)}</td>
                    <td className="px-3 py-2">{m.is_active && <span className="badge-green">Active</span>}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{m.created_at.slice(0, 10)}</td>
                    <td className="px-3 py-2">
                      {!m.is_active && m.training_status === 'completed' && (
                        <button onClick={() => handleActivate(m.id)} className="btn-secondary text-xs px-2 py-1">Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dataset Imports */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Recent Dataset Imports</h3>
          </div>
          <a href="/admin/datasets" className="text-sm text-primary-600 hover:underline">View all →</a>
        </div>
        {loading ? <div className="skeleton h-20 w-full" /> : imports.length === 0 ? (
          <p className="text-sm text-gray-500">No datasets imported yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header px-3 py-2">File</th>
                  <th className="table-header px-3 py-2">Status</th>
                  <th className="table-header px-3 py-2">Accepted</th>
                  <th className="table-header px-3 py-2">Rejected</th>
                  <th className="table-header px-3 py-2">Imported By</th>
                  <th className="table-header px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {imports.slice(0, 5).map(imp => (
                  <tr key={imp.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-48">{imp.file_name}</td>
                    <td className="px-3 py-2">
                      {imp.status === 'completed' ? <span className="badge-green">Completed</span> :
                       imp.status === 'failed' ? <span className="badge-red">Failed</span> :
                       <span className="badge-amber">{imp.status}</span>}
                    </td>
                    <td className="px-3 py-2 text-green-700 font-medium">{imp.accepted_rows}</td>
                    <td className="px-3 py-2 text-red-600">{imp.rejected_rows}</td>
                    <td className="px-3 py-2 text-gray-500">{imp.imported_by_username ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{imp.started_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
