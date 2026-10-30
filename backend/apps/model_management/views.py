"""Views for ML model management (admin only)."""
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import TrainedModelVersion
from .serializers import TrainedModelVersionSerializer
import logging
import threading

logger = logging.getLogger(__name__)


class IsAdminUser(permissions.BasePermission):
    """Returns 403 for authenticated non-admins; combined with IsAuthenticated gives 401 for anonymous."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    (request.user.is_staff or request.user.is_superuser))


# Use this tuple in all admin views
ADMIN_PERMISSIONS = [permissions.IsAuthenticated, IsAdminUser]


class ModelVersionListView(generics.ListAPIView):
    queryset = TrainedModelVersion.objects.all()
    serializer_class = TrainedModelVersionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]


class ModelVersionDetailView(generics.RetrieveAPIView):
    queryset = TrainedModelVersion.objects.all()
    serializer_class = TrainedModelVersionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]


@api_view(['POST'])
@permission_classes(ADMIN_PERMISSIONS)
def trigger_training(request):
    """
    Trigger model training in a background thread.
    Returns immediately with training status.
    """
    def run_training():
        try:
            import django
            from ml.train import train_all_models
            result = train_all_models()
            logger.info('Training completed: %s', result)
        except Exception as e:
            logger.error('Background training error: %s', e)

    thread = threading.Thread(target=run_training, daemon=True)
    thread.start()

    return Response({
        'success': True,
        'message': 'Model training started in background. Check model list for status updates.',
    }, status=status.HTTP_202_ACCEPTED)


@api_view(['POST'])
@permission_classes(ADMIN_PERMISSIONS)
def activate_model(request, pk):
    """Activate a specific model version, deactivating all others."""
    try:
        version = TrainedModelVersion.objects.get(pk=pk)
    except TrainedModelVersion.DoesNotExist:
        return Response({'error': {'message': 'Model version not found.'}}, status=404)

    if version.training_status != 'completed':
        return Response({
            'error': {'message': 'Cannot activate a model that has not completed training.'}
        }, status=400)

    # Deactivate all others
    TrainedModelVersion.objects.filter(is_active=True).update(is_active=False)
    version.is_active = True
    version.save(update_fields=['is_active'])

    # Clear prediction cache
    from ml.predict import clear_model_cache
    clear_model_cache()

    logger.info('Admin %s activated model version %d (%s)', request.user.username, version.id, version.algorithm)
    return Response({
        'success': True,
        'message': f'Model {version.algorithm} v{version.version} is now active.',
        'data': TrainedModelVersionSerializer(version).data,
    })
