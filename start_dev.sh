#!/usr/bin/env bash
# CropCast — Development Startup Script
set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()    { echo -e "${BLUE}[CropCast]${NC} $1"; }
success(){ echo -e "${GREEN}[✓]${NC} $1"; }

log "Activating backend..."
cd "$BACKEND_DIR"
source venv/bin/activate
python manage.py migrate -q

COUNT=$(python manage.py shell -c \
  "from apps.agriculture.models import HistoricalMarketPrice; print(HistoricalMarketPrice.objects.count())" 2>/dev/null || echo 0)
if [ "$COUNT" -lt "100" ]; then
  log "Loading demo data..."
  python manage.py load_demo_data
else
  success "Found $COUNT price records — skipping demo load."
fi

log "Starting Django on http://localhost:8000..."
python manage.py runserver 8000 &
BACKEND_PID=$!

log "Starting Vite on http://localhost:5173..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

sleep 2
echo -e "\n${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN} CropCast is ready!${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "  Frontend : ${BLUE}http://localhost:5173${NC}"
echo -e "  API Docs : ${BLUE}http://localhost:8000/api/docs/${NC}"
echo -e "  Login    : ${YELLOW}admin / Admin@1234${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}\n"
echo "Press Ctrl+C to stop all servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" INT TERM
wait
