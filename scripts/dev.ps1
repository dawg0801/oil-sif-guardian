# OIL-SIF Guardian Local Development Launcher
Write-Host "Starting OIL-SIF Guardian Local Development Stack..." -ForegroundColor Cyan

# 1. Start Backend in separate window
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

# 2. Start Frontend in separate window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm.cmd run dev"

Write-Host "Services launched!" -ForegroundColor Green
Write-Host "FastAPI Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor Yellow
