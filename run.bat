@echo off
echo Starting Poga Cakes and Pastries Application...
set PATH=%USERPROFILE%\.local\bin;%PATH%
if not exist .venv (
    echo Creating Python environment...
    uv venv
    call .venv\Scripts\activate.bat
    uv pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)
echo Launching server at http://localhost:5000...
python app.py
pause
