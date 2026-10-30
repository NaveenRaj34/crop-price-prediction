"""
CSV Import Service for crop price data.

Canonical CSV columns:
    date           - Observation date (YYYY-MM-DD or DD/MM/YYYY)
    crop           - Crop name
    variety        - Crop variety (optional)
    state          - State name
    district       - District name
    market         - Market name
    min_price      - Minimum price (numeric)
    max_price      - Maximum price (numeric)
    modal_price    - Modal/representative price (numeric, REQUIRED)
    price_unit     - Unit (default: Quintal)
    currency       - Currency (default: INR)
    season         - Season (kharif/rabi/zaid/annual/unknown)
    rainfall       - Rainfall in mm (optional)
    temperature    - Temperature in Celsius (optional)
    arrivals       - Market arrivals in tonnes (optional)
    data_source    - Source identifier (optional)
"""
import io
import logging
from datetime import date
from decimal import Decimal, InvalidOperation

import pandas as pd
from django.db import transaction
from django.utils import timezone

from apps.agriculture.models import Crop, Market, HistoricalMarketPrice
from apps.datasets.models import DatasetImport

logger = logging.getLogger(__name__)

# Required columns in the canonical schema
REQUIRED_COLUMNS = {'date', 'crop', 'state', 'district', 'market', 'modal_price'}

# Optional columns with defaults
OPTIONAL_COLUMNS = {
    'variety': '',
    'min_price': None,
    'max_price': None,
    'price_unit': 'Quintal',
    'currency': 'INR',
    'season': 'unknown',
    'rainfall': None,
    'temperature': None,
    'arrivals': None,
    'data_source': 'CSV Import',
}

VALID_SEASONS = {'kharif', 'rabi', 'zaid', 'annual', 'unknown'}


def validate_csv(file_obj, column_mapping: dict = None) -> dict:
    """
    Validate a CSV file without committing to the database.
    Returns a validation report with errors, warnings, and a preview.
    """
    report = {
        'valid': False,
        'total_rows': 0,
        'issues': [],
        'missing_required': [],
        'preview': [],
        'column_names': [],
    }
    try:
        content = file_obj.read()
        df = pd.read_csv(io.BytesIO(content), dtype=str)
    except Exception as e:
        report['issues'].append(f'Cannot parse CSV: {e}')
        return report

    df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]
    if column_mapping:
        df.rename(columns={k.lower(): v for k, v in column_mapping.items()}, inplace=True)

    report['column_names'] = list(df.columns)
    report['total_rows'] = len(df)

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        report['missing_required'] = list(missing)
        report['issues'].append(f'Missing required columns: {", ".join(missing)}')
        return report

    # Check a sample of rows
    errors = []
    for idx, row in df.head(5).iterrows():
        row_num = idx + 2
        row_errors = _validate_row(row, row_num)
        errors.extend(row_errors)

    report['issues'] = errors
    report['valid'] = len(errors) == 0
    report['preview'] = df.head(10).fillna('').to_dict(orient='records')
    return report


def import_csv(file_obj, import_record: DatasetImport, column_mapping: dict = None) -> DatasetImport:
    """
    Parse and import a CSV file into HistoricalMarketPrice records.
    Updates the DatasetImport record with results.
    """
    import_record.status = 'validating'
    import_record.save(update_fields=['status'])

    try:
        content = file_obj.read() if hasattr(file_obj, 'read') else open(file_obj, 'rb').read()
        df = pd.read_csv(io.BytesIO(content), dtype=str)
    except Exception as e:
        import_record.status = 'failed'
        import_record.error_summary = {'parse_error': str(e)}
        import_record.completed_at = timezone.now()
        import_record.save()
        return import_record

    # Normalize column names
    df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]
    if column_mapping:
        df.rename(columns={k.strip().lower(): v for k, v in column_mapping.items()}, inplace=True)

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        import_record.status = 'failed'
        import_record.error_summary = {'missing_columns': list(missing)}
        import_record.completed_at = timezone.now()
        import_record.save()
        return import_record

    import_record.total_rows = len(df)
    import_record.status = 'importing'
    import_record.save(update_fields=['total_rows', 'status'])

    accepted = 0
    rejected = 0
    duplicates = 0
    errors = []

    crop_cache = {}
    market_cache = {}

    with transaction.atomic():
        for idx, row in df.iterrows():
            row_num = idx + 2
            row_errors = _validate_row(row, row_num)
            if row_errors:
                rejected += 1
                if len(errors) < 1000:
                    errors.extend(row_errors)
                continue

            try:
                parsed = _parse_row(row)
            except Exception as e:
                rejected += 1
                if len(errors) < 1000:
                    errors.append({'row': row_num, 'error': str(e)})
                continue

            # Get or create Crop
            crop_key = parsed['crop_name'].lower()
            if crop_key not in crop_cache:
                crop, _ = Crop.objects.get_or_create(
                    name__iexact=parsed['crop_name'],
                    defaults={
                        'name': parsed['crop_name'],
                        'standard_unit': parsed['price_unit'],
                    }
                )
                crop_cache[crop_key] = crop
            crop = crop_cache[crop_key]

            # Get or create Market
            market_key = (parsed['market_name'].lower(), parsed['district'].lower(), parsed['state'].lower())
            if market_key not in market_cache:
                market, _ = Market.objects.get_or_create(
                    name__iexact=parsed['market_name'],
                    district__iexact=parsed['district'],
                    state__iexact=parsed['state'],
                    defaults={
                        'name': parsed['market_name'],
                        'district': parsed['district'],
                        'state': parsed['state'],
                        'data_source': parsed['data_source'],
                    }
                )
                market_cache[market_key] = market
            market = market_cache[market_key]

            try:
                HistoricalMarketPrice.objects.create(
                    crop=crop,
                    market=market,
                    observation_date=parsed['date'],
                    min_price=parsed['min_price'],
                    max_price=parsed['max_price'],
                    modal_price=parsed['modal_price'],
                    currency=parsed['currency'],
                    price_unit=parsed['price_unit'],
                    season=parsed['season'],
                    rainfall=parsed['rainfall'],
                    temperature=parsed['temperature'],
                    arrivals=parsed['arrivals'],
                    data_source=parsed['data_source'],
                    import_batch=import_record,
                )
                accepted += 1
            except Exception as e:
                err_msg = str(e)
                if 'UNIQUE constraint' in err_msg or 'unique constraint' in err_msg.lower():
                    duplicates += 1
                else:
                    rejected += 1
                    if len(errors) < 1000:
                        errors.append({'row': row_num, 'error': err_msg})

    import_record.accepted_rows = accepted
    import_record.rejected_rows = rejected
    import_record.duplicate_rows = duplicates
    import_record.error_report = errors
    import_record.error_summary = {
        'total': len(errors),
        'sample_errors': errors[:5],
    }
    import_record.status = 'completed'
    import_record.completed_at = timezone.now()
    import_record.save()

    logger.info('Import %d completed: %d accepted, %d rejected, %d duplicates',
                import_record.id, accepted, rejected, duplicates)
    return import_record


def _validate_row(row, row_num: int) -> list:
    errors = []
    # Date
    date_val = str(row.get('date', '')).strip()
    if not date_val or date_val == 'nan':
        errors.append({'row': row_num, 'field': 'date', 'error': 'Missing date'})
    else:
        try:
            _parse_date(date_val)
        except ValueError:
            errors.append({'row': row_num, 'field': 'date', 'error': f'Invalid date format: {date_val}'})

    # Crop
    if not str(row.get('crop', '')).strip() or str(row.get('crop', '')).strip() == 'nan':
        errors.append({'row': row_num, 'field': 'crop', 'error': 'Missing crop name'})

    # Modal price
    modal = str(row.get('modal_price', '')).strip()
    if not modal or modal == 'nan':
        errors.append({'row': row_num, 'field': 'modal_price', 'error': 'Missing modal_price'})
    else:
        try:
            val = float(modal.replace(',', ''))
            if val < 0:
                errors.append({'row': row_num, 'field': 'modal_price', 'error': 'Price cannot be negative'})
        except ValueError:
            errors.append({'row': row_num, 'field': 'modal_price', 'error': f'Non-numeric price: {modal}'})

    return errors


def _parse_row(row) -> dict:
    def optional_float(val):
        s = str(val).strip()
        if not s or s.lower() == 'nan':
            return None
        try:
            return float(s.replace(',', ''))
        except ValueError:
            return None

    season = str(row.get('season', 'unknown')).strip().lower()
    if season not in VALID_SEASONS:
        season = 'unknown'

    return {
        'date': _parse_date(str(row['date']).strip()),
        'crop_name': str(row['crop']).strip().title(),
        'variety': str(row.get('variety', '')).strip() if str(row.get('variety', '')).strip() != 'nan' else '',
        'state': str(row['state']).strip().title(),
        'district': str(row['district']).strip().title(),
        'market_name': str(row['market']).strip().title(),
        'modal_price': Decimal(str(float(str(row['modal_price']).replace(',', '')))),
        'min_price': Decimal(str(optional_float(row.get('min_price')))) if optional_float(row.get('min_price')) is not None else None,
        'max_price': Decimal(str(optional_float(row.get('max_price')))) if optional_float(row.get('max_price')) is not None else None,
        'price_unit': str(row.get('price_unit', 'Quintal')).strip() or 'Quintal',
        'currency': str(row.get('currency', 'INR')).strip() or 'INR',
        'season': season,
        'rainfall': optional_float(row.get('rainfall')),
        'temperature': optional_float(row.get('temperature')),
        'arrivals': optional_float(row.get('arrivals')),
        'data_source': str(row.get('data_source', 'CSV Import')).strip() or 'CSV Import',
    }


def _parse_date(date_str: str) -> date:
    """Parse dates in multiple common formats."""
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%d-%b-%Y', '%Y/%m/%d'):
        try:
            from datetime import datetime
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise ValueError(f'Cannot parse date: {date_str}')
