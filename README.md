# Crop Price Prediction Using Data Mining and Machine Learning

**CropCast** — a full-stack web application applying data mining and machine learning to agricultural market price data.

## ⚠️ Disclaimer

All predictions are **data-driven estimates only**. The demo dataset is **entirely synthetic** (labeled `is_demo_data=True`). Do not use predictions as the sole basis for financial decisions.

## Quick Start

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python seed_admin.py          # admin / Admin@1234
python manage.py load_demo_data
python manage.py train_crop_models
python manage.py runserver 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # → http://localhost:5173
```

## URLs

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Landing page |
| http://localhost:5173/dashboard | Dashboard |
| http://localhost:5173/predict | Price prediction |
| http://localhost:5173/admin | Admin panel |
| http://localhost:8000/api/docs/ | Swagger API docs |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend**: Django 4.2 + Django REST Framework + SimpleJWT
- **ML**: Scikit-learn (Linear Regression, Decision Tree, Random Forest)
- **DB**: SQLite (dev) / PostgreSQL (prod)

## Running Tests

```bash
cd backend && source venv/bin/activate
python -m pytest tests/ -v   # 44 tests
```

## ML Pipeline

1. **Feature Engineering**: lag prices (7/30/90 days), rolling averages, date features
2. **Training**: 80/20 chronological split, three candidate models
3. **Evaluation**: MAE, RMSE, R², MAPE — best RMSE model auto-selected
4. **Prediction**: Active model loaded from disk for inference

## CSV Data Format

Required columns: `date, crop, state, district, market, modal_price`

Optional: `min_price, max_price, price_unit, season, rainfall, temperature, arrivals`

## Default Credentials

- **Admin**: `admin` / `Admin@1234` ← Change in production!
- Register new user accounts via http://localhost:5173/register
