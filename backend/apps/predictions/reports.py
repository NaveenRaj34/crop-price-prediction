"""Report generation views (CSV and PDF)."""
import csv
import io
from datetime import date
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.http import HttpResponse
from .models import PredictionRecord
import logging

logger = logging.getLogger(__name__)


def _get_user_predictions(request):
    if request.user.is_staff or request.user.is_superuser:
        return PredictionRecord.objects.select_related('crop', 'market', 'model_version').all()
    return PredictionRecord.objects.select_related('crop', 'market', 'model_version').filter(user=request.user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_predictions_csv(request):
    """Download the user's prediction history as a CSV file."""
    records = _get_user_predictions(request)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="predictions_{date.today()}.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'ID', 'Crop', 'Market', 'State', 'District',
        'Target Date', 'Predicted Price (INR)', 'Price Unit',
        'Historical Baseline Price', 'Historical Baseline Date',
        'Price Change', 'Price Change %', 'Algorithm', 'Model Version',
        'Status', 'Generated At',
        '*** DISCLAIMER: These are data-driven estimates, not guaranteed market prices. ***',
    ])

    for rec in records:
        # Escape values to prevent CSV injection
        def safe(val):
            val = str(val) if val is not None else ''
            if val and val[0] in ('=', '+', '-', '@', '\t', '\r'):
                val = "'" + val
            return val

        writer.writerow([
            safe(rec.id),
            safe(rec.crop.name if rec.crop else 'N/A'),
            safe(rec.market.name if rec.market else 'N/A'),
            safe(rec.market.state if rec.market else 'N/A'),
            safe(rec.market.district if rec.market else 'N/A'),
            safe(rec.target_date),
            safe(rec.predicted_price),
            safe(rec.price_unit),
            safe(rec.historical_baseline_price),
            safe(rec.historical_baseline_date),
            safe(rec.price_change),
            safe(rec.price_change_pct),
            safe(rec.model_version.algorithm if rec.model_version else 'N/A'),
            safe(rec.model_version.version if rec.model_version else 'N/A'),
            safe(rec.prediction_status),
            safe(rec.created_at),
            '',
        ])

    return response


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_predictions_pdf(request):
    """Download the user's prediction history as a PDF report."""
    try:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        return Response({'error': {'message': 'PDF generation library not available.'}}, status=500)

    records = list(_get_user_predictions(request)[:200])

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=1*cm, leftMargin=1*cm,
                             topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle('title', parent=styles['Heading1'], alignment=TA_CENTER,
                                  fontSize=16, textColor=colors.HexColor('#1a5c2a'))
    story.append(Paragraph('Crop Price Prediction Report', title_style))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(f'Generated on: {date.today()} | User: {request.user.username}', styles['Normal']))
    story.append(Spacer(1, 0.3*cm))

    disclaimer = ParagraphStyle('disclaimer', parent=styles['Normal'], fontSize=8,
                                 textColor=colors.orange, borderColor=colors.orange,
                                 borderWidth=1, borderPadding=4)
    story.append(Paragraph(
        '⚠ IMPORTANT: These are data-driven estimates, not guaranteed market prices. '
        'Actual prices depend on market conditions, weather, demand, and other factors.',
        disclaimer
    ))
    story.append(Spacer(1, 0.5*cm))

    # Table data
    headers = ['Crop', 'Market', 'Target Date', 'Predicted Price', 'Unit',
               'Baseline Price', 'Change %', 'Algorithm', 'Date Generated']
    data = [headers]

    for rec in records:
        data.append([
            rec.crop.name if rec.crop else 'N/A',
            f"{rec.market.name}, {rec.market.state}" if rec.market else 'N/A',
            str(rec.target_date),
            f"₹{rec.predicted_price}" if rec.predicted_price else 'N/A',
            rec.price_unit,
            f"₹{rec.historical_baseline_price}" if rec.historical_baseline_price else 'N/A',
            f"{rec.price_change_pct}%" if rec.price_change_pct else 'N/A',
            rec.model_version.algorithm.replace('_', ' ').title() if rec.model_version else 'N/A',
            str(rec.created_at.date()),
        ])

    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a5c2a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f7f0')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(table)

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        'Data Source: Historical agricultural market data | Project: Crop Price Prediction Using Data Mining and ML',
        styles['Normal']
    ))

    doc.build(story)
    buffer.seek(0)

    response = HttpResponse(buffer.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="predictions_report_{date.today()}.pdf"'
    return response
