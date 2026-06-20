import urllib.request
import json
import time

BASE_URL = "http://localhost:8000/api/v1"
PHONE = "6304589007"

def make_request(url, data=None, method="POST"):
    req = urllib.request.Request(url, headers={'Content-Type': 'application/json'}, method=method)
    if data:
        req.data = json.dumps(data).encode('utf-8')
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        if hasattr(e, 'read'):
            print(f"Error from server: {e.read().decode()}")
        else:
            print(f"Connection error: {e}")
        return None

print("Getting an incident ID to use...")
incidents = make_request(f"{BASE_URL}/incidents", method="GET")
incident_id = None
if incidents and "incidents" in incidents and len(incidents["incidents"]) > 0:
    incident_id = incidents["incidents"][0]["id"]

if not incident_id:
    print("Creating a new incident...")
    incident = make_request(f"{BASE_URL}/incidents", {
        "title": "Emergency Test", "type": "other", "location": "Hyderabad", "latitude": 17.4, "longitude": 78.4, "severity": 5
    })
    if incident: 
        incident_id = incident.get("id")

if not incident_id:
    print("Could not get or create incident. Aborting.")
    exit(1)

print(f"Using incident ID: {incident_id}")

print("\n=================================")
print("1. TRIGGERING VOICE CALL")
print("=================================")
voice_res = make_request(f"{BASE_URL}/voice/call", {"phone": PHONE, "incident_id": incident_id})
if voice_res:
    print(f"Call initiated! Status: {voice_res.get('twilio_status')}")
    print(f"Call SID: {voice_res.get('twilio_sid')}")
else:
    print("Voice call failed.")

print("\n=================================")
print("2. TRIGGERING WHATSAPP NOTIFICATION")
print("=================================")
print("Executing AI Pipeline to dispatch responders...")
pipeline_res = make_request(f"{BASE_URL}/agents/execute", {"incident_id": incident_id})
if pipeline_res and "notifications_sent" in pipeline_res:
    notifications = pipeline_res["notifications_sent"]
    print(f"Successfully processed. WhatsApp notifications sent: {len(notifications)}")
    for n in notifications:
        print(f"- Sent to {n.get('responder_name')} ({n.get('phone')}). Status: {n.get('status')}")
else:
    print("Pipeline execution failed or no notifications returned.")

print("\nDemo script complete.")
