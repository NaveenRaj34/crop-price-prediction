"""Serializers for DatasetImport."""
from rest_framework import serializers
from .models import DatasetImport


class DatasetImportSerializer(serializers.ModelSerializer):
    imported_by_username = serializers.CharField(source='imported_by.username', read_only=True, allow_null=True)
    success_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = DatasetImport
        fields = [
            'id', 'file_name', 'data_source', 'status',
            'total_rows', 'accepted_rows', 'rejected_rows', 'duplicate_rows', 'skipped_rows',
            'error_summary', 'column_mapping', 'imported_by_username',
            'started_at', 'completed_at', 'notes', 'success_rate',
        ]
        read_only_fields = ['id', 'started_at', 'success_rate']
