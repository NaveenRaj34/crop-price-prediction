"""Serializers for Crop, Market, and HistoricalMarketPrice."""
from rest_framework import serializers
from .models import Crop, Market, HistoricalMarketPrice, WeatherRecord


class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model = Crop
        fields = ['id', 'name', 'category', 'variety', 'standard_unit',
                  'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class MarketSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Market
        fields = ['id', 'name', 'state', 'district', 'location_details',
                  'data_source', 'is_active', 'display_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_display_name(self, obj):
        return str(obj)


class HistoricalPriceSerializer(serializers.ModelSerializer):
    crop_name = serializers.CharField(source='crop.name', read_only=True)
    market_name = serializers.CharField(source='market.name', read_only=True)
    state = serializers.CharField(source='market.state', read_only=True)
    district = serializers.CharField(source='market.district', read_only=True)

    class Meta:
        model = HistoricalMarketPrice
        fields = [
            'id', 'crop', 'crop_name', 'market', 'market_name', 'state', 'district',
            'observation_date', 'min_price', 'max_price', 'modal_price',
            'currency', 'price_unit', 'season', 'rainfall', 'temperature',
            'arrivals', 'data_source', 'is_demo_data', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PriceTrendSerializer(serializers.Serializer):
    """Aggregated price trend data point."""
    date = serializers.DateField()
    avg_price = serializers.FloatField()
    min_price = serializers.FloatField(allow_null=True)
    max_price = serializers.FloatField(allow_null=True)
    record_count = serializers.IntegerField()


class MarketComparisonSerializer(serializers.Serializer):
    """Comparison data for a single market."""
    market_id = serializers.IntegerField()
    market_name = serializers.CharField()
    state = serializers.CharField()
    district = serializers.CharField()
    latest_price = serializers.FloatField(allow_null=True)
    latest_date = serializers.DateField(allow_null=True)
    avg_price_30d = serializers.FloatField(allow_null=True)
    price_unit = serializers.CharField()
    data_source = serializers.CharField()
    record_count = serializers.IntegerField()
