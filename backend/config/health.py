"""Health check endpoint."""
from django.urls import path
from django.http import JsonResponse
from django.db import connection


def health_check(request):
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False

    payload = {
        'status': 'ok' if db_ok else 'degraded',
        'database': 'ok' if db_ok else 'error',
    }
    status_code = 200 if db_ok else 503
    return JsonResponse(payload, status=status_code)


urlpatterns = [
    path('', health_check, name='health-check'),
]
