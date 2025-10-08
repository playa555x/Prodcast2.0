# Deployment Guide - Render.com

## Quick Deploy

1. **Automatisches Deployment via render.yaml**
   - Gehe zu https://dashboard.render.com/
   - Klicke "New" → "Blueprint"
   - Verbinde GitHub Repository: `playa555x/Prodcast2.0`
   - Render erstellt automatisch alle Services aus der `render.yaml`

## Services

### Backend (FastAPI)
- **Service Name**: prodcast-backend
- **Runtime**: Python 3
- **Port**: 8001
- **Health Check**: `/health`
- **Build**: `cd backend && pip install -r requirements.txt`
- **Start**: `cd backend && python main.py`

### Frontend (Next.js)
- **Service Name**: prodcast-frontend
- **Runtime**: Node
- **Port**: 3000
- **Build**: `cd frontend && npm install && npm run build`
- **Start**: `cd frontend && npm start`

### Database
- **Service Name**: prodcast-db
- **Type**: PostgreSQL
- **Plan**: Free

## Umgebungsvariablen

### Backend Environment Variables
```
DATABASE_URL=<automatisch von Render DB>
SECRET_KEY=<automatisch generiert>
CLAUDE_API_KEY=<dein API Key>
OPENAI_API_KEY=<dein API Key>
ELEVENLABS_API_KEY=<dein API Key>
SPEECHIFY_API_KEY=<dein API Key>
PORT=8001
```

### Frontend Environment Variables
```
NEXT_PUBLIC_API_URL=https://prodcast-backend.onrender.com
PORT=3000
```

## Nach dem Deployment

1. Backend URL: `https://prodcast-backend.onrender.com`
2. Frontend URL: `https://prodcast-frontend.onrender.com`
3. API Docs: `https://prodcast-backend.onrender.com/docs`

## Troubleshooting

### Service nicht erreichbar
- Prüfe die Logs in Render Dashboard
- Stelle sicher, dass alle ENV Variablen gesetzt sind
- Health Check sollte `/health` endpoint returnieren

### Database Connection Error
- Prüfe DATABASE_URL ist korrekt gesetzt
- Stelle sicher, dass Neon PostgreSQL aktiv ist

### Build Failed
- Prüfe dependencies in requirements.txt / package.json
- Node Version muss >= 18.0.0 sein
- Python Version sollte >= 3.9 sein

## Manual Deploy Commands

Falls Blueprint nicht funktioniert:

### Backend
```bash
# Create Web Service
- Name: prodcast-backend
- Environment: Python
- Build Command: cd backend && pip install -r requirements.txt
- Start Command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
- Health Check Path: /health
```

### Frontend
```bash
# Create Web Service
- Name: prodcast-frontend
- Environment: Node
- Build Command: cd frontend && npm install && npm run build
- Start Command: cd frontend && npm start
- Health Check Path: /
```

## Production Checklist

- [ ] Alle API Keys in Render Environment Variables gesetzt
- [ ] DATABASE_URL korrekt konfiguriert
- [ ] CORS Origins in backend/main.py enthält Render URLs
- [ ] Frontend NEXT_PUBLIC_API_URL zeigt auf Backend
- [ ] Health Checks funktionieren
- [ ] SSL/HTTPS aktiv (automatisch von Render)
