"""
ML pipeline unit tests.
"""
import pytest
import pandas as pd
import numpy as np
from datetime import date, timedelta


# ─── Preprocessing Tests ──────────────────────────────────────────────────────

class TestPreprocessing:

    def _make_df(self, n=90):
        base = date.today() - timedelta(days=n)
        records = []
        for i in range(n):
            records.append({
                'observation_date': pd.Timestamp(base + timedelta(days=i)),
                'modal_price': 2000 + np.random.uniform(-300, 300),
                'crop_name': 'Paddy',
                'market_name': 'Test Market',
                'state': 'Tamil Nadu',
                'district': 'Chennai',
                'season': 'kharif',
                'rainfall': 100.0,
                'temperature': 30.0,
                'arrivals': 150.0,
            })
        return pd.DataFrame(records)

    def test_build_features_returns_dataframe(self):
        from ml.preprocessing import build_features
        df = self._make_df(90)
        result = build_features(df)
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 90

    def test_date_features_are_created(self):
        from ml.preprocessing import build_features
        df = self._make_df(90)
        result = build_features(df)
        for col in ['day_of_year', 'month', 'year']:
            assert col in result.columns, f"Missing column: {col}"

    def test_lag_features_created(self):
        from ml.preprocessing import build_features
        df = self._make_df(90)
        result = build_features(df)
        for col in ['price_lag_7', 'price_lag_30']:
            assert col in result.columns, f"Missing lag column: {col}"

    def test_rolling_features_created(self):
        from ml.preprocessing import build_features
        df = self._make_df(90)
        result = build_features(df)
        for col in ['rolling_avg_30', 'rolling_avg_90']:
            assert col in result.columns, f"Missing rolling column: {col}"

    def test_month_feature_range(self):
        from ml.preprocessing import build_features
        df = self._make_df(90)
        result = build_features(df)
        assert 'month' in result.columns
        # month should be 1-12
        assert result['month'].between(1, 12).all()

    def test_empty_dataframe_returns_empty(self):
        from ml.preprocessing import build_features
        df = pd.DataFrame(columns=['observation_date', 'modal_price', 'crop_name', 'market_name',
                                    'state', 'district', 'season', 'rainfall', 'temperature', 'arrivals'])
        result = build_features(df)
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 0


# ─── Evaluation Tests ─────────────────────────────────────────────────────────

class TestEvaluation:

    def _make_pipeline(self, n=50):
        """Create a minimal trained pipeline for testing."""
        from ml.preprocessing import build_features, ALL_FEATURES, build_preprocessor
        from sklearn.pipeline import Pipeline
        from sklearn.linear_model import LinearRegression
        import pandas as pd, numpy as np
        from datetime import date, timedelta

        base = date.today() - timedelta(days=n)
        records = [{
            'observation_date': pd.Timestamp(base + timedelta(days=i)),
            'modal_price': 2000 + np.random.uniform(-200, 200),
            'crop_name': 'Paddy', 'market_name': 'Market',
            'state': 'TN', 'district': 'Chennai',
            'season': 'kharif', 'rainfall': 100, 'temperature': 30, 'arrivals': 150,
        } for i in range(n)]
        df = pd.DataFrame(records)
        df = build_features(df)

        available = [c for c in ALL_FEATURES if c in df.columns]
        X = df[available].tail(40)
        y = df['modal_price'].tail(40)

        # build_preprocessor takes no arguments
        preprocessor = build_preprocessor()
        pipeline = Pipeline([('preprocessor', preprocessor), ('model', LinearRegression())])
        pipeline.fit(X, y)
        return pipeline, df[available].head(10), df['modal_price'].head(10)

    def test_evaluate_model_returns_dict(self):
        from ml.evaluate import evaluate_model
        pipeline, X_test, y_test = self._make_pipeline()
        result = evaluate_model(pipeline, X_test, y_test)
        assert isinstance(result, dict)

    def test_evaluate_model_has_required_keys(self):
        from ml.evaluate import evaluate_model
        pipeline, X_test, y_test = self._make_pipeline()
        result = evaluate_model(pipeline, X_test, y_test)
        for key in ['mae', 'rmse', 'r2', 'test_samples']:
            assert key in result, f"Missing key: {key}"

    def test_evaluate_model_non_negative_mae(self):
        from ml.evaluate import evaluate_model
        pipeline, X_test, y_test = self._make_pipeline()
        result = evaluate_model(pipeline, X_test, y_test)
        assert result['mae'] >= 0
        assert result['rmse'] >= 0

    def test_evaluate_model_r2_range(self):
        from ml.evaluate import evaluate_model
        pipeline, X_test, y_test = self._make_pipeline()
        result = evaluate_model(pipeline, X_test, y_test)
        # R² can theoretically be ≤1 (negative for bad models)
        assert result['r2'] <= 1.0

    def test_evaluate_test_samples_count(self):
        from ml.evaluate import evaluate_model
        pipeline, X_test, y_test = self._make_pipeline()
        result = evaluate_model(pipeline, X_test, y_test)
        assert result['test_samples'] == len(y_test)

    def test_compare_models_selects_best(self):
        from ml.evaluate import compare_models
        results = {
            'linear_regression': {'success': True, 'metrics': {'rmse': 100.0}},
            'random_forest': {'success': True, 'metrics': {'rmse': 200.0}},
            'decision_tree': {'success': False},
        }
        best = compare_models(results)
        assert best == 'linear_regression'
