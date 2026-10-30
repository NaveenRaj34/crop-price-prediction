"""Admin registrations for agriculture models."""
from django.contrib import admin
from .models import Crop, Market, HistoricalMarketPrice, WeatherRecord, ProductionRecord


@admin.register(Crop)
class CropAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'standard_unit', 'is_active', 'created_at']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'variety']


@admin.register(Market)
class MarketAdmin(admin.ModelAdmin):
    list_display = ['name', 'district', 'state', 'is_active', 'created_at']
    list_filter = ['state', 'is_active']
    search_fields = ['name', 'district', 'state']


@admin.register(HistoricalMarketPrice)
class HistoricalMarketPriceAdmin(admin.ModelAdmin):
    list_display = ['crop', 'market', 'observation_date', 'modal_price', 'price_unit', 'is_demo_data']
    list_filter = ['crop', 'market__state', 'season', 'is_demo_data']
    search_fields = ['crop__name', 'market__name']
    date_hierarchy = 'observation_date'


@admin.register(WeatherRecord)
class WeatherRecordAdmin(admin.ModelAdmin):
    list_display = ['state', 'district', 'observation_date', 'rainfall_mm', 'temperature_celsius']
    list_filter = ['state']
    date_hierarchy = 'observation_date'


@admin.register(ProductionRecord)
class ProductionRecordAdmin(admin.ModelAdmin):
    list_display = ['crop', 'state', 'season', 'year', 'production_volume']
    list_filter = ['crop', 'state', 'year']
