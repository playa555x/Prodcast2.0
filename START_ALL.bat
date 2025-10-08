@echo off
echo ============================================================
echo   GedaechtnisBoost Premium - Local Development Start
echo ============================================================
echo.

REM Kill existing processes on ports 8001 and 3001
echo Checking for existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do (
    echo Killing process on port 8001...
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    echo Killing process on port 3001...
    taskkill /F /PID %%a 2>nul
)

echo.
echo Starting Backend (Port 8001)...
start "Backend - FastAPI" cmd /k "cd backend && python main.py"

timeout /t 3 >nul

echo Starting Frontend (Port 3001)...
start "Frontend - Next.js" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================================
echo   Both services started!
echo ============================================================
echo   Backend:  http://localhost:8001
echo   API Docs: http://localhost:8001/docs
echo   Frontend: http://localhost:3001
echo ============================================================
echo.
echo Press any key to stop all services...
pause >nul

echo.
echo Stopping all services...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do (
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /F /PID %%a 2>nul
)

echo All services stopped.
