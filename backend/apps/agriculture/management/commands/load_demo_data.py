"""
Management command to load demonstration crop price data.

Usage:
    python manage.py load_demo_data
    python manage.py load_demo_data --clear
"""
import random
import math
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.agriculture.models import Crop, Market, HistoricalMarketPrice


DEMO_CROPS = [
    {'name': 'Paddy', 'category': 'cereal', 'standard_unit': 'Quintal'},
    {'name': 'Wheat', 'category': 'cereal', 'standard_unit': 'Quintal'},
    {'name': 'Maize', 'category': 'cereal', 'standard_unit': 'Quintal'},
    {'name': 'Tomato', 'category': 'vegetable', 'standard_unit': 'Quintal'},
    {'name': 'Onion', 'category': 'vegetable', 'standard_unit': 'Quintal'},
    {'name': 'Potato', 'category': 'vegetable', 'standard_unit': 'Quintal'},
    {'name': 'Groundnut', 'category': 'oilseed', 'standard_unit': 'Quintal'},
    {'name': 'Cotton', 'category': 'fiber', 'standard_unit': 'Quintal'},
    {'name': 'Turmeric', 'category': 'spice', 'standard_unit': 'Quintal'},
    {'name': 'Chilli', 'category': 'spice', 'standard_unit': 'Quintal'},
]

DEMO_MARKETS = [
    {'name': 'Koyambedu', 'state': 'Tamil Nadu', 'district': 'Chennai'},
    {'name': 'Uzhavar Sandhai', 'state': 'Tamil Nadu', 'district': 'Coimbatore'},
    {'name': 'Erode Market', 'state': 'Tamil Nadu', 'district': 'Erode'},
    {'name': 'Madurai Market', 'state': 'Tamil Nadu', 'district': 'Madurai'},
    {'name': 'Trichy Market', 'state': 'Tamil Nadu', 'district': 'Tiruchirappalli'},
    {'name': 'APMC Bengaluru', 'state': 'Karnataka', 'district': 'Bengaluru Urban'},
    {'name': 'Nashik Market', 'state': 'Maharashtra', 'district': 'Nashik'},
    {'name': 'Azadpur Mandi', 'state': 'Delhi', 'district': 'Delhi'},
]

# Base prices (INR per Quintal) with seasonal multipliers
CROP_BASE_PRICES = {
    'Paddy': 2000, 'Wheat': 2200, 'Maize': 1800, 'Tomato': 2500,
    'Onion': 2000, 'Potato': 1500, 'Groundnut': 5500, 'Cotton': 6000,
    'Turmeric': 8000, 'Chilli': 9000,
}


def generate_price_series(crop_name: str, market_name: str, start_date: date, num_days: int):
    """Generate a realistic synthetic price time series with seasonal patterns."""
    base_price = CROP_BASE_PRICES.get(crop_name, 3000)
    random.seed(hash(f"{crop_name}_{market_name}") % (2**31))

    # Market variation (±20%)
    market_factor = 0.85 + random.random() * 0.30

    records = []
    price = base_price * market_factor
    trend = 0

    for i in range(num_days):
        current_date = start_date + timedelta(days=i)
        month = current_date.month

        # Seasonal sinusoidal pattern
        seasonal = 0.15 * math.sin(2 * math.pi * (month - 3) / 12)

        # Random walk
        price_change = random.gauss(0, base_price * 0.02)
        trend += random.gauss(0, 0.001)
        trend = max(-0.01, min(0.01, trend))

        price = price * (1 + trend + price_change / price)
        price = max(base_price * 0.3, min(base_price * 3.0, price))

        seasonal_price = price * (1 + seasonal)
        modal_price = round(seasonal_price, 2)
        min_price = round(modal_price * random.uniform(0.85, 0.95), 2)
        max_price = round(modal_price * random.uniform(1.05, 1.20), 2)

        # Determine season
        if month in (6, 7, 8, 9, 10):
            season = 'kharif'
        elif month in (11, 12, 1, 2, 3):
            season = 'rabi'
        else:
            season = 'zaid'

        records.append({
            'observation_date': current_date,
            'modal_price': modal_price,
            'min_price': min_price,
            'max_price': max_price,
            'season': season,
            'rainfall': round(random.uniform(0, 200), 1) if month in (6, 7, 8, 9) else round(random.uniform(0, 30), 1),
            'temperature': round(random.uniform(18, 42), 1),
            'arrivals': round(random.uniform(50, 500), 1),
        })

    return records


class Command(BaseCommand):
    help = 'Load synthetic demonstration data for crops and markets.'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing demo data first')
        parser.add_argument('--days', type=int, default=730, help='Days of history to generate (default: 730)')
        parser.add_argument('--skip-prices', action='store_true', help='Only create crops and markets, not prices')

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing demo data...')
            HistoricalMarketPrice.objects.filter(is_demo_data=True).delete()
            self.stdout.write(self.style.WARNING('Demo price data cleared.'))

        self.stdout.write('Creating demonstration crops...')
        crops = {}
        for crop_data in DEMO_CROPS:
            crop, created = Crop.objects.get_or_create(
                name=crop_data['name'],
                defaults=crop_data,
            )
            crops[crop.name] = crop
            status = 'created' if created else 'exists'
            self.stdout.write(f'  {crop.name}: {status}')

        self.stdout.write('Creating demonstration markets...')
        markets = {}
        for market_data in DEMO_MARKETS:
            market, created = Market.objects.get_or_create(
                name=market_data['name'],
                district=market_data['district'],
                state=market_data['state'],
                defaults={**market_data, 'data_source': 'Demo Data'},
            )
            markets[market.name] = market
            status = 'created' if created else 'exists'
            self.stdout.write(f'  {market.name}: {status}')

        if options['skip_prices']:
            self.stdout.write(self.style.SUCCESS('Crops and markets created. Skipping price generation.'))
            return

        num_days = options['days']
        start_date = date.today() - timedelta(days=num_days)
        total_created = 0

        # Generate prices for a representative subset
        selected_crops = list(crops.values())[:5]
        selected_markets = list(markets.values())[:4]

        self.stdout.write(f'Generating {num_days} days of price data...')
        with transaction.atomic():
            for crop in selected_crops:
                for market in selected_markets:
                    price_series = generate_price_series(crop.name, market.name, start_date, num_days)
                    batch = []
                    for price_data in price_series:
                        batch.append(HistoricalMarketPrice(
                            crop=crop,
                            market=market,
                            observation_date=price_data['observation_date'],
                            modal_price=price_data['modal_price'],
                            min_price=price_data['min_price'],
                            max_price=price_data['max_price'],
                            season=price_data['season'],
                            rainfall=price_data['rainfall'],
                            temperature=price_data['temperature'],
                            arrivals=price_data['arrivals'],
                            price_unit='Quintal',
                            currency='INR',
                            data_source='Demo Data (Synthetic)',
                            is_demo_data=True,
                        ))

                    # Bulk create, skip existing
                    try:
                        HistoricalMarketPrice.objects.bulk_create(batch, ignore_conflicts=True)
                        total_created += len(batch)
                        self.stdout.write(f'  {crop.name} @ {market.name}: {len(batch)} records')
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'  {crop.name} @ {market.name}: {e}'))

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Demo data loaded successfully!'
            f'\n  Crops: {len(crops)}'
            f'\n  Markets: {len(markets)}'
            f'\n  Price records attempted: {total_created}'
            f'\n\n⚠ NOTE: All price data is SYNTHETIC and for demonstration only.'
            f'\n  These are NOT real market prices. Label: is_demo_data=True'
        ))
