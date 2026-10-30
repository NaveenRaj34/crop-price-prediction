"""Report download URL routes."""
from django.urls import path
from .reports import export_predictions_csv, export_predictions_pdf

urlpatterns = [
    path('predictions.csv', export_predictions_csv, name='report-csv'),
    path('predictions.pdf', export_predictions_pdf, name='report-pdf'),
]
