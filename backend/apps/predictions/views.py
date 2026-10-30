"""Prediction views: create, list, retrieve, delete."""
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import PredictionRecord
from .serializers import PredictionInputSerializer, PredictionRecordSerializer
from apps.agriculture.models import Crop, Market
from apps.model_management.models import TrainedModelVersion
import logging
import decimal

logger = logging.getLogger(__name__)


class PredictionListView(generics.ListAPIView):
    serializer_class = PredictionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users see only their own predictions; admins can see all with ?all=true
        if (self.request.user.is_staff or self.request.user.is_superuser) and \
                self.request.query_params.get('all') == 'true':
            return PredictionRecord.objects.select_related('crop', 'market', 'model_version').all()
        return PredictionRecord.objects.select_related('crop', 'market', 'model_version').filter(
            user=self.request.user
        )


class PredictionDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = PredictionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return PredictionRecord.objects.all()
        return PredictionRecord.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_prediction(request):
    """Generate a new price prediction and save it to history."""
    serializer = PredictionInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    crop = Crop.objects.get(id=data['crop_id'])
    market = Market.objects.get(id=data['market_id'])

    from ml.predict import predict_price
    result = predict_price(
        crop_name=crop.name,
        market_name=market.name,
        state=market.state,
        district=market.district,
        target_date=data['target_date'],
        season=data.get('season', 'unknown'),
        rainfall=data.get('rainfall'),
        temperature=data.get('temperature'),
        arrivals=data.get('arrivals'),
    )

    # Find model version
    model_version = None
    if result.get('model_info', {}).get('model_id'):
        try:
            model_version = TrainedModelVersion.objects.get(id=result['model_info']['model_id'])
        except TrainedModelVersion.DoesNotExist:
            pass

    # Save prediction record regardless of outcome (for audit trail)
    record = PredictionRecord.objects.create(
        user=request.user,
        crop=crop,
        market=market,
        model_version=model_version,
        input_params={
            'season': data.get('season', 'unknown'),
            'rainfall': data.get('rainfall'),
            'temperature': data.get('temperature'),
            'arrivals': data.get('arrivals'),
        },
        target_date=data['target_date'],
        predicted_price=decimal.Decimal(str(result['predicted_price'])) if result.get('predicted_price') else None,
        currency=result.get('currency', 'INR'),
        price_unit=result.get('price_unit', 'Quintal'),
        historical_baseline_price=(
            decimal.Decimal(str(result['historical_baseline']['latest_price']))
            if result.get('historical_baseline', {}).get('latest_price') else None
        ),
        historical_baseline_date=(
            result['historical_baseline'].get('latest_date')
            if result.get('historical_baseline') else None
        ),
        price_change=decimal.Decimal(str(result['price_change'])) if result.get('price_change') is not None else None,
        price_change_pct=decimal.Decimal(str(result['price_change_pct'])) if result.get('price_change_pct') is not None else None,
        prediction_status=result.get('status', 'error'),
        error_message=result.get('message', ''),
    )

    return Response({
        'success': result['status'] == 'ok',
        'data': {
            'prediction': PredictionRecordSerializer(record).data,
            'result': result,
        }
    }, status=status.HTTP_201_CREATED if result['status'] == 'ok' else status.HTTP_200_OK)
