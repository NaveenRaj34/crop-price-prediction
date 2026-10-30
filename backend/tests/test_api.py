"""
Backend API tests for the Crop Price Prediction application.
Run: cd backend && source venv/bin/activate && pytest tests/ -v
"""
import pytest
import json
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='testuser', email='test@example.com', password='TestPass@123'
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        username='testadmin', email='admin@example.com', password='AdminPass@123'
    )


@pytest.fixture
def auth_client(api_client, user):
    """Authenticated client for a regular user."""
    response = api_client.post('/api/v1/auth/login/', {
        'username': 'testuser', 'password': 'TestPass@123'
    }, format='json')
    assert response.status_code == status.HTTP_200_OK, f"Login failed: {response.data}"
    token = response.data['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """Authenticated client for an admin user."""
    response = api_client.post('/api/v1/auth/login/', {
        'username': 'testadmin', 'password': 'AdminPass@123'
    }, format='json')
    assert response.status_code == status.HTTP_200_OK
    token = response.data['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def sample_crop(db):
    from apps.agriculture.models import Crop
    return Crop.objects.create(name='Test Paddy', category='cereal', standard_unit='Quintal')


@pytest.fixture
def sample_market(db):
    from apps.agriculture.models import Market
    return Market.objects.create(name='Test Market', state='Tamil Nadu', district='Chennai')


@pytest.fixture
def sample_prices(db, sample_crop, sample_market):
    """Create 60 days of price data for testing."""
    from apps.agriculture.models import HistoricalMarketPrice
    from datetime import date, timedelta
    import random

    prices = []
    base_date = date.today() - timedelta(days=60)
    for i in range(60):
        prices.append(HistoricalMarketPrice(
            crop=sample_crop,
            market=sample_market,
            observation_date=base_date + timedelta(days=i),
            modal_price=2000 + random.uniform(-200, 200),
            min_price=1800,
            max_price=2200,
            season='kharif',
            temperature=30.0,
            rainfall=100.0,
            arrivals=150.0,
            price_unit='Quintal',
            currency='INR',
            is_demo_data=True,
        ))
    HistoricalMarketPrice.objects.bulk_create(prices)
    return prices


# ─── Authentication Tests ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAuthentication:

    def test_register_user(self, api_client):
        """Test user registration returns tokens."""
        response = api_client.post('/api/v1/auth/register/', {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'NewPass@123',
            'password2': 'NewPass@123',
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['username'] == 'newuser'

    def test_register_mismatched_passwords(self, api_client):
        """Test registration fails when passwords don't match."""
        response = api_client.post('/api/v1/auth/register/', {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'NewPass@123',
            'password2': 'DIFFERENT',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_success(self, api_client, user):
        """Test successful login returns JWT tokens."""
        response = api_client.post('/api/v1/auth/login/', {
            'username': 'testuser', 'password': 'TestPass@123'
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['username'] == 'testuser'

    def test_login_wrong_password(self, api_client, user):
        """Test login fails with wrong password."""
        response = api_client.post('/api/v1/auth/login/', {
            'username': 'testuser', 'password': 'WRONG'
        }, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_me_authenticated(self, auth_client):
        """Test /me/ returns user data when authenticated."""
        response = auth_client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['data']['username'] == 'testuser'

    def test_get_me_unauthenticated(self, api_client):
        """Test /me/ returns 401 when not authenticated."""
        response = api_client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout(self, auth_client, user):
        """Test logout blacklists the refresh token."""
        # Get a fresh token pair
        res = auth_client.post('/api/v1/auth/login/', {
            'username': 'testuser', 'password': 'TestPass@123'
        }, format='json')
        refresh = res.data['refresh']
        response = auth_client.post('/api/v1/auth/logout/', {'refresh': refresh}, format='json')
        assert response.status_code == status.HTTP_200_OK


# ─── Agriculture Tests ────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCropsAPI:

    def test_list_crops_unauthenticated(self, api_client, sample_crop):
        """Test crop listing requires authentication."""
        response = api_client.get('/api/v1/crops/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_crops_authenticated(self, auth_client, sample_crop):
        """Test authenticated user can list crops."""
        response = auth_client.get('/api/v1/crops/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_crop_detail(self, auth_client, sample_crop):
        """Test crop detail endpoint returns correct data."""
        response = auth_client.get(f'/api/v1/crops/{sample_crop.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Test Paddy'
        assert response.data['category'] == 'cereal'

    def test_create_crop_as_admin(self, admin_client):
        """Test admin can create a crop."""
        response = admin_client.post('/api/v1/crops/', {
            'name': 'Admin Wheat', 'category': 'cereal', 'standard_unit': 'Quintal'
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Admin Wheat'

    def test_create_crop_as_user_forbidden(self, auth_client):
        """Test regular user cannot create crops."""
        response = auth_client.post('/api/v1/crops/', {
            'name': 'User Crop', 'category': 'cereal', 'standard_unit': 'Quintal'
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_search_crops(self, auth_client, sample_crop):
        """Test crop search by name."""
        response = auth_client.get('/api/v1/crops/?search=Test')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1


@pytest.mark.django_db
class TestMarketsAPI:

    def test_list_markets(self, auth_client, sample_market):
        response = auth_client.get('/api/v1/markets/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_market_detail(self, auth_client, sample_market):
        response = auth_client.get(f'/api/v1/markets/{sample_market.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Test Market'
        assert response.data['state'] == 'Tamil Nadu'

    def test_filter_markets_by_state(self, auth_client, sample_market):
        response = auth_client.get('/api/v1/markets/?state=Tamil Nadu')
        assert response.status_code == status.HTTP_200_OK
        for m in response.data['results']:
            assert m['state'] == 'Tamil Nadu'


@pytest.mark.django_db
class TestPriceAPI:

    def test_list_prices(self, auth_client, sample_prices):
        response = auth_client.get('/api/v1/prices/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_price_trends(self, auth_client, sample_crop, sample_market, sample_prices):
        response = auth_client.get(
            f'/api/v1/prices/trends/?crop_id={sample_crop.id}&market_id={sample_market.id}&days=60'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert len(response.data['data']) > 0

    def test_price_compare(self, auth_client, sample_crop, sample_market, sample_prices):
        response = auth_client.get(f'/api/v1/prices/compare/?crop_id={sample_crop.id}')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert len(response.data['data']) >= 1

    def test_price_trends_missing_params(self, auth_client):
        response = auth_client.get('/api/v1/prices/trends/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ─── Analytics Tests ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAnalyticsAPI:

    def test_dashboard_analytics(self, auth_client):
        response = auth_client.get('/api/v1/analytics/dashboard/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        data = response.data['data']
        assert 'crop_count' in data
        assert 'market_count' in data
        assert 'price_record_count' in data

    def test_seasonality_analysis(self, auth_client, sample_prices):
        response = auth_client.get('/api/v1/analytics/seasonality/')
        assert response.status_code == status.HTTP_200_OK
        assert 'monthly' in response.data['data']
        assert 'by_season' in response.data['data']

    def test_model_performance(self, auth_client):
        response = auth_client.get('/api/v1/analytics/model-performance/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True


# ─── Prediction Tests ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPredictionsAPI:

    def test_list_predictions_empty(self, auth_client, user):
        response = auth_client.get('/api/v1/predictions/history/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0

    def test_predict_no_model(self, auth_client, sample_crop, sample_market, sample_prices):
        """Prediction without a trained active model returns no_model status."""
        import datetime
        response = auth_client.post('/api/v1/predictions/', {
            'crop_id': sample_crop.id,
            'market_id': sample_market.id,
            'target_date': (datetime.date.today() + datetime.timedelta(days=7)).isoformat(),
        }, format='json')
        # Should return 200 or 201 with status field in result
        assert response.status_code in (200, 201)

    def test_predict_invalid_past_date(self, auth_client, sample_crop, sample_market):
        """Prediction with a past target date should be rejected."""
        import datetime
        response = auth_client.post('/api/v1/predictions/', {
            'crop_id': sample_crop.id,
            'market_id': sample_market.id,
            'target_date': '2020-01-01',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_predict_nonexistent_crop(self, auth_client, sample_market):
        """Prediction with invalid crop ID should fail validation."""
        import datetime
        response = auth_client.post('/api/v1/predictions/', {
            'crop_id': 99999,
            'market_id': sample_market.id,
            'target_date': (datetime.date.today() + datetime.timedelta(days=7)).isoformat(),
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_cannot_predict(self, api_client, sample_crop, sample_market):
        """Unauthenticated user cannot make predictions."""
        import datetime
        response = api_client.post('/api/v1/predictions/', {
            'crop_id': sample_crop.id,
            'market_id': sample_market.id,
            'target_date': (datetime.date.today() + datetime.timedelta(days=7)).isoformat(),
        }, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ─── Admin API Tests ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAdminModelManagement:

    def test_list_models_admin_only(self, user, admin_user):
        from rest_framework.test import APIClient

        # 1. Unauthenticated client
        anon = APIClient()
        r1 = anon.get('/api/v1/admin/models/')
        assert r1.status_code in (
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN
        ), f'Anon access should be denied, got {r1.status_code}'

        # 2. Regular authenticated user
        regular = APIClient()
        res = regular.post('/api/v1/auth/login/', {
            'username': 'testuser', 'password': 'TestPass@123'
        }, format='json')
        regular.credentials(HTTP_AUTHORIZATION=f'Bearer {res.data["access"]}')
        r2 = regular.get('/api/v1/admin/models/')
        assert r2.status_code == status.HTTP_403_FORBIDDEN, \
            f'Regular user should be denied, got {r2.status_code}'

        # 3. Admin user
        admin = APIClient()
        res2 = admin.post('/api/v1/auth/login/', {
            'username': 'testadmin', 'password': 'AdminPass@123'
        }, format='json')
        admin.credentials(HTTP_AUTHORIZATION=f'Bearer {res2.data["access"]}')
        r3 = admin.get('/api/v1/admin/models/')
        assert r3.status_code == status.HTTP_200_OK

    def test_trigger_training_admin(self, admin_client, sample_prices):
        """Admin can trigger model training."""
        response = admin_client.post('/api/v1/admin/models/train/')
        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.data['success'] is True

    def test_list_datasets_admin(self, admin_client):
        response = admin_client.get('/api/v1/admin/datasets/')
        assert response.status_code == status.HTTP_200_OK


# ─── Health Check ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestHealthCheck:

    def test_health_endpoint(self, api_client):
        response = api_client.get('/api/health/')
        assert response.status_code == status.HTTP_200_OK
        # Health endpoint may return JsonResponse (dict) or DRF response
        import json
        if hasattr(response, 'data'):
            data = response.data
        else:
            data = json.loads(response.content)
        assert data.get('status') in ('healthy', 'ok')
