"""Prediction URL routes."""
from django.urls import path
from .views import PredictionListView, PredictionDetailView, create_prediction

urlpatterns = [
    path('predictions/', create_prediction, name='prediction-create'),
    path('predictions/history/', PredictionListView.as_view(), name='prediction-list'),
    path('predictions/<int:pk>/', PredictionDetailView.as_view(), name='prediction-detail'),
]
