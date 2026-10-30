"""URL routes for dataset management endpoints."""
from django.urls import path
from .views import DatasetImportListView, DatasetImportDetailView, dataset_import_errors, upload_dataset

urlpatterns = [
    path('admin/datasets/upload/', upload_dataset, name='dataset-upload'),
    path('admin/datasets/', DatasetImportListView.as_view(), name='dataset-list'),
    path('admin/datasets/<int:pk>/', DatasetImportDetailView.as_view(), name='dataset-detail'),
    path('admin/datasets/<int:pk>/errors/', dataset_import_errors, name='dataset-errors'),
]
