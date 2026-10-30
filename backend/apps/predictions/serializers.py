"""Serializers for prediction records."""
from rest_framework import serializers
from django.utils import timezone
from .models import PredictionRecord
from apps.agriculture.models import Crop, Market
import datetime


class PredictionInputSerializer(serializers.Serializer):
    crop_id = serializers.IntegerField()
    market_id = serializers.IntegerField()
    target_date = serializers.DateField()
    season = serializers.ChoiceField(
        choices=['kharif', 'rabi', 'zaid', 'annual', 'unknown'],
        default='unknown',
        required=False,
    )
    rainfall = serializers.FloatField(required=False, allow_null=True)
    temperature = serializers.FloatField(required=False, allow_null=True)
    arrivals = serializers.FloatField(required=False, allow_null=True)

    def validate_crop_id(self, value):
        if not Crop.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError(f'Crop with id {value} not found or inactive.')
        return value

    def validate_market_id(self, value):
        if not Market.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError(f'Market with id {value} not found or inactive.')
        return value

    def validate_target_date(self, value):
        today = datetime.date.today()
        if value < today - datetime.timedelta(days=1):
            raise serializers.ValidationError('Target date must be today or in the future.')
        max_ahead = today + datetime.timedelta(days=365)
        if value > max_ahead:
            raise serializers.ValidationError('Target date cannot be more than 1 year in the future.')
        return value


class PredictionRecordSerializer(serializers.ModelSerializer):
    crop_name = serializers.CharField(source='crop.name', read_only=True, allow_null=True)
    market_name = serializers.CharField(source='market.name', read_only=True, allow_null=True)
    market_state = serializers.CharField(source='market.state', read_only=True, allow_null=True)
    market_district = serializers.CharField(source='market.district', read_only=True, allow_null=True)
    algorithm = serializers.CharField(source='model_version.algorithm', read_only=True, allow_null=True)
    model_version_str = serializers.CharField(source='model_version.version', read_only=True, allow_null=True)

    class Meta:
        model = PredictionRecord
        fields = [
            'id', 'crop', 'crop_name', 'market', 'market_name', 'market_state', 'market_district',
            'target_date', 'predicted_price', 'currency', 'price_unit',
            'historical_baseline_price', 'historical_baseline_date',
            'price_change', 'price_change_pct',
            'algorithm', 'model_version_str', 'input_params',
            'prediction_status', 'error_message', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
