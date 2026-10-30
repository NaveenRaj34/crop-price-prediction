"""Dataset import tracking models."""
from django.db import models
from django.contrib.auth.models import User


class DatasetImport(models.Model):
    """Tracks each CSV dataset import attempt."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('validating', 'Validating'),
        ('validated', 'Validated'),
        ('importing', 'Importing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    file_name = models.CharField(max_length=255)
    data_source = models.CharField(max_length=100, default='CSV Upload')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_rows = models.PositiveIntegerField(default=0)
    accepted_rows = models.PositiveIntegerField(default=0)
    rejected_rows = models.PositiveIntegerField(default=0)
    duplicate_rows = models.PositiveIntegerField(default=0)
    skipped_rows = models.PositiveIntegerField(default=0)
    error_summary = models.JSONField(default=dict, blank=True,
                                     help_text='Summary of validation errors by type')
    error_report = models.JSONField(default=list, blank=True,
                                    help_text='Detailed per-row errors (first 1000)')
    column_mapping = models.JSONField(default=dict, blank=True,
                                      help_text='Mapping from uploaded column names to canonical names')
    imported_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='imports')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-started_at']
        indexes = [models.Index(fields=['status']), models.Index(fields=['started_at'])]

    def __str__(self):
        return f"Import({self.file_name}, {self.status}, {self.started_at.date()})"

    @property
    def success_rate(self):
        if self.total_rows == 0:
            return None
        return round(self.accepted_rows / self.total_rows * 100, 1)
