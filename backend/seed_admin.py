"""
Seed script: Create a default superuser admin if none exists.

Run: python manage.py runscript seed_admin  (or inline as below)
Usage:
    source venv/bin/activate
    python manage.py shell < seed_admin.py
"""
import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User

ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_EMAIL    = os.environ.get('ADMIN_EMAIL',    'admin@cropcast.local')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin@1234')

if User.objects.filter(username=ADMIN_USERNAME).exists():
    print(f'[seed_admin] Superuser "{ADMIN_USERNAME}" already exists — skipping.')
else:
    User.objects.create_superuser(ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD)
    print(f'[seed_admin] Created superuser: username={ADMIN_USERNAME}  password={ADMIN_PASSWORD}')
    print('[seed_admin] ⚠ Change this password immediately in production!')
