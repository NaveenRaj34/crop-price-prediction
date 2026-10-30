"""Model evaluation metrics for regression models."""
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import logging

logger = logging.getLogger(__name__)


def evaluate_model(pipeline, X_test, y_test) -> dict:
    """
    Evaluate a trained sklearn pipeline on test data.
    Returns a dict of MAE, RMSE, R², and MAPE (where valid).
    """
    y_pred = pipeline.predict(X_test)
    y_true = np.array(y_test, dtype=float)
    y_pred = np.array(y_pred, dtype=float)

    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)

    # MAPE: only where actual > 0
    nonzero_mask = y_true > 0
    if nonzero_mask.sum() > 0:
        mape = np.mean(np.abs((y_true[nonzero_mask] - y_pred[nonzero_mask]) / y_true[nonzero_mask])) * 100
    else:
        mape = None

    return {
        'mae': round(float(mae), 4),
        'rmse': round(float(rmse), 4),
        'r2': round(float(r2), 6),
        'mape': round(float(mape), 4) if mape is not None else None,
        'test_samples': len(y_test),
        'note': 'MAPE computed only on non-zero actual values.'
                if mape is not None else 'MAPE not computed (all actual values are zero).',
    }


def compare_models(results: dict) -> str:
    """Return the name of the best model by RMSE."""
    best = None
    best_rmse = float('inf')
    for name, result in results.items():
        if result.get('success') and result['metrics']['rmse'] < best_rmse:
            best_rmse = result['metrics']['rmse']
            best = name
    return best
