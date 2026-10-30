"""URL configuration for Crop Price Prediction project."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/', include('apps.agriculture.urls')),
    path('api/v1/', include('apps.datasets.urls')),
    path('api/v1/', include('apps.predictions.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
    path('api/v1/admin/', include('apps.model_management.urls')),
    path('api/v1/reports/', include('apps.predictions.report_urls')),
    # API Schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    # Health check
    path('api/health/', include('config.health')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
