"""Serializers for authentication and user profile."""
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['display_name', 'preferred_state', 'preferred_district', 'phone_number', 'bio']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_admin', 'profile', 'date_joined']
        read_only_fields = ['id', 'date_joined', 'is_admin']

    def get_is_admin(self, obj):
        return obj.is_staff or obj.is_superuser


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    display_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name', 'display_name']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        display_name = validated_data.pop('display_name', '')
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user, display_name=display_name)
        return user


class UpdateProfileSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'profile']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.email = validated_data.get('email', instance.email)
        instance.save()
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({'new_password': "New passwords do not match."})
        return attrs


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = UserSerializer(user).data
        return data
