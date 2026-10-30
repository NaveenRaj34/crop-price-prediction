"""Django-filter FilterSet for HistoricalMarketPrice."""
import django_filters
from .models import HistoricalMarketPrice


class HistoricalPriceFilter(django_filters.FilterSet):
    crop = django_filters.NumberFilter(field_name='crop_id')
    market = django_filters.NumberFilter(field_name='market_id')
    state = django_filters.CharFilter(field_name='market__state', lookup_expr='icontains')
    district = django_filters.CharFilter(field_name='market__district', lookup_expr='icontains')
    date_from = django_filters.DateFilter(field_name='observation_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='observation_date', lookup_expr='lte')
    season = django_filters.CharFilter(field_name='season')
    is_demo_data = django_filters.BooleanFilter(field_name='is_demo_data')

    class Meta:
        model = HistoricalMarketPrice
        fields = ['crop', 'market', 'state', 'district', 'date_from', 'date_to', 'season', 'is_demo_data']
