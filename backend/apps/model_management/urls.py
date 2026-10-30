"""URL routes for model management."""
from django.urls import path
from .views import ModelVersionListView, ModelVersionDetailView, trigger_training, activate_model

urlpatterns = [
    path('models/train/', trigger_training, name='model-train'),
    path('models/', ModelVersionListView.as_view(), name='model-list'),
    path('models/<int:pk>/', ModelVersionDetailView.as_view(), name='model-detail'),
    path('models/<int:pk>/activate/', activate_model, name='model-activate'),
]
