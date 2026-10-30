"""Views for dataset import management (admin only)."""
import json
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from .models import DatasetImport
from .serializers import DatasetImportSerializer
from .importer import validate_csv, import_csv
import logging

logger = logging.getLogger(__name__)


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and (request.user.is_staff or request.user.is_superuser)


class DatasetImportListView(generics.ListAPIView):
    serializer_class = DatasetImportSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return DatasetImport.objects.select_related('imported_by').all()


class DatasetImportDetailView(generics.RetrieveAPIView):
    queryset = DatasetImport.objects.all()
    serializer_class = DatasetImportSerializer
    permission_classes = [IsAdminUser]


@api_view(['GET'])
@permission_classes([IsAdminUser])
def dataset_import_errors(request, pk):
    """Return detailed per-row errors for an import batch."""
    try:
        import_record = DatasetImport.objects.get(pk=pk)
    except DatasetImport.DoesNotExist:
        return Response({'error': {'message': 'Import not found.'}}, status=404)
    return Response({
        'success': True,
        'data': {
            'import_id': import_record.id,
            'file_name': import_record.file_name,
            'error_summary': import_record.error_summary,
            'error_report': import_record.error_report,
            'total_errors': len(import_record.error_report),
        }
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_dataset(request):
    """
    Validate and optionally import a CSV file.
    
    POST params:
      - file: CSV file
      - column_mapping: JSON string mapping uploaded column names to canonical names (optional)
      - confirm_import: 'true' to proceed with import after validation
      - data_source: label for this import (optional)
    """
    if 'file' not in request.FILES:
        return Response({'error': {'message': 'No file provided.'}}, status=400)

    csv_file = request.FILES['file']
    if not csv_file.name.endswith('.csv'):
        return Response({'error': {'message': 'Only CSV files are accepted.'}}, status=400)

    from django.conf import settings
    if csv_file.size > settings.MAX_UPLOAD_SIZE:
        return Response({'error': {'message': f'File size exceeds {settings.MAX_UPLOAD_SIZE // 1048576}MB limit.'}}, status=400)

    column_mapping_raw = request.data.get('column_mapping', '{}')
    try:
        column_mapping = json.loads(column_mapping_raw)
    except json.JSONDecodeError:
        return Response({'error': {'message': 'Invalid column_mapping JSON.'}}, status=400)

    confirm = request.data.get('confirm_import', 'false').lower() == 'true'
    data_source = request.data.get('data_source', 'CSV Upload')

    # Validate first
    validation_result = validate_csv(csv_file, column_mapping)

    if not confirm:
        return Response({
            'success': True,
            'validated': True,
            'can_import': validation_result['valid'],
            'validation': validation_result,
            'message': 'Set confirm_import=true to proceed with the import.',
        })

    if not validation_result['valid']:
        return Response({
            'success': False,
            'error': {'message': 'Validation failed. Fix errors before importing.'},
            'validation': validation_result,
        }, status=400)

    # Create import record
    import_record = DatasetImport.objects.create(
        file_name=csv_file.name,
        data_source=data_source,
        column_mapping=column_mapping,
        imported_by=request.user,
        status='pending',
    )

    # Reset file pointer
    csv_file.seek(0)
    import_record = import_csv(csv_file, import_record, column_mapping)

    serializer = DatasetImportSerializer(import_record)
    return Response({
        'success': True,
        'message': f'Import completed: {import_record.accepted_rows} records accepted.',
        'data': serializer.data,
    }, status=201)
