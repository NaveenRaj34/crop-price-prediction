"""
Management command to check data quality.

Usage:
    python manage.py check_crop_data
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Check crop price data quality and availability.'

    def handle(self, *args, **options):
        from apps.agriculture.models import Crop, Market, HistoricalMarketPrice
        from apps.model_management.models import TrainedModelVersion
        import pandas as pd

        self.stdout.write('=== Crop Price Data Quality Report ===\n')

        crops = Crop.objects.filter(is_active=True).count()
        markets = Market.objects.filter(is_active=True).count()
        records = HistoricalMarketPrice.objects.count()
        demo_records = HistoricalMarketPrice.objects.filter(is_demo_data=True).count()

        self.stdout.write(f'Active Crops   : {crops}')
        self.stdout.write(f'Active Markets : {markets}')
        self.stdout.write(f'Price Records  : {records} (Demo: {demo_records})')

        if records == 0:
            self.stdout.write(self.style.ERROR('\n⚠ No price data found. Run: python manage.py load_demo_data'))
            return

        # Date range
        from apps.agriculture.models import HistoricalMarketPrice
        from django.db.models import Min, Max, Avg
        stats = HistoricalMarketPrice.objects.aggregate(
            min_date=Min('observation_date'),
            max_date=Max('observation_date'),
            avg_price=Avg('modal_price'),
        )
        self.stdout.write(f'Date Range     : {stats["min_date"]} → {stats["max_date"]}')
        self.stdout.write(f'Avg Modal Price: ₹{round(stats["avg_price"], 2) if stats["avg_price"] else "N/A"}')

        # Per crop+market coverage
        self.stdout.write('\nCrop-Market Coverage:')
        from django.db.models import Count
        coverage = HistoricalMarketPrice.objects.values(
            'crop__name', 'market__name'
        ).annotate(count=Count('id')).order_by('-count')[:10]
        for c in coverage:
            self.stdout.write(f'  {c["crop__name"]} @ {c["market__name"]}: {c["count"]} records')

        # Missing values
        null_modal = HistoricalMarketPrice.objects.filter(modal_price__isnull=True).count()
        if null_modal > 0:
            self.stdout.write(self.style.WARNING(f'\n⚠ Records with null modal_price: {null_modal}'))

        # Active model
        self.stdout.write('\nML Models:')
        active = TrainedModelVersion.objects.filter(is_active=True).first()
        if active:
            self.stdout.write(self.style.SUCCESS(
                f'  Active: {active.algorithm} v{active.version} '
                f'(RMSE: {active.metrics.get("rmse", "N/A")})'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                '  No active model found. Run: python manage.py train_crop_models'
            ))

        total_models = TrainedModelVersion.objects.count()
        self.stdout.write(f'  Total versions: {total_models}')
        self.stdout.write(self.style.SUCCESS('\n=== Check Complete ==='))
