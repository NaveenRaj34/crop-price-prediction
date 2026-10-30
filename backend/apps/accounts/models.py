"""User profile and authentication models."""
from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """Extended profile linked to Django's built-in User model."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=150, blank=True)
    preferred_state = models.CharField(max_length=100, blank=True)
    preferred_district = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile({self.user.username})"

    @property
    def full_name(self):
        return self.display_name or self.user.get_full_name() or self.user.username
