"""
Data preprocessing pipeline for crop price prediction.

All transformations are fitted on training data only.
The fitted pipeline is saved alongside the model artifact.
"""
import logging
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder

logger = logging.getLogger(__name__)

# Canonical feature columns expected by the pipeline
CATEGORICAL_FEATURES = ['crop_name', 'market_name', 'state', 'district', 'season']
NUMERIC_FEATURES = ['month', 'year', 'day_of_year', 'rainfall', 'temperature', 'arrivals']
LAG_FEATURES = ['price_lag_7', 'price_lag_30', 'price_lag_90', 'rolling_avg_30', 'rolling_avg_90']

ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES + LAG_FEATURES
TARGET = 'modal_price'


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineer features from a raw historical price DataFrame.
    Input must contain: observation_date, crop_name, market_name, state, district,
                        season, modal_price, and optionally rainfall/temperature/arrivals.
    """
    df = df.copy()
    df['observation_date'] = pd.to_datetime(df['observation_date'])
    df = df.sort_values(['crop_name', 'market_name', 'observation_date'])

    # Date features
    df['month'] = df['observation_date'].dt.month
    df['year'] = df['observation_date'].dt.year
    df['day_of_year'] = df['observation_date'].dt.dayofyear

    # Lag features (per crop+market group)
    grp = df.groupby(['crop_name', 'market_name'])['modal_price']
    df['price_lag_7'] = grp.shift(7)
    df['price_lag_30'] = grp.shift(30)
    df['price_lag_90'] = grp.shift(90)
    df['rolling_avg_30'] = grp.transform(lambda x: x.shift(1).rolling(30, min_periods=3).mean())
    df['rolling_avg_90'] = grp.transform(lambda x: x.shift(1).rolling(90, min_periods=7).mean())

    # Ensure optional columns exist
    for col in ['rainfall', 'temperature', 'arrivals']:
        if col not in df.columns:
            df[col] = np.nan

    return df


def build_preprocessor() -> ColumnTransformer:
    """
    Build a sklearn ColumnTransformer for categorical and numeric features.
    Must be fitted on training data only.
    """
    numeric_pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler()),
    ])

    categorical_pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='constant', fill_value='unknown')),
        ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False)),
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_pipeline, NUMERIC_FEATURES + LAG_FEATURES),
            ('cat', categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder='drop',
    )
    return preprocessor


def prepare_training_data(df: pd.DataFrame):
    """
    Prepare X and y for model training.
    Returns (X, y, feature_df) where feature_df has all engineered columns.
    Drops rows where target is null.
    """
    df = build_features(df)
    df = df.dropna(subset=[TARGET])

    available_features = [f for f in ALL_FEATURES if f in df.columns]
    missing = set(ALL_FEATURES) - set(available_features)
    if missing:
        logger.warning('Features not available in dataset: %s', missing)

    X = df[available_features].copy()
    y = df[TARGET].astype(float)

    return X, y, df


def get_data_quality_report(df: pd.DataFrame) -> dict:
    """Return a data quality summary for the given DataFrame."""
    report = {
        'total_rows': len(df),
        'missing_values': {},
        'negative_prices': 0,
        'date_range': None,
    }

    for col in df.columns:
        null_count = df[col].isna().sum()
        if null_count > 0:
            report['missing_values'][col] = int(null_count)

    if 'modal_price' in df.columns:
        report['negative_prices'] = int((df['modal_price'] < 0).sum())

    if 'observation_date' in df.columns:
        dates = pd.to_datetime(df['observation_date'], errors='coerce').dropna()
        if len(dates):
            report['date_range'] = {
                'from': str(dates.min().date()),
                'to': str(dates.max().date()),
                'days_covered': (dates.max() - dates.min()).days,
            }

    return report
