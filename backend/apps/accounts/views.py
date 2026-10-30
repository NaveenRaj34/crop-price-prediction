"""Authentication and user profile views."""
from django.contrib.auth.models import User
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    RegisterSerializer, UserSerializer, UpdateProfileSerializer,
    ChangePasswordSerializer, CustomTokenObtainPairSerializer,
)
from .models import UserProfile
import logging

logger = logging.getLogger(__name__)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login endpoint returning JWT access + refresh tokens plus user data."""
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """Public endpoint for new user registration."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        logger.info('New user registered: %s', user.username)
        return Response(
            {
                'success': True,
                'message': 'Account created successfully.',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    """Return or update the current authenticated user's information."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UpdateProfileSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user)
        return Response({'success': True, 'data': serializer.data})

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'success': True, 'data': UserSerializer(request.user).data})


class ChangePasswordView(generics.UpdateAPIView):
    """Endpoint for changing password. Requires the old password."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'success': False, 'error': {'message': 'Old password is incorrect.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        logger.info('Password changed for user: %s', user.username)
        return Response({'success': True, 'message': 'Password changed successfully.'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """Blacklist the refresh token to invalidate the session."""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'success': True, 'message': 'Logged out successfully.'})
    except Exception as e:
        logger.warning('Logout error: %s', e)
        return Response({'success': True, 'message': 'Logged out.'})
