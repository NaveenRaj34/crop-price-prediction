"""URL routes for agriculture endpoints."""
from django.urls import path
from .views import (
    CropListCreateView, CropDetailView,
    MarketListCreateView, MarketDetailView,
    HistoricalPriceListView, price_trends, price_compare, price_summary,
)

urlpatterns = [
    path('crops/', CropListCreateView.as_view(), name='crop-list'),
    path('crops/<int:pk>/', CropDetailView.as_view(), name='crop-detail'),
    path('markets/', MarketListCreateView.as_view(), name='market-list'),
    path('markets/<int:pk>/', MarketDetailView.as_view(), name='market-detail'),
    path('prices/', HistoricalPriceListView.as_view(), name='price-list'),
    path('prices/trends/', price_trends, name='price-trends'),
    path('prices/compare/', price_compare, name='price-compare'),
    path('prices/summary/', price_summary, name='price-summary'),
]
