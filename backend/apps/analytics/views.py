"""Analytics views for dashboard, seasonality, and model performance."""
from django.db.models import Avg, Min, Max, Count, Q
from django.utils import timezone
from datetime import timedelta, date
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_analytics(request):
    """Return summary statistics for the user dashboard."""
    from apps.agriculture.models import Crop, Market, HistoricalMarketPrice
    from apps.predictions.models import PredictionRecord
    from apps.model_management.models import TrainedModelVersion

    crop_count = Crop.objects.filter(is_active=True).count()
    market_count = Market.objects.filter(is_active=True).count()
    price_record_count = HistoricalMarketPrice.objects.count()

    user_prediction_count = PredictionRecord.objects.filter(user=request.user).count()

    # Active model
    active_model = TrainedModelVersion.objects.filter(is_active=True, training_status='completed').first()
    model_info = None
    if active_model:
        model_info = {
            'algorithm': active_model.algorithm,
            'version': active_model.version,
            'rmse': active_model.metrics.get('rmse'),
            'r2': active_model.metrics.get('r2'),
            'trained_at': str(active_model.created_at.date()),
        }

    # Latest data update
    latest_price = HistoricalMarketPrice.objects.order_by('-observation_date').first()
    last_update = str(latest_price.observation_date) if latest_price else None

    # Crop-wise average prices
    crop_avg_prices = list(
        HistoricalMarketPrice.objects.values('crop__name').annotate(
            avg_price=Avg('modal_price'),
            record_count=Count('id'),
        ).order_by('-avg_price')[:10]
    )

    # Recent prediction count (last 7 days)
    recent_predictions = PredictionRecord.objects.filter(
        created_at__gte=timezone.now() - timedelta(days=7)
    ).count()

    return Response({
        'success': True,
        'data': {
            'crop_count': crop_count,
            'market_count': market_count,
            'price_record_count': price_record_count,
            'user_prediction_count': user_prediction_count,
            'recent_predictions_7d': recent_predictions,
            'active_model': model_info,
            'last_data_update': last_update,
            'crop_avg_prices': crop_avg_prices,
        }
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def seasonality_analysis(request):
    """Return average prices per month and season for a crop."""
    from apps.agriculture.models import HistoricalMarketPrice
    crop_id = request.query_params.get('crop_id')
    market_id = request.query_params.get('market_id')

    qs = HistoricalMarketPrice.objects.all()
    if crop_id:
        qs = qs.filter(crop_id=crop_id)
    if market_id:
        qs = qs.filter(market_id=market_id)

    from django.db.models.functions import ExtractMonth
    monthly = list(
        qs.annotate(month=ExtractMonth('observation_date'))
        .values('month')
        .annotate(
            avg_price=Avg('modal_price'),
            min_price=Min('modal_price'),
            max_price=Max('modal_price'),
            count=Count('id'),
        )
        .order_by('month')
    )

    season_summary = list(
        qs.exclude(season='unknown').values('season').annotate(
            avg_price=Avg('modal_price'),
            count=Count('id'),
        ).order_by('season')
    )

    return Response({
        'success': True,
        'data': {
            'monthly': monthly,
            'by_season': season_summary,
        }
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def model_performance(request):
    """Return evaluation metrics for all trained models."""
    from apps.model_management.models import TrainedModelVersion
    models = TrainedModelVersion.objects.filter(training_status='completed').order_by('-created_at')[:20]
    data = [
        {
            'id': m.id,
            'algorithm': m.algorithm,
            'version': m.version,
            'metrics': m.metrics,
            'is_active': m.is_active,
            'created_at': str(m.created_at.date()),
        }
        for m in models
    ]
    return Response({'success': True, 'data': data})
