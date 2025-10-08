@echo off
echo ================================================
echo   GedaechtnisBoost Premium - Backend Server
echo   Production-Ready FastAPI Application
echo ================================================
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo [SETUP] Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Install dependencies
echo [SETUP] Installing dependencies...
pip install -r requirements.txt --quiet
echo.

REM Check .env file
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo [INFO] Please create .env file or copy from .env.example
    echo.
    pause
    exit /b 1
)

REM Start server
echo [START] Starting FastAPI server...
echo.
echo   API: http://localhost:8001
echo   Docs: http://localhost:8001/docs
echo   Interactive API: http://localhost:8001/redoc
echo.
echo [INFO] Press CTRL+C to stop the server
echo.
echo ================================================
echo.

python main.py

pause

