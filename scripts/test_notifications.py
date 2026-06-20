import requests, json, time

time.sleep(1)

# Step 1: Register responder
r1 = requests.post('http://127.0.0.1:8000/api/v1/responders/register', json={
    'name': 'Ravi Ambulance Driver',
    'phone': '6304589007',
    'asset_types': ['ambulance'],
    'district': 'Hyderabad'
})
print('Registration status:', r1.status_code)
print('Message:', r1.json().get('message'))

# Step 2: Trigger pipeline for Begumpet Flood (Hyderabad)
r2 = requests.post('http://127.0.0.1:8000/api/v1/agents/execute', json={'incident_id': 'demo-006'})
data = r2.json()
notifs = data.get('notifications_sent', [])
print('\nNotifications sent:', len(notifs))
for n in notifs:
    s = n["status"].upper()
    name = n["responder_name"]
    phone = n["phone"]
    preview = n["message_preview"][:120]
    print(f"  Status: {s} | To: {name} ({phone})")
    print(f"  Preview: {preview}")
    print()
