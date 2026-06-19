"""
RescueNet AI — Backend Runner Script
Run this from the project root to start the FastAPI development server.

Usage:
  python scripts/run_backend.py
"""

import os
import sys
import subprocess

# Add the backend directory to path
backend_dir = os.path.join(os.path.dirname(__file__), "../backend")
backend_dir = os.path.abspath(backend_dir)

print("=" * 60)
print("  RescueNet AI — Backend Server")
print("=" * 60)
print(f"  Working directory: {backend_dir}")
print(f"  API docs will be at: http://localhost:8000/docs")
print("=" * 60)

os.chdir(backend_dir)

subprocess.run([
    sys.executable, "-m", "uvicorn",
    "app.main:app",
    "--reload",
    "--host", "0.0.0.0",
    "--port", "8000",
])
