"""Analytics URL routes."""
from django.urls import path
from .views import dashboard_analytics, seasonality_analysis, model_performance

urlpatterns = [
    path('dashboard/', dashboard_analytics, name='analytics-dashboard'),
    path('seasonality/', seasonality_analysis, name='analytics-seasonality'),
    path('model-performance/', model_performance, name='analytics-model-performance'),
]
