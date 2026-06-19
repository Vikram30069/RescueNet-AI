"""
RescueNet AI — Standalone Agent Pipeline Test
Run this to test the 10-agent CrewAI pipeline without the API server.

Usage:
  python scripts/run_agents.py
"""

import os
import sys
import json

# Add agents directory to path
agents_dir = os.path.join(os.path.dirname(__file__), "../agents")
agents_dir = os.path.abspath(agents_dir)
sys.path.insert(0, agents_dir)

# Load .env from project root
try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), "../.env")
    load_dotenv(dotenv_path=env_path)
    print(f"[Runner] Loaded .env from {env_path}")
except ImportError:
    print("[Runner] python-dotenv not available — using system environment variables")

provider = os.getenv("LLM_PROVIDER", "mock")
print(f"[Runner] LLM Provider: {provider}")

# Import and run the orchestrator
from orchestrator import run_rescue_pipeline

# Use the demo flood incident
demo_incident = {
    "id": "demo-001",
    "title": "Major Flooding in South Mumbai",
    "type": "flood",
    "description": "Severe flooding after 3-day monsoon. Multiple residential areas submerged.",
    "location": "South Mumbai, Maharashtra, India",
    "latitude": 18.922,
    "longitude": 72.8347,
    "severity": 4,
    "status": "active",
}

print("\n" + "="*60)
print("Running 10-agent rescue pipeline...")
print("="*60)

result = run_rescue_pipeline(demo_incident)

print("\n" + "="*60)
print("RESCUE PLAN RESULT:")
print("="*60)
print(json.dumps(result, indent=2))
print("\n[Runner] Done.")
