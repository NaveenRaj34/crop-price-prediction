"""
Prediction inference service.

Loads the active trained model from database and generates price estimates.
"""
import logging
import numpy as np
import pandas as pd
import joblib
from datetime import date, timedelta
from pathlib import Path

from ml.preprocessing import ALL_FEATURES, build_features

logger = logging.getLogger(__name__)

_model_cache = {}


def get_active_model():
    """Load and cache the currently active model version."""
    from apps.model_management.models import TrainedModelVersion
    try:
        version = TrainedModelVersion.objects.filter(
            is_active=True, training_status='completed'
        ).latest('created_at')
        cache_key = str(version.id)
        if cache_key not in _model_cache:
            pipeline = joblib.load(version.artifact_path)
            _model_cache[cache_key] = (pipeline, version)
        return _model_cache[cache_key]
    except TrainedModelVersion.DoesNotExist:
        return None, None
    except Exception as e:
        logger.error('Failed to load active model: %s', e)
        return None, None


def predict_price(
    crop_name: str,
    market_name: str,
    state: str,
    district: str,
    target_date: date,
    season: str = 'unknown',
    rainfall: float = None,
    temperature: float = None,
    arrivals: float = None,
) -> dict:
    """
    Generate a crop price prediction for the given parameters.

    Returns a dict with:
      - predicted_price (float)
      - model_info (dict)
      - historical_baseline (dict)
      - status: 'ok' | 'error' | 'no_model' | 'no_data'
      - message (str)
    """
    pipeline, version = get_active_model()
    if pipeline is None:
        return {
            'status': 'no_model',
            'message': 'No trained model is currently available. Please ask an administrator to train a model.',
            'predicted_price': None,
        }

    # Get historical context
    baseline = _get_historical_baseline(crop_name, market_name, target_date)
    if baseline is None:
        return {
            'status': 'no_data',
            'message': (
                f'No historical price data found for "{crop_name}" at "{market_name}". '
                'Predictions require historical observations for this crop-market combination.'
            ),
            'predicted_price': None,
        }

    # Build a single-row DataFrame for inference
    row = {
        'observation_date': pd.Timestamp(target_date),
        'modal_price': baseline['latest_price'],  # placeholder; lags are derived from history
        'crop_name': crop_name,
        'market_name': market_name,
        'state': state,
        'district': district,
        'season': season,
        'rainfall': rainfall,
        'temperature': temperature,
        'arrivals': arrivals,
    }

    # Build a small history + inference row DataFrame
    history_df = baseline['history_df']
    inference_row = pd.DataFrame([row])
    combined = pd.concat([history_df, inference_row], ignore_index=True)
    combined = build_features(combined)
    X_infer = combined.iloc[[-1]]  # last row = inference

    # Align columns with model's expected features
    feature_cols = [f for f in ALL_FEATURES if f in X_infer.columns]
    missing_cols = set(ALL_FEATURES) - set(feature_cols)
    for col in missing_cols:
        X_infer[col] = np.nan
    X_infer = X_infer[ALL_FEATURES]

    try:
        predicted = float(pipeline.predict(X_infer)[0])
        if predicted < 0:
            predicted = abs(predicted)  # prices cannot be negative
    except Exception as e:
        logger.error('Prediction inference failed: %s', e)
        return {
            'status': 'error',
            'message': f'Prediction failed during model inference: {e}',
            'predicted_price': None,
        }

    return {
        'status': 'ok',
        'predicted_price': round(predicted, 2),
        'currency': 'INR',
        'price_unit': baseline.get('price_unit', 'Quintal'),
        'historical_baseline': {
            'latest_price': baseline['latest_price'],
            'latest_date': str(baseline['latest_date']),
            'avg_90d': baseline['avg_90d'],
        },
        'price_change': round(predicted - baseline['latest_price'], 2) if baseline['latest_price'] else None,
        'price_change_pct': round(
            (predicted - baseline['latest_price']) / baseline['latest_price'] * 100, 2
        ) if baseline['latest_price'] else None,
        'model_info': {
            'algorithm': version.algorithm,
            'version': version.version,
            'model_id': version.id,
            'metrics': version.metrics,
        },
        'disclaimer': (
            'This is a data-driven estimate, not a guaranteed market price. '
            'Actual prices depend on local market conditions, weather, demand, and other factors.'
        ),
    }


def _get_historical_baseline(crop_name: str, market_name: str, target_date: date) -> dict:
    """Fetch historical prices for baseline and lag feature computation."""
    from apps.agriculture.models import HistoricalMarketPrice, Crop, Market
    try:
        crop = Crop.objects.get(name__iexact=crop_name)
        market = Market.objects.get(name__iexact=market_name)
    except (Crop.DoesNotExist, Market.DoesNotExist):
        return None

    # Fetch last 180 days of history before target_date
    since = target_date - timedelta(days=180)
    records = HistoricalMarketPrice.objects.filter(
        crop=crop, market=market, observation_date__lt=target_date, observation_date__gte=since
    ).order_by('observation_date').values('observation_date', 'modal_price', 'season',
                                           'rainfall', 'temperature', 'arrivals', 'price_unit')

    records_list = list(records)
    if not records_list:
        return None

    history_df = pd.DataFrame(records_list)
    history_df['crop_name'] = crop.name
    history_df['market_name'] = market.name
    history_df['state'] = market.state
    history_df['district'] = market.district
    history_df['modal_price'] = history_df['modal_price'].astype(float)

    latest = records_list[-1]
    prices_90d = [float(r['modal_price']) for r in records_list if r['observation_date'] >= target_date - timedelta(days=90)]

    return {
        'latest_price': float(latest['modal_price']),
        'latest_date': latest['observation_date'],
        'avg_90d': round(np.mean(prices_90d), 2) if prices_90d else None,
        'price_unit': latest.get('price_unit', 'Quintal'),
        'history_df': history_df,
    }


def clear_model_cache():
    """Clear the in-memory model cache (call after activating a new model)."""
    global _model_cache
    _model_cache = {}
