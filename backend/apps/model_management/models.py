"""TrainedModelVersion model."""
from django.db import models


class TrainedModelVersion(models.Model):
    ALGORITHM_CHOICES = [
        ('linear_regression', 'Linear Regression'),
        ('decision_tree', 'Decision Tree'),
        ('random_forest', 'Random Forest'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('training', 'Training'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    algorithm = models.CharField(max_length=50, choices=ALGORITHM_CHOICES)
    version = models.CharField(max_length=50)
    feature_schema = models.JSONField(default=list, help_text='List of feature column names used')
    metrics = models.JSONField(default=dict, help_text='Evaluation metrics dict')
    artifact_path = models.CharField(max_length=500, blank=True)
    training_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_active = models.BooleanField(default=False, help_text='Only one model should be active at a time')
    training_error = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['is_active']), models.Index(fields=['algorithm'])]

    def __str__(self):
        return f"{self.algorithm} v{self.version} ({'active' if self.is_active else 'inactive'})"
