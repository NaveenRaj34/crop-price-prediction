"""Prediction record model."""
from django.db import models
from django.contrib.auth.models import User
from apps.agriculture.models import Crop, Market
from apps.model_management.models import TrainedModelVersion


class PredictionRecord(models.Model):
    """Stores each prediction request and its result."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='predictions')
    crop = models.ForeignKey(Crop, on_delete=models.SET_NULL, null=True, related_name='predictions')
    market = models.ForeignKey(Market, on_delete=models.SET_NULL, null=True, related_name='predictions')
    model_version = models.ForeignKey(
        TrainedModelVersion, on_delete=models.SET_NULL, null=True, related_name='predictions'
    )
    # Input parameters stored as JSON for traceability
    input_params = models.JSONField(default=dict)
    target_date = models.DateField()
    predicted_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default='INR')
    price_unit = models.CharField(max_length=50, default='Quintal')
    historical_baseline_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    historical_baseline_date = models.DateField(null=True, blank=True)
    price_change = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    price_change_pct = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    prediction_status = models.CharField(max_length=20, default='ok')
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['crop', 'market']),
        ]

    def __str__(self):
        return f"Prediction({self.user.username}, {self.crop}, {self.target_date}: ₹{self.predicted_price})"
