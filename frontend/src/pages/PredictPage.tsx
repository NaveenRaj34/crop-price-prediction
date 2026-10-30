import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { zodResolver as _ } from '@hookform/resolvers/zod';
import {
  Brain, AlertCircle, CheckCircle, TrendingUp, TrendingDown,
  Minus, AlertTriangle, Loader2, Save, Info,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { cropsApi, marketsApi, predictionsApi, pricesApi } from '@/api/services';
import type { Crop, Market, PredictionRecord, PredictionResult, PriceTrend } from '@/types';

const schema = z.object({
  crop_id: z.coerce.number().min(1, 'Select a crop'),
  market_id: z.coerce.number().min(1, 'Select a market'),
  target_date: z.string().min(1, 'Select a target date'),
  season: z.string().optional(),
  rainfall: z.coerce.number().optional().or(z.literal('')),
  temperature: z.coerce.number().optional().or(z.literal('')),
  arrivals: z.coerce.number().optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

const SEASON_OPTIONS = ['unknown', 'kharif', 'rabi', 'zaid', 'annual'];

export default function PredictPage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [result, setResult] = useState<{ prediction: PredictionRecord; result: PredictionResult } | null>(null);
  const [trends, setTrends] = useState<PriceTrend[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedCropId, setSelectedCropId] = useState<number>(0);
  const [selectedMarketId, setSelectedMarketId] = useState<number>(0);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { season: 'unknown', target_date: new Date().toISOString().split('T')[0] },
  });

  const watchedCrop = watch('crop_id');
  const watchedMarket = watch('market_id');

  useEffect(() => {
    cropsApi.list({ page_size: 100 }).then(r => setCrops(r.data.results ?? [])).catch(() => {});
    marketsApi.list({ page_size: 200 }).then(r => setMarkets(r.data.results ?? [])).catch(() => {});
  }, []);

  // Load price trends when crop+market changes
  useEffect(() => {
    const cId = Number(watchedCrop);
    const mId = Number(watchedMarket);
    if (cId > 0 && mId > 0) {
      setSelectedCropId(cId); setSelectedMarketId(mId);
      pricesApi.trends(cId, mId, 180).then(r => setTrends(r.data.data ?? [])).catch(() => setTrends([]));
    }
  }, [watchedCrop, watchedMarket]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true); setError(''); setResult(null);
    try {
      const payload = {
        crop_id: Number(data.crop_id),
        market_id: Number(data.market_id),
        target_date: data.target_date,
        season: data.season || 'unknown',
        rainfall: data.rainfall !== '' && data.rainfall != null ? Number(data.rainfall) : undefined,
        temperature: data.temperature !== '' && data.temperature != null ? Number(data.temperature) : undefined,
        arrivals: data.arrivals !== '' && data.arrivals != null ? Number(data.arrivals) : undefined,
      };
      const res = await predictionsApi.create(payload);
      setResult(res.data.data ?? null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message ?? 'Prediction failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const predicted = result ? Number(result.prediction.predicted_price) : null;
  const baseline = result ? Number(result.prediction.historical_baseline_price) : null;
  const changePct = result ? Number(result.prediction.price_change_pct) : null;

  const chartData = trends.map(t => ({
    date: t.date,
    price: Math.round(t.avg_price),
  }));
  if (predicted != null && result?.prediction.target_date) {
    chartData.push({ date: result.prediction.target_date, price: Math.round(predicted) });
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <div>
          <h1>Predict Crop Price</h1>
          <p className="text-gray-500 text-sm mt-0.5">Enter parameters to generate a data-driven price estimate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary-600" /> Prediction Parameters
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="form-group">
              <label htmlFor="crop_id" className="label">Crop <span className="text-red-500">*</span></label>
              <select id="crop_id" className="input" {...register('crop_id')}>
                <option value="">Select crop…</option>
                {crops.map(c => <option key={c.id} value={c.id}>{c.name} ({c.standard_unit})</option>)}
              </select>
              {errors.crop_id && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{errors.crop_id.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="market_id" className="label">Market <span className="text-red-500">*</span></label>
              <select id="market_id" className="input" {...register('market_id')}>
                <option value="">Select market…</option>
                {markets.map(m => <option key={m.id} value={m.id}>{m.name} — {m.district}, {m.state}</option>)}
              </select>
              {errors.market_id && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{errors.market_id.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="target_date" className="label">Target Date <span className="text-red-500">*</span></label>
              <input id="target_date" type="date" className="input" {...register('target_date')}
                min={new Date().toISOString().split('T')[0]} />
              {errors.target_date && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{errors.target_date.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="season" className="label">Season</label>
              <select id="season" className="input" {...register('season')}>
                {SEASON_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Optional features (improves accuracy when available)
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="label text-xs">Rainfall (mm)</label>
                  <input type="number" step="0.1" className="input text-sm" placeholder="—" {...register('rainfall')} />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Temp (°C)</label>
                  <input type="number" step="0.1" className="input text-sm" placeholder="—" {...register('temperature')} />
                </div>
                <div className="form-group">
                  <label className="label text-xs">Arrivals (T)</label>
                  <input type="number" step="1" className="input text-sm" placeholder="—" {...register('arrivals')} />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Brain className="w-4 h-4" /> Generate Prediction</>}
            </button>
          </form>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {result && result.result.status === 'ok' && (
            <div className="card p-6 animate-slide-up">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-900">Prediction Result</h3>
                <span className="badge-green ml-auto">Estimate</span>
              </div>

              <div className="bg-gradient-to-br from-primary-50 to-green-50 border border-primary-200 rounded-xl p-5 mb-4">
                <p className="text-xs text-gray-500 mb-1">Estimated Price for {result.prediction.target_date}</p>
                <p className="text-4xl font-bold text-primary-700">
                  ₹{Number(result.prediction.predicted_price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">per {result.prediction.price_unit} · {result.prediction.currency}</p>
                {changePct != null && (
                  <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${changePct > 0 ? 'text-green-700' : changePct < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {changePct > 0 ? <TrendingUp className="w-4 h-4" /> : changePct < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    {changePct > 0 ? '+' : ''}{changePct.toFixed(2)}% vs latest actual price
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Latest Actual Price</p>
                  <p className="font-semibold">₹{baseline?.toLocaleString('en-IN') ?? 'N/A'}</p>
                  <p className="text-xs text-gray-400">{result.prediction.historical_baseline_date}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Algorithm Used</p>
                  <p className="font-semibold capitalize">{result.prediction.algorithm?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-400">v{result.prediction.model_version_str}</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{result.result.disclaimer}</p>
              </div>
            </div>
          )}

          {result && result.result.status !== 'ok' && (
            <div className="card p-6 border-amber-200 animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Prediction Unavailable</h3>
              </div>
              <p className="text-sm text-gray-700">{result.result.message}</p>
            </div>
          )}

          {/* Historical chart */}
          {chartData.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Historical Price Trend (180 days)</h3>
              <p className="text-xs text-gray-500 mb-4">Modal price (INR/Quintal) — dashed line marks the predicted date</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Price']} labelFormatter={l => `Date: ${l}`} />
                  {predicted != null && <ReferenceLine x={result?.prediction.target_date} stroke="#ff8210" strokeDasharray="4 2" label={{ value: 'Predicted', fontSize: 10, fill: '#ff8210' }} />}
                  <Line type="monotone" dataKey="price" stroke="#2d9a2d" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!result && !isSubmitting && (
            <div className="card p-8 flex flex-col items-center text-center text-gray-400">
              <Brain className="w-12 h-12 mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">Fill in the parameters and click Generate</p>
              <p className="text-sm mt-1">Select a crop and market to see historical trends.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
