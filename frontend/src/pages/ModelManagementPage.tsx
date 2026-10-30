import { useEffect, useState } from 'react';
import { Brain, Play, CheckCircle, Loader2, Info } from 'lucide-react';
import { modelsApi } from '@/api/services';
import type { ModelVersion } from '@/types';

export default function ModelManagementPage() {
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainMsg, setTrainMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try { const r = await modelsApi.list(); setModels(r.data.results ?? []); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleTrain = async () => {
    setTraining(true); setTrainMsg('');
    try {
      const r = await modelsApi.train();
      setTrainMsg(r.data.message ?? 'Training started in background. Refresh in a few seconds.');
      setTimeout(() => load(), 8000);
    } catch { setTrainMsg('Failed to start training.'); }
    finally { setTraining(false); }
  };

  const handleActivate = async (id: number) => {
    try { await modelsApi.activate(id); load(); }
    catch { alert('Activation failed.'); }
  };

  const MetricChip = ({ label, value }: { label: string; value?: number | null }) => (
    <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-bold text-gray-900 text-sm">{value != null ? value.toFixed(4) : '—'}</p>
    </div>
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <div>
          <h1>ML Model Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Train, evaluate, and activate prediction models</p>
        </div>
        <button onClick={handleTrain} disabled={training} className="btn-primary">
          {training ? <><Loader2 className="w-4 h-4 animate-spin" />Training…</> : <><Play className="w-4 h-4" />Train All Models</>}
        </button>
      </div>

      {trainMsg && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 mb-6 flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" />{trainMsg}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-xs text-amber-700">
        <strong>Training note:</strong> Models are trained on all available historical price records using a chronological 80/20 split.
        The model with the lowest RMSE is automatically selected as the best candidate. You must manually activate a model to use it for predictions.
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : models.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No models trained yet</p>
          <p className="text-sm mt-1">Click "Train All Models" to start training.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {models.map(m => (
            <div key={m.id} className={`card p-6 ${m.is_active ? 'border-primary-300 bg-primary-50/30' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 capitalize">{m.algorithm.replace(/_/g, ' ')}</h3>
                    {m.is_active && <span className="badge-green flex items-center gap-1"><CheckCircle className="w-3 h-3" />Active</span>}
                    {m.training_status === 'completed' ? <span className="badge-blue">Trained</span> : <span className="badge-red">{m.training_status}</span>}
                  </div>
                  <p className="text-xs text-gray-500">Version: {m.version} · Trained: {m.created_at.slice(0, 10)}</p>
                </div>
                {!m.is_active && m.training_status === 'completed' && (
                  <button onClick={() => handleActivate(m.id)} className="btn-primary text-sm">
                    Activate Model
                  </button>
                )}
              </div>

              {m.metrics && Object.keys(m.metrics).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <MetricChip label="MAE" value={m.metrics.mae} />
                  <MetricChip label="RMSE" value={m.metrics.rmse} />
                  <MetricChip label="R²" value={m.metrics.r2} />
                  <MetricChip label="MAPE (%)" value={m.metrics.mape} />
                </div>
              )}

              {m.metrics?.test_samples && (
                <p className="text-xs text-gray-400">Evaluated on {m.metrics.test_samples} test samples. {m.metrics.note}</p>
              )}

              {m.training_error && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  Error: {m.training_error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
