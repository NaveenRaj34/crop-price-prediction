import { useEffect, useState } from 'react';
import { Search, Sprout, Package, Loader2 } from 'lucide-react';
import { cropsApi } from '@/api/services';
import type { Crop } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  cereal: 'badge-amber', vegetable: 'badge-green', fruit: 'badge-green',
  pulse: 'badge-blue', oilseed: 'badge-amber', spice: 'badge-red',
  fiber: 'badge-gray', other: 'badge-gray',
};

export default function CropsPage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page_size: 100 };
    if (search) params.search = search;
    if (category) params.category = category;
    cropsApi.list(params)
      .then(r => { setCrops(r.data.results ?? []); setTotal(r.data.count ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category]);

  const categories = ['cereal', 'vegetable', 'fruit', 'pulse', 'oilseed', 'spice', 'fiber', 'other'];

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <div>
          <h1>Crop Explorer</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} crops in the system</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search crops…" className="input pl-9"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : crops.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Sprout className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No crops found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {crops.map(c => (
            <div key={c.id} className="card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Sprout className="w-4 h-4 text-primary-600" />
                </div>
                <span className={CATEGORY_COLORS[c.category] ?? 'badge-gray'}>{c.category}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-0.5">{c.name}</h3>
              {c.variety && <p className="text-xs text-gray-500 mb-2">Variety: {c.variety}</p>}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Package className="w-3.5 h-3.5" /> {c.standard_unit}
              </div>
              {c.description && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{c.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
