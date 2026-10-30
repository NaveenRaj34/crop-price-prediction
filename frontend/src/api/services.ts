/** All API service functions organized by domain */
import apiClient from './client';
import type {
  User, Crop, Market, HistoricalPrice, PriceTrend, MarketComparison,
  PredictionRecord, PredictionResult, ModelVersion, DatasetImport,
  DashboardData, PaginatedResponse, ApiResponse,
} from '@/types';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<{ access: string; refresh: string; user: User }>('/auth/login/', { username, password }),

  register: (data: { username: string; email: string; password: string; password2: string; first_name?: string; last_name?: string; display_name?: string }) =>
    apiClient.post<{ access: string; refresh: string; user: User }>('/auth/register/', data),

  logout: (refresh: string) =>
    apiClient.post('/auth/logout/', { refresh }),

  me: () =>
    apiClient.get<ApiResponse<User>>('/auth/me/'),

  updateProfile: (data: Partial<User & { profile: Partial<User['profile']> }>) =>
    apiClient.patch<ApiResponse<User>>('/auth/me/', data),

  changePassword: (old_password: string, new_password: string, new_password2: string) =>
    apiClient.put('/auth/me/change-password/', { old_password, new_password, new_password2 }),

  refresh: (refresh: string) =>
    apiClient.post<{ access: string }>('/auth/refresh/', { refresh }),
};

// ─── Crops ────────────────────────────────────────────────────────────────────

export const cropsApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiClient.get<PaginatedResponse<Crop>>('/crops/', { params }),

  get: (id: number) =>
    apiClient.get<Crop>(`/crops/${id}/`),

  create: (data: Partial<Crop>) =>
    apiClient.post<Crop>('/crops/', data),

  update: (id: number, data: Partial<Crop>) =>
    apiClient.patch<Crop>(`/crops/${id}/`, data),
};

// ─── Markets ──────────────────────────────────────────────────────────────────

export const marketsApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiClient.get<PaginatedResponse<Market>>('/markets/', { params }),

  get: (id: number) =>
    apiClient.get<Market>(`/markets/${id}/`),

  create: (data: Partial<Market>) =>
    apiClient.post<Market>('/markets/', data),

  update: (id: number, data: Partial<Market>) =>
    apiClient.patch<Market>(`/markets/${id}/`, data),
};

// ─── Historical Prices ────────────────────────────────────────────────────────

export const pricesApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiClient.get<PaginatedResponse<HistoricalPrice>>('/prices/', { params }),

  trends: (cropId: number, marketId: number, days?: number) =>
    apiClient.get<{ success: boolean; data: PriceTrend[]; meta: Record<string, unknown> }>('/prices/trends/', {
      params: { crop_id: cropId, market_id: marketId, days: days ?? 365 },
    }),

  compare: (cropId: number, params?: { market_ids?: number[]; state?: string }) =>
    apiClient.get<{ success: boolean; data: MarketComparison[] }>('/prices/compare/', {
      params: { crop_id: cropId, ...params },
    }),

  summary: (cropId?: number, marketId?: number) =>
    apiClient.get<{ success: boolean; data: Record<string, number | null> }>('/prices/summary/', {
      params: { crop_id: cropId, market_id: marketId },
    }),
};

// ─── Predictions ──────────────────────────────────────────────────────────────

export const predictionsApi = {
  create: (data: {
    crop_id: number; market_id: number; target_date: string;
    season?: string; rainfall?: number; temperature?: number; arrivals?: number;
  }) =>
    apiClient.post<{ success: boolean; data: { prediction: PredictionRecord; result: PredictionResult } }>('/predictions/', data),

  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<PredictionRecord>>('/predictions/history/', { params }),

  get: (id: number) =>
    apiClient.get<PredictionRecord>(`/predictions/${id}/`),

  delete: (id: number) =>
    apiClient.delete(`/predictions/${id}/`),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  dashboard: () =>
    apiClient.get<{ success: boolean; data: DashboardData }>('/analytics/dashboard/'),

  seasonality: (cropId?: number, marketId?: number) =>
    apiClient.get<{ success: boolean; data: { monthly: unknown[]; by_season: unknown[] } }>('/analytics/seasonality/', {
      params: { crop_id: cropId, market_id: marketId },
    }),

  modelPerformance: () =>
    apiClient.get<{ success: boolean; data: ModelVersion[] }>('/analytics/model-performance/'),
};

// ─── Admin: Datasets ──────────────────────────────────────────────────────────

export const datasetsApi = {
  list: () =>
    apiClient.get<PaginatedResponse<DatasetImport>>('/admin/datasets/'),

  get: (id: number) =>
    apiClient.get<DatasetImport>(`/admin/datasets/${id}/`),

  errors: (id: number) =>
    apiClient.get(`/admin/datasets/${id}/errors/`),

  upload: (file: File, opts?: { columnMapping?: Record<string, string>; confirmImport?: boolean; dataSource?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (opts?.columnMapping) formData.append('column_mapping', JSON.stringify(opts.columnMapping));
    if (opts?.confirmImport) formData.append('confirm_import', 'true');
    if (opts?.dataSource) formData.append('data_source', opts.dataSource);
    return apiClient.post<{ success: boolean; validated?: boolean; can_import?: boolean; validation?: unknown; data?: DatasetImport }>('/admin/datasets/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Admin: Models ────────────────────────────────────────────────────────────

export const modelsApi = {
  list: () =>
    apiClient.get<PaginatedResponse<ModelVersion>>('/admin/models/'),

  get: (id: number) =>
    apiClient.get<ModelVersion>(`/admin/models/${id}/`),

  train: () =>
    apiClient.post<{ success: boolean; message: string }>('/admin/models/train/'),

  activate: (id: number) =>
    apiClient.post<{ success: boolean; message: string; data: ModelVersion }>(`/admin/models/${id}/activate/`),
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportsApi = {
  downloadCsv: () => `${apiClient.defaults.baseURL}/reports/predictions.csv`,
  downloadPdf: () => `${apiClient.defaults.baseURL}/reports/predictions.pdf`,
};
