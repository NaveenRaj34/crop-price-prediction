"""Audit middleware and utility functions."""
import logging
from .models import AuditLog

logger = logging.getLogger(__name__)

# Paths to audit
AUDITED_PATHS = {
    '/api/v1/auth/login/',
    '/api/v1/auth/logout/',
    '/api/v1/auth/register/',
}


class AuditMiddleware:
    """Middleware that logs authentication events to AuditLog."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            path = request.path
            if path in AUDITED_PATHS and request.method == 'POST' and response.status_code in (200, 201):
                action_map = {
                    '/api/v1/auth/login/': 'login',
                    '/api/v1/auth/logout/': 'logout',
                    '/api/v1/auth/register/': 'register',
                }
                action = action_map.get(path)
                if action:
                    user = request.user if request.user.is_authenticated else None
                    AuditLog.objects.create(
                        user=user,
                        action=action,
                        ip_address=_get_ip(request),
                    )
        except Exception as e:
            logger.warning('Audit middleware error: %s', e)
        return response


def log_action(user, action: str, resource_type: str = '', resource_id: str = '',
                description: str = '', metadata: dict = None):
    """Helper to create an audit log entry programmatically."""
    try:
        AuditLog.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            description=description,
            metadata=metadata or {},
        )
    except Exception as e:
        logger.warning('Failed to write audit log: %s', e)


def _get_ip(request) -> str:
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')
