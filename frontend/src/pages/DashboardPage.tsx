import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout, Store, Database, Brain, TrendingUp, RefreshCw,
  ArrowRight, AlertCircle, Loader2, Info,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { analyticsApi } from '@/api/services';
import { useAuth } from '@/features/auth/AuthContext';
import type { DashboardData } from '@/types';

interface StatCardProps {
  label: string; value: string | number; icon: React.ElementType;
  color?: string; loading?: boolean;
}
function StatCard({ label, value, icon: Icon, color = 'primary', loading }: StatCardProps) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-100 text-primary-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] ?? colorMap.primary}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {loading ? (
        <div className="skeleton h-8 w-24 mt-2" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      )}
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await analyticsApi.dashboard();
      setData(res.data.data ?? null);
    } catch {
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cropPriceChartData = data?.crop_avg_prices?.map(c => ({
    name: c.crop__name,
    avg_price: Math.round(Number(c.avg_price)),
    records: c.record_count,
  })) ?? [];

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Welcome back, <span className="font-medium text-gray-700">{user?.profile?.display_name || user?.username}</span>
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 mb-6">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Supported Crops" value={data?.crop_count ?? '—'} icon={Sprout} loading={loading} />
        <StatCard label="Active Markets" value={data?.market_count ?? '—'} icon={Store} color="blue" loading={loading} />
        <StatCard label="Price Records" value={data?.price_record_count?.toLocaleString() ?? '—'} icon={Database} color="purple" loading={loading} />
        <StatCard label="My Predictions" value={data?.user_prediction_count ?? '—'} icon={Brain} color="amber" loading={loading} />
      </div>

      {/* Active model + last update */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Active Model</h3>
          </div>
          {loading ? (
            <div className="space-y-2"><div className="skeleton h-4 w-48" /><div className="skeleton h-4 w-64" /></div>
          ) : data?.active_model ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{data.active_model.algorithm.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                {' '}<span className="badge-green ml-2">Active</span>
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                {data.active_model.rmse != null && <span>RMSE: <strong className="text-gray-700">{data.active_model.rmse.toFixed(2)}</strong></span>}
                {data.active_model.r2 != null && <span>R²: <strong className="text-gray-700">{data.active_model.r2.toFixed(4)}</strong></span>}
                <span>Trained: <strong className="text-gray-700">{data.active_model.trained_at}</strong></span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
              <Info className="w-4 h-4" /> No active model. An administrator needs to train one.
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Data Status</h3>
          </div>
          {loading ? <div className="skeleton h-4 w-32" /> : (
            <div className="space-y-1.5 text-sm">
              <p className="text-gray-600">Last update: <span className="font-medium text-gray-900">{data?.last_data_update ?? 'N/A'}</span></p>
              <p className="text-gray-600">New predictions (7d): <span className="font-medium text-gray-900">{data?.recent_predictions_7d ?? 0}</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Crop avg price chart */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900">Average Price by Crop</h3>
            <p className="text-xs text-gray-500 mt-0.5">All-time average modal price across all markets (INR/Quintal)</p>
          </div>
          <Link to="/prices" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            View prices <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : cropPriceChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cropPriceChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Avg Price']} />
              <Bar dataKey="avg_price" fill="#2d9a2d" radius={[4, 4, 0, 0]} name="Avg Price (₹)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Database className="w-8 h-8 mb-2" />
            <p className="text-sm">No price data available. Import a dataset to get started.</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { to: '/predict', label: 'Predict Price', icon: Brain, color: 'bg-primary-600' },
          { to: '/prices', label: 'View Prices', icon: TrendingUp, color: 'bg-blue-600' },
          { to: '/compare', label: 'Compare Markets', icon: Store, color: 'bg-purple-600' },
          { to: '/predictions', label: 'My History', icon: Database, color: 'bg-amber-600' },
        ].map(({ to, label, icon: Icon, color }) => (
          <Link key={to} to={to}
            className="card-hover p-4 flex flex-col items-center gap-2 text-center cursor-pointer">
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
