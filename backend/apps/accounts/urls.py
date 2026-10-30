"""URL routes for authentication endpoints."""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    RegisterView,
    MeView,
    ChangePasswordView,
    logout_view,
)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='auth-login'),
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('logout/', logout_view, name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('me/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
]
