"""AuditLog model."""
from django.db import models
from django.contrib.auth.models import User


class AuditLog(models.Model):
    """Records significant system actions for traceability."""
    ACTION_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('register', 'Register'),
        ('prediction', 'Prediction Generated'),
        ('dataset_upload', 'Dataset Uploaded'),
        ('model_trained', 'Model Trained'),
        ('model_activated', 'Model Activated'),
        ('crop_created', 'Crop Created'),
        ('market_created', 'Market Created'),
        ('admin_action', 'Admin Action'),
        ('export', 'Data Exported'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=100, blank=True)
    resource_id = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True,
                                 help_text='Safe additional context. Never store passwords or tokens.')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        username = self.user.username if self.user else 'system'
        return f"Audit({username}, {self.action}, {self.created_at.date()})"
