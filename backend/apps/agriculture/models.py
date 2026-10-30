"""Core agricultural data models: Crop, Market, HistoricalMarketPrice, etc."""
from django.db import models


class Crop(models.Model):
    """Represents a crop type supported by the system."""
    CATEGORY_CHOICES = [
        ('cereal', 'Cereal'),
        ('vegetable', 'Vegetable'),
        ('fruit', 'Fruit'),
        ('pulse', 'Pulse'),
        ('oilseed', 'Oilseed'),
        ('spice', 'Spice'),
        ('fiber', 'Fiber'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=150, unique=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    variety = models.CharField(max_length=150, blank=True, help_text='Specific variety if applicable')
    standard_unit = models.CharField(max_length=50, default='Quintal', help_text='Standard price unit (e.g., Quintal, Kg)')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [models.Index(fields=['name']), models.Index(fields=['category'])]

    def __str__(self):
        return self.name


class Market(models.Model):
    """Represents an agricultural market location."""
    name = models.CharField(max_length=200)
    state = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    location_details = models.CharField(max_length=255, blank=True)
    data_source = models.CharField(max_length=100, blank=True, default='Manual/CSV Import')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['state', 'district', 'name']
        unique_together = [('name', 'district', 'state')]
        indexes = [
            models.Index(fields=['state']),
            models.Index(fields=['district']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f"{self.name}, {self.district}, {self.state}"


class HistoricalMarketPrice(models.Model):
    """Historical crop price observations at a specific market."""
    SEASON_CHOICES = [
        ('kharif', 'Kharif'),
        ('rabi', 'Rabi'),
        ('zaid', 'Zaid'),
        ('annual', 'Annual'),
        ('unknown', 'Unknown'),
    ]

    crop = models.ForeignKey(Crop, on_delete=models.CASCADE, related_name='price_records')
    market = models.ForeignKey(Market, on_delete=models.CASCADE, related_name='price_records')
    observation_date = models.DateField(db_index=True)
    min_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True,
                                    help_text='Minimum price in INR per standard unit')
    max_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    modal_price = models.DecimalField(max_digits=12, decimal_places=2,
                                      help_text='Modal (most common) price — used as target for ML')
    currency = models.CharField(max_length=10, default='INR')
    price_unit = models.CharField(max_length=50, default='Quintal')
    season = models.CharField(max_length=20, choices=SEASON_CHOICES, default='unknown')
    rainfall = models.FloatField(null=True, blank=True, help_text='Rainfall in mm')
    temperature = models.FloatField(null=True, blank=True, help_text='Temperature in Celsius')
    arrivals = models.FloatField(null=True, blank=True, help_text='Market arrivals in tonnes')
    production = models.FloatField(null=True, blank=True, help_text='Production in tonnes')
    yield_per_hectare = models.FloatField(null=True, blank=True)
    data_source = models.CharField(max_length=100, default='CSV Import')
    is_demo_data = models.BooleanField(default=False, help_text='True for synthetic demonstration data')
    import_batch = models.ForeignKey(
        'datasets.DatasetImport', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='price_records'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-observation_date']
        indexes = [
            models.Index(fields=['crop', 'market', 'observation_date']),
            models.Index(fields=['observation_date']),
            models.Index(fields=['crop']),
            models.Index(fields=['market']),
        ]
        # Prevent exact duplicates from same source batch
        unique_together = [('crop', 'market', 'observation_date', 'data_source')]

    def __str__(self):
        return f"{self.crop.name} @ {self.market.name} on {self.observation_date}: ₹{self.modal_price}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.modal_price is not None and self.modal_price < 0:
            raise ValidationError('modal_price cannot be negative.')
        if self.min_price is not None and self.min_price < 0:
            raise ValidationError('min_price cannot be negative.')
        if self.max_price is not None and self.max_price < 0:
            raise ValidationError('max_price cannot be negative.')


class WeatherRecord(models.Model):
    """Weather observation for a location and date."""
    state = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True)
    observation_date = models.DateField()
    rainfall_mm = models.FloatField(null=True, blank=True)
    temperature_celsius = models.FloatField(null=True, blank=True)
    humidity_percent = models.FloatField(null=True, blank=True)
    data_source = models.CharField(max_length=100, default='Manual/CSV')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-observation_date']
        unique_together = [('state', 'district', 'observation_date')]

    def __str__(self):
        return f"Weather({self.state}, {self.district}, {self.observation_date})"


class ProductionRecord(models.Model):
    """Crop production data for a region and season."""
    UNIT_CHOICES = [('tonne', 'Tonne'), ('quintal', 'Quintal'), ('kg', 'Kilogram')]

    crop = models.ForeignKey(Crop, on_delete=models.CASCADE, related_name='production_records')
    state = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True)
    season = models.CharField(max_length=50)
    year = models.PositiveIntegerField()
    production_volume = models.FloatField(null=True, blank=True)
    yield_per_hectare = models.FloatField(null=True, blank=True)
    area_hectares = models.FloatField(null=True, blank=True)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='tonne')
    data_source = models.CharField(max_length=100, default='Manual/CSV')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-year', 'crop', 'state']
        unique_together = [('crop', 'state', 'district', 'season', 'year')]

    def __str__(self):
        return f"Production({self.crop.name}, {self.state}, {self.year})"
