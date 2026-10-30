"""
Model training pipeline for crop price prediction.

Trains Linear Regression, Decision Tree, and Random Forest models.
Selects the best model by RMSE on the held-out test set.
"""
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split

from ml.preprocessing import (
    prepare_training_data, build_preprocessor, ALL_FEATURES, TARGET
)
from ml.evaluate import evaluate_model

logger = logging.getLogger(__name__)

MIN_TRAINING_SAMPLES = 30  # Minimum rows needed for training


def load_training_data_from_db():
    """Load all historical market prices from the database as a DataFrame."""
    from apps.agriculture.models import HistoricalMarketPrice
    qs = HistoricalMarketPrice.objects.select_related('crop', 'market').values(
        'observation_date', 'modal_price', 'min_price', 'max_price',
        'season', 'rainfall', 'temperature', 'arrivals',
        crop_name=models_field('crop__name'),
        market_name=models_field('market__name'),
        state=models_field('market__state'),
        district=models_field('market__district'),
    )
    return pd.DataFrame(list(qs))


def models_field(field):
    """Helper for annotated queryset field names."""
    from django.db.models import F
    return F(field)


def train_all_models(artifact_dir: Path = None) -> dict:
    """
    Train all candidate models and return a summary report.
    Saves artifacts and updates the database TrainedModelVersion.
    """
    from django.conf import settings
    artifact_dir = artifact_dir or Path(settings.ML_ARTIFACTS_DIR)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    logger.info('Loading training data...')
    df = _load_data()
    if df is None or len(df) < MIN_TRAINING_SAMPLES:
        return {
            'success': False,
            'error': f'Insufficient training data. Need at least {MIN_TRAINING_SAMPLES} records, found {len(df) if df is not None else 0}.',
        }

    logger.info('Preparing features (%d rows)...', len(df))
    X, y, feature_df = prepare_training_data(df)

    if len(X) < MIN_TRAINING_SAMPLES:
        return {
            'success': False,
            'error': f'After feature engineering, only {len(X)} valid rows remain. Need at least {MIN_TRAINING_SAMPLES}.',
        }

    # Chronological train/test split (80/20)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    logger.info('Train: %d rows, Test: %d rows', len(X_train), len(X_test))

    candidates = {
        'linear_regression': LinearRegression(),
        'decision_tree': DecisionTreeRegressor(max_depth=10, min_samples_leaf=5, random_state=42),
        'random_forest': RandomForestRegressor(n_estimators=100, max_depth=15, min_samples_leaf=3,
                                                n_jobs=-1, random_state=42),
    }

    results = {}
    best_name = None
    best_rmse = float('inf')

    for name, estimator in candidates.items():
        logger.info('Training %s...', name)
        preprocessor = build_preprocessor()
        pipeline = Pipeline([
            ('preprocessor', preprocessor),
            ('model', estimator),
        ])

        try:
            pipeline.fit(X_train, y_train)
            metrics = evaluate_model(pipeline, X_test, y_test)
            results[name] = {'metrics': metrics, 'success': True}
            logger.info('%s — RMSE: %.2f, MAE: %.2f, R²: %.4f',
                        name, metrics['rmse'], metrics['mae'], metrics['r2'])

            if metrics['rmse'] < best_rmse:
                best_rmse = metrics['rmse']
                best_name = name

            # Save artifact
            version = _save_artifact(pipeline, name, artifact_dir, metrics, X_train.columns.tolist())
            results[name]['model_version_id'] = version.id if version else None
        except Exception as e:
            logger.error('Training failed for %s: %s', name, e)
            results[name] = {'success': False, 'error': str(e)}

    # Activate the best model
    if best_name:
        _activate_best_model(best_name, results)
        logger.info('Best model: %s (RMSE: %.2f)', best_name, best_rmse)

    return {
        'success': True,
        'training_rows': len(X_train),
        'test_rows': len(X_test),
        'results': results,
        'best_model': best_name,
        'best_rmse': best_rmse,
    }


def _load_data() -> pd.DataFrame:
    """Load data from Django ORM."""
    try:
        from apps.agriculture.models import HistoricalMarketPrice
        qs = HistoricalMarketPrice.objects.select_related('crop', 'market').all()
        records = list(qs.values(
            'observation_date', 'modal_price', 'min_price', 'max_price',
            'season', 'rainfall', 'temperature', 'arrivals',
        ))
        # Add related field values
        crops = {r.id: r.crop.name for r in qs}
        markets = {r.id: (r.market.name, r.market.state, r.market.district) for r in qs}
        qs_with_related = qs.select_related('crop', 'market')
        rows = []
        for obj in qs_with_related:
            rows.append({
                'observation_date': obj.observation_date,
                'modal_price': float(obj.modal_price) if obj.modal_price is not None else None,
                'min_price': float(obj.min_price) if obj.min_price is not None else None,
                'max_price': float(obj.max_price) if obj.max_price is not None else None,
                'season': obj.season,
                'rainfall': obj.rainfall,
                'temperature': obj.temperature,
                'arrivals': obj.arrivals,
                'crop_name': obj.crop.name,
                'market_name': obj.market.name,
                'state': obj.market.state,
                'district': obj.market.district,
            })
        return pd.DataFrame(rows)
    except Exception as e:
        logger.error('Failed to load training data: %s', e)
        return None


def _save_artifact(pipeline, algorithm_name: str, artifact_dir: Path, metrics: dict, feature_names: list):
    """Save trained pipeline and register in database."""
    try:
        from apps.model_management.models import TrainedModelVersion
        version_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        artifact_filename = f'{algorithm_name}_{version_str}.joblib'
        artifact_path = artifact_dir / artifact_filename
        joblib.dump(pipeline, artifact_path)

        model_version = TrainedModelVersion.objects.create(
            algorithm=algorithm_name,
            version=version_str,
            feature_schema=feature_names,
            metrics=metrics,
            artifact_path=str(artifact_path),
            training_status='completed',
            is_active=False,
        )
        return model_version
    except Exception as e:
        logger.error('Failed to save artifact for %s: %s', algorithm_name, e)
        return None


def _activate_best_model(best_name: str, results: dict):
    """Mark the best model version as active, deactivate others."""
    try:
        from apps.model_management.models import TrainedModelVersion
        if results.get(best_name, {}).get('model_version_id'):
            TrainedModelVersion.objects.filter(is_active=True).update(is_active=False)
            TrainedModelVersion.objects.filter(
                id=results[best_name]['model_version_id']
            ).update(is_active=True)
    except Exception as e:
        logger.error('Failed to activate best model: %s', e)
