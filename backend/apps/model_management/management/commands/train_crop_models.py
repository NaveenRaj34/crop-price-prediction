"""
Management command to train crop price prediction models.

Usage:
    python manage.py train_crop_models
    python manage.py train_crop_models --algorithm random_forest
    python manage.py train_crop_models --dry-run
"""
from django.core.management.base import BaseCommand
from pathlib import Path


class Command(BaseCommand):
    help = 'Train machine learning models for crop price prediction.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--algorithm',
            choices=['all', 'linear_regression', 'decision_tree', 'random_forest'],
            default='all',
            help='Which algorithm to train (default: all)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Check data availability without training',
        )

    def handle(self, *args, **options):
        from apps.agriculture.models import HistoricalMarketPrice

        record_count = HistoricalMarketPrice.objects.count()
        self.stdout.write(f'Available training records: {record_count}')

        if options['dry_run']:
            self.stdout.write(self.style.WARNING('Dry run — no models were trained.'))
            if record_count < 30:
                self.stdout.write(self.style.ERROR(
                    f'⚠ Insufficient data: need at least 30 records, found {record_count}.\n'
                    f'  Run: python manage.py load_demo_data'
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'✓ Data looks sufficient for training ({record_count} records).'
                ))
            return

        if record_count < 30:
            self.stdout.write(self.style.ERROR(
                f'ERROR: Insufficient training data ({record_count} records).\n'
                f'Load data first: python manage.py load_demo_data'
            ))
            return

        self.stdout.write('Starting model training...')
        from ml.train import train_all_models
        from django.conf import settings

        artifact_dir = Path(settings.ML_ARTIFACTS_DIR)
        result = train_all_models(artifact_dir)

        if not result['success']:
            self.stdout.write(self.style.ERROR(f'Training failed: {result.get("error")}'))
            return

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Training completed!\n'
            f'  Training rows: {result["training_rows"]}\n'
            f'  Test rows: {result["test_rows"]}\n'
            f'  Best model: {result["best_model"]} (RMSE: {result["best_rmse"]:.2f})\n'
        ))

        for name, r in result['results'].items():
            if r.get('success'):
                m = r['metrics']
                self.stdout.write(
                    f'  {name}: MAE={m["mae"]:.2f} | RMSE={m["rmse"]:.2f} | R²={m["r2"]:.4f}'
                )
            else:
                self.stdout.write(self.style.WARNING(f'  {name}: FAILED — {r.get("error")}'))
