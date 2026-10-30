/** Core domain types matching the Django API schema */

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  date_joined: string;
  profile?: UserProfile;
}

export interface UserProfile {
  display_name: string;
  preferred_state: string;
  preferred_district: string;
  phone_number: string;
  bio: string;
}

export interface Crop {
  id: number;
  name: string;
  category: string;
  variety: string;
  standard_unit: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Market {
  id: number;
  name: string;
  state: string;
  district: string;
  location_details: string;
  data_source: string;
  is_active: boolean;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface HistoricalPrice {
  id: number;
  crop: number;
  crop_name: string;
  market: number;
  market_name: string;
  state: string;
  district: string;
  observation_date: string;
  min_price: number | null;
  max_price: number | null;
  modal_price: number;
  currency: string;
  price_unit: string;
  season: string;
  rainfall: number | null;
  temperature: number | null;
  arrivals: number | null;
  data_source: string;
  is_demo_data: boolean;
  created_at: string;
}

export interface PriceTrend {
  date: string;
  avg_price: number;
  min_price: number | null;
  max_price: number | null;
  record_count: number;
}

export interface MarketComparison {
  market_id: number;
  market_name: string;
  state: string;
  district: string;
  latest_price: number | null;
  latest_date: string | null;
  avg_price_30d: number | null;
  price_unit: string;
  data_source: string;
  record_count: number;
}

export interface PredictionRecord {
  id: number;
  crop: number;
  crop_name: string;
  market: number;
  market_name: string;
  market_state: string;
  market_district: string;
  target_date: string;
  predicted_price: string | null;
  currency: string;
  price_unit: string;
  historical_baseline_price: string | null;
  historical_baseline_date: string | null;
  price_change: string | null;
  price_change_pct: string | null;
  algorithm: string | null;
  model_version_str: string | null;
  input_params: Record<string, unknown>;
  prediction_status: string;
  error_message: string;
  created_at: string;
}

export interface PredictionResult {
  status: 'ok' | 'error' | 'no_model' | 'no_data';
  predicted_price: number | null;
  currency: string;
  price_unit: string;
  historical_baseline?: {
    latest_price: number;
    latest_date: string;
    avg_90d: number | null;
  };
  price_change: number | null;
  price_change_pct: number | null;
  model_info?: {
    algorithm: string;
    version: string;
    model_id: number;
    metrics: Record<string, number | null>;
  };
  message?: string;
  disclaimer: string;
}

export interface ModelVersion {
  id: number;
  algorithm: string;
  algorithm_display: string;
  version: string;
  feature_schema: string[];
  metrics: {
    mae: number;
    rmse: number;
    r2: number;
    mape: number | null;
    test_samples: number;
    note: string;
  };
  artifact_path: string;
  training_status: string;
  is_active: boolean;
  training_error: string;
  notes: string;
  created_at: string;
}

export interface DatasetImport {
  id: number;
  file_name: string;
  data_source: string;
  status: string;
  total_rows: number;
  accepted_rows: number;
  rejected_rows: number;
  duplicate_rows: number;
  skipped_rows: number;
  error_summary: Record<string, unknown>;
  column_mapping: Record<string, string>;
  imported_by_username: string | null;
  started_at: string;
  completed_at: string | null;
  notes: string;
  success_rate: number | null;
}

export interface DashboardData {
  crop_count: number;
  market_count: number;
  price_record_count: number;
  user_prediction_count: number;
  recent_predictions_7d: number;
  active_model: {
    algorithm: string;
    version: string;
    rmse: number | null;
    r2: number | null;
    trained_at: string;
  } | null;
  last_data_update: string | null;
  crop_avg_prices: Array<{ crop__name: string; avg_price: number; record_count: number }>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    status_code: number;
    message: string;
    details: unknown;
  };
}
