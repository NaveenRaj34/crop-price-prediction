import { useEffect, useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, X, Eye } from 'lucide-react';
import { datasetsApi } from '@/api/services';
import type { DatasetImport } from '@/types';

export default function DatasetManagementPage() {
  const [imports, setImports] = useState<DatasetImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<Record<string, unknown> | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadImports = async () => {
    setLoading(true);
    try { const r = await datasetsApi.list(); setImports(r.data.results ?? []); } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadImports(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setValidation(null); setConfirmed(false); setMessage('');
  };

  const handleValidate = async () => {
    if (!file) return;
    setUploading(true); setMessage(''); setValidation(null);
    try {
      const res = await datasetsApi.upload(file, { confirmImport: false });
      setValidation(res.data.validation as Record<string, unknown> ?? null);
      setMessage(res.data.can_import ? '✓ Validation passed. Review below, then confirm import.' : '✗ Validation failed. Fix the errors and re-upload.');
      setMsgType(res.data.can_import ? 'success' : 'error');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage(e?.response?.data?.error?.message ?? 'Validation failed.');
      setMsgType('error');
    } finally { setUploading(false); }
  };

  const handleImport = async () => {
    if (!file || !(validation as { valid?: boolean })?.valid) return;
    setUploading(true); setMessage('');
    try {
      const res = await datasetsApi.upload(file, { confirmImport: true });
      const d = res.data.data;
      setMessage(`✓ Import completed: ${d?.accepted_rows} records accepted, ${d?.rejected_rows} rejected, ${d?.duplicate_rows} duplicates.`);
      setMsgType('success');
      setFile(null); setValidation(null); setConfirmed(false);
      if (fileRef.current) fileRef.current.value = '';
      loadImports();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage(e?.response?.data?.error?.message ?? 'Import failed.');
      setMsgType('error');
    } finally { setUploading(false); }
  };

  const msgColors = { success: 'bg-green-50 border-green-200 text-green-700', error: 'bg-red-50 border-red-200 text-red-700', info: 'bg-blue-50 border-blue-200 text-blue-700' };

  return (
    <div className="page-container animate-fade-in">
      <div className="section-header">
        <div>
          <h1>Dataset Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload and validate CSV crop price data</p>
        </div>
      </div>

      {/* Upload area */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary-600" /> Upload New Dataset
        </h3>

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors mb-4 cursor-pointer"
          onClick={() => fileRef.current?.click()}>
          <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-600">Click to select a CSV file</p>
          <p className="text-xs text-gray-400 mt-1">Maximum 10MB. Required columns: date, crop, state, district, market, modal_price</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </div>

        {file && (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 flex-1">{file.name}</span>
            <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
            <button onClick={() => { setFile(null); setValidation(null); if (fileRef.current) fileRef.current.value = ''; }}
              className="p-1 hover:bg-gray-200 rounded"><X className="w-3.5 h-3.5 text-gray-500" /></button>
          </div>
        )}

        {message && (
          <div className={`border rounded-lg px-4 py-3 text-sm mb-4 ${msgColors[msgType]}`}>{message}</div>
        )}

        {validation && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm">
            <div className="flex flex-wrap gap-4 mb-3">
              <span>Total rows: <strong>{(validation as { total_rows?: number }).total_rows ?? 0}</strong></span>
              <span className={`${(validation as { valid?: boolean }).valid ? 'text-green-700' : 'text-red-600'}`}>
                Valid: <strong>{String((validation as { valid?: boolean }).valid)}</strong>
              </span>
            </div>
            {(validation as { issues?: string[] }).issues?.length ? (
              <div>
                <p className="font-medium text-red-700 mb-1">Issues found:</p>
                <ul className="list-disc list-inside space-y-0.5 text-red-600">
                  {((validation as { issues?: unknown[] }).issues ?? []).slice(0, 5).map((iss, i) => (
                    <li key={i}>{String(typeof iss === 'object' ? JSON.stringify(iss) : iss)}</li>
                  ))}
                </ul>
              </div>
            ) : <p className="text-green-700">✓ No validation issues found in sample rows.</p>}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleValidate} disabled={!file || uploading} className="btn-secondary">
            {uploading && !validation ? <><Loader2 className="w-4 h-4 animate-spin" />Validating…</> : <><Eye className="w-4 h-4" />Validate File</>}
          </button>
          {(validation as { valid?: boolean })?.valid && (
            <button onClick={handleImport} disabled={uploading} className="btn-primary">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Importing…</> : <><Upload className="w-4 h-4" />Confirm Import</>}
            </button>
          )}
        </div>
      </div>

      {/* Import history */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Import History</h3>
        {loading ? <div className="skeleton h-20 w-full" /> : imports.length === 0 ? (
          <p className="text-sm text-gray-500">No imports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header px-4 py-2">File</th>
                  <th className="table-header px-4 py-2">Status</th>
                  <th className="table-header px-4 py-2">Total</th>
                  <th className="table-header px-4 py-2">Accepted</th>
                  <th className="table-header px-4 py-2">Rejected</th>
                  <th className="table-header px-4 py-2">Duplicates</th>
                  <th className="table-header px-4 py-2">Success %</th>
                  <th className="table-header px-4 py-2">Imported By</th>
                  <th className="table-header px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {imports.map(imp => (
                  <tr key={imp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 max-w-48 truncate">{imp.file_name}</td>
                    <td className="px-4 py-2.5">
                      {imp.status === 'completed' ? <span className="badge-green">Completed</span> :
                       imp.status === 'failed' ? <span className="badge-red">Failed</span> :
                       <span className="badge-amber">{imp.status}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{imp.total_rows}</td>
                    <td className="px-4 py-2.5 text-green-700 font-medium">{imp.accepted_rows}</td>
                    <td className="px-4 py-2.5 text-red-600">{imp.rejected_rows}</td>
                    <td className="px-4 py-2.5 text-amber-600">{imp.duplicate_rows}</td>
                    <td className="px-4 py-2.5">{imp.success_rate != null ? `${imp.success_rate}%` : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{imp.imported_by_username ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{imp.started_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSV format guide */}
      <div className="card p-5 mt-4 bg-gray-50">
        <h4 className="font-semibold text-gray-700 mb-2 text-sm">📋 CSV Format Reference</h4>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead><tr className="text-gray-500">
              <th className="text-left py-1 pr-4">Column</th>
              <th className="text-left py-1 pr-4">Required</th>
              <th className="text-left py-1">Example</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200">
              {[
                ['date', 'Yes', '2024-01-15'],
                ['crop', 'Yes', 'Paddy'],
                ['state', 'Yes', 'Tamil Nadu'],
                ['district', 'Yes', 'Chennai'],
                ['market', 'Yes', 'Koyambedu'],
                ['modal_price', 'Yes', '2150.00'],
                ['min_price', 'No', '1900.00'],
                ['max_price', 'No', '2400.00'],
                ['price_unit', 'No', 'Quintal'],
                ['season', 'No', 'kharif'],
                ['rainfall', 'No', '120.5'],
                ['temperature', 'No', '32.1'],
              ].map(([col, req, ex]) => (
                <tr key={col}>
                  <td className="py-1 pr-4 font-mono text-primary-700">{col}</td>
                  <td className="py-1 pr-4">{req === 'Yes' ? <span className="text-red-600">Required</span> : <span className="text-gray-400">Optional</span>}</td>
                  <td className="py-1 text-gray-500">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
