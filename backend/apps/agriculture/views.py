"""Views for crops, markets, and historical price data."""
from django.db.models import Avg, Min, Max, Count, Q
from django.utils import timezone
from datetime import timedelta, date
from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Crop, Market, HistoricalMarketPrice
from .serializers import (
    CropSerializer, MarketSerializer, HistoricalPriceSerializer,
    PriceTrendSerializer, MarketComparisonSerializer,
)
from .filters import HistoricalPriceFilter
import logging

logger = logging.getLogger(__name__)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Read access for all authenticated users; write access only for admins."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and (request.user.is_staff or request.user.is_superuser)


class CropListCreateView(generics.ListCreateAPIView):
    serializer_class = CropSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ['name', 'category', 'variety']
    filterset_fields = ['category', 'is_active']
    ordering_fields = ['name', 'category', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        qs = Crop.objects.all()
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            qs = qs.filter(is_active=True)
        return qs


class CropDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Crop.objects.all()
    serializer_class = CropSerializer
    permission_classes = [IsAdminOrReadOnly]


class MarketListCreateView(generics.ListCreateAPIView):
    serializer_class = MarketSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend, filters.OrderingFilter]
    search_fields = ['name', 'state', 'district']
    filterset_fields = ['state', 'district', 'is_active']
    ordering_fields = ['name', 'state', 'district']
    ordering = ['state', 'name']

    def get_queryset(self):
        qs = Market.objects.all()
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            qs = qs.filter(is_active=True)
        return qs


class MarketDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Market.objects.all()
    serializer_class = MarketSerializer
    permission_classes = [IsAdminOrReadOnly]


class HistoricalPriceListView(generics.ListAPIView):
    serializer_class = HistoricalPriceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = HistoricalPriceFilter
    ordering_fields = ['observation_date', 'modal_price']
    ordering = ['-observation_date']

    def get_queryset(self):
        return HistoricalMarketPrice.objects.select_related('crop', 'market').all()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def price_trends(request):
    """Return daily average price trend for a crop+market combination."""
    crop_id = request.query_params.get('crop_id')
    market_id = request.query_params.get('market_id')
    days = int(request.query_params.get('days', 365))
    days = min(days, 1825)  # cap at 5 years

    if not crop_id or not market_id:
        return Response({'error': {'message': 'crop_id and market_id are required.'}}, status=400)

    since = date.today() - timedelta(days=days)
    qs = HistoricalMarketPrice.objects.filter(
        crop_id=crop_id, market_id=market_id, observation_date__gte=since
    ).order_by('observation_date')

    data = list(qs.values('observation_date').annotate(
        avg_price=Avg('modal_price'),
        min_price=Min('modal_price'),
        max_price=Max('modal_price'),
        record_count=Count('id'),
    ))

    # Rename key to match serializer
    for item in data:
        item['date'] = item.pop('observation_date')

    return Response({
        'success': True,
        'data': data,
        'meta': {
            'crop_id': crop_id,
            'market_id': market_id,
            'days': days,
            'record_count': len(data),
        }
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def price_compare(request):
    """Compare latest prices for a crop across multiple markets."""
    crop_id = request.query_params.get('crop_id')
    market_ids = request.query_params.getlist('market_ids')
    state = request.query_params.get('state')

    if not crop_id:
        return Response({'error': {'message': 'crop_id is required.'}}, status=400)

    markets_qs = Market.objects.filter(is_active=True)
    if market_ids:
        markets_qs = markets_qs.filter(id__in=market_ids)
    if state:
        markets_qs = markets_qs.filter(state=state)

    since_30d = date.today() - timedelta(days=30)
    results = []
    for market in markets_qs[:20]:  # cap at 20 markets
        prices = HistoricalMarketPrice.objects.filter(crop_id=crop_id, market=market).order_by('-observation_date')
        latest = prices.first()
        avg_30d = prices.filter(observation_date__gte=since_30d).aggregate(avg=Avg('modal_price'))['avg']
        results.append({
            'market_id': market.id,
            'market_name': market.name,
            'state': market.state,
            'district': market.district,
            'latest_price': float(latest.modal_price) if latest else None,
            'latest_date': latest.observation_date if latest else None,
            'avg_price_30d': round(avg_30d, 2) if avg_30d else None,
            'price_unit': latest.price_unit if latest else 'Quintal',
            'data_source': latest.data_source if latest else 'N/A',
            'record_count': prices.count(),
        })

    return Response({'success': True, 'data': results})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def price_summary(request):
    """Return summary statistics for a crop+market selection."""
    crop_id = request.query_params.get('crop_id')
    market_id = request.query_params.get('market_id')

    qs = HistoricalMarketPrice.objects.all()
    if crop_id:
        qs = qs.filter(crop_id=crop_id)
    if market_id:
        qs = qs.filter(market_id=market_id)

    stats = qs.aggregate(
        avg_price=Avg('modal_price'),
        min_price=Min('modal_price'),
        max_price=Max('modal_price'),
        record_count=Count('id'),
    )

    return Response({'success': True, 'data': stats})
