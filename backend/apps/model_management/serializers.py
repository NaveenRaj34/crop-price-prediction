"""Serializers for TrainedModelVersion."""
from rest_framework import serializers
from .models import TrainedModelVersion


class TrainedModelVersionSerializer(serializers.ModelSerializer):
    algorithm_display = serializers.CharField(source='get_algorithm_display', read_only=True)

    class Meta:
        model = TrainedModelVersion
        fields = [
            'id', 'algorithm', 'algorithm_display', 'version',
            'feature_schema', 'metrics', 'artifact_path',
            'training_status', 'is_active', 'training_error', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'artifact_path', 'feature_schema', 'metrics']
