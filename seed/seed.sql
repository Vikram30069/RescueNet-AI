-- =====================================================
-- RescueNet AI — Seed Data
-- Demo records for all tables
-- =====================================================

-- ---- Users ----
INSERT INTO users (id, email, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'commander@rescuenet.ai', 'Arjun Mehta', 'commander'),
  ('00000000-0000-0000-0000-000000000002', 'operator@rescuenet.ai', 'Priya Sharma', 'operator'),
  ('00000000-0000-0000-0000-000000000003', 'admin@rescuenet.ai', 'Rajan Patel', 'admin')
ON CONFLICT DO NOTHING;

-- ---- Incidents ----
INSERT INTO incidents (id, title, type, description, location, latitude, longitude, severity, status, reported_by) VALUES
  (
    'inci-0000-0000-0000-000000000001',
    'Major Flooding in South Mumbai',
    'flood',
    'Severe flooding after 3-day monsoon. Multiple residential areas submerged. Roads blocked. Reports of people stranded on rooftops.',
    'South Mumbai, Maharashtra, India',
    18.9220, 72.8347,
    4, 'active',
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    'inci-0000-0000-0000-000000000002',
    'Earthquake — Jaipur Industrial Zone',
    'earthquake',
    'Magnitude 6.2 earthquake. Industrial buildings collapsed. Multiple workers trapped.',
    'Jaipur, Rajasthan, India',
    26.9124, 75.7873,
    5, 'active',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    'inci-0000-0000-0000-000000000003',
    'Chemical Plant Fire — Pune',
    'fire',
    'Fire at chemical storage facility. Hazardous gas leak reported. 500m evacuation radius enforced.',
    'Pune, Maharashtra, India',
    18.5204, 73.8567,
    3, 'reported',
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    'inci-0000-0000-0000-000000000004',
    'Cyclone Landfall — Odisha Coast',
    'cyclone',
    'Category 3 cyclone making landfall. Coastal villages at risk. Evacuation orders issued.',
    'Puri, Odisha, India',
    19.8135, 85.8312,
    5, 'active',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    'inci-0000-0000-0000-000000000005',
    'Landslide — Himachal Highway',
    'landslide',
    'Major landslide blocking National Highway 5. Multiple vehicles buried. Rescue needed.',
    'Shimla, Himachal Pradesh, India',
    31.1048, 77.1734,
    3, 'reported',
    '00000000-0000-0000-0000-000000000002'
  )
ON CONFLICT DO NOTHING;

-- ---- Hospitals ----
INSERT INTO hospitals (id, name, address, city, latitude, longitude, total_beds, available_beds, icu_beds, specializations, contact_phone, is_active) VALUES
  (
    'hosp-0000-0000-0000-000000000001',
    'KEM Hospital',
    'Acharya Donde Marg, Parel',
    'Mumbai',
    19.0027, 72.8397,
    800, 120, 30,
    ARRAY['trauma', 'burns', 'pediatric', 'neurology'],
    '+91-22-24107000',
    TRUE
  ),
  (
    'hosp-0000-0000-0000-000000000002',
    'Nair Hospital',
    'Dr. A. L. Nair Road, Mumbai Central',
    'Mumbai',
    18.9697, 72.8196,
    650, 85, 20,
    ARRAY['trauma', 'orthopedic', 'cardiology'],
    '+91-22-23027600',
    TRUE
  ),
  (
    'hosp-0000-0000-0000-000000000003',
    'Sawai Man Singh Hospital',
    'Jawaharlal Nehru Marg',
    'Jaipur',
    26.9036, 75.7999,
    1000, 200, 45,
    ARRAY['trauma', 'burns', 'orthopedic', 'neurosurgery'],
    '+91-141-2518888',
    TRUE
  ),
  (
    'hosp-0000-0000-0000-000000000004',
    'Sassoon General Hospital',
    'Near Pune Railway Station',
    'Pune',
    18.5277, 73.8730,
    700, 95, 25,
    ARRAY['trauma', 'burns', 'toxicology'],
    '+91-20-26128000',
    TRUE
  ),
  (
    'hosp-0000-0000-0000-000000000005',
    'SCB Medical College Hospital',
    'Mangalabag',
    'Cuttack',
    20.4625, 85.8828,
    1200, 180, 50,
    ARRAY['trauma', 'orthopedic', 'cardiology', 'disaster_response'],
    '+91-671-2414388',
    TRUE
  ),
  (
    'hosp-0000-0000-0000-000000000006',
    'IGMC Shimla',
    'Ridge Road, Shimla',
    'Shimla',
    31.1008, 77.1734,
    350, 60, 15,
    ARRAY['trauma', 'orthopedic'],
    '+91-177-2658830',
    TRUE
  )
ON CONFLICT DO NOTHING;

-- ---- Resources ----
INSERT INTO resources (id, name, type, quantity, available, location, latitude, longitude, status) VALUES
  ('reso-0000-0000-0000-000000000001', 'Mumbai Ambulance Fleet A', 'ambulance', 12, 8, 'Central Dispatch, Mumbai', 19.0760, 72.8777, 'available'),
  ('reso-0000-0000-0000-000000000002', 'Air Rescue Helicopter 1', 'helicopter', 2, 1, 'Juhu Airport, Mumbai', 19.0990, 72.8490, 'available'),
  ('reso-0000-0000-0000-000000000003', 'NDRF Team Alpha', 'rescue_team', 30, 30, 'NDRF Base, Mumbai', 19.0600, 72.8350, 'available'),
  ('reso-0000-0000-0000-000000000004', 'Fire Brigade Unit 7', 'fire_truck', 6, 4, 'Dadar Fire Station, Mumbai', 19.0178, 72.8478, 'available'),
  ('reso-0000-0000-0000-000000000005', 'Jaipur Ambulance Fleet', 'ambulance', 8, 5, 'SMS Hospital Dispatch, Jaipur', 26.9036, 75.7999, 'available'),
  ('reso-0000-0000-0000-000000000006', 'Rajasthan SDRF Team', 'rescue_team', 25, 20, 'SDRF Camp, Jaipur', 26.8500, 75.7800, 'available'),
  ('reso-0000-0000-0000-000000000007', 'Odisha Coast Guard Boats', 'water_rescue', 10, 7, 'Puri Coast Guard Station', 19.8000, 85.8200, 'available'),
  ('reso-0000-0000-0000-000000000008', 'Odisha Disaster Response Force', 'rescue_team', 50, 45, 'ODRAF HQ, Bhubaneswar', 20.2961, 85.8245, 'available'),
  ('reso-0000-0000-0000-000000000009', 'HP Mountain Rescue Team', 'rescue_team', 15, 12, 'Shimla Mountain Rescue Base', 31.1048, 77.1734, 'available'),
  ('reso-0000-0000-0000-000000000010', 'Pune Medical Response Unit', 'medical_unit', 5, 3, 'Sassoon Hospital, Pune', 18.5277, 73.8730, 'available')
ON CONFLICT DO NOTHING;

-- ---- Historical Disasters ----
INSERT INTO historical_disasters (id, title, type, location, country, year, casualties, survivors, magnitude, description, source) VALUES
  (
    'hist-0000-0000-0000-000000000001',
    '2004 Indian Ocean Tsunami',
    'flood',
    'Indian Ocean Coastlines',
    'India, Sri Lanka, Thailand, Indonesia',
    2004, 227000, 500000, 9.1,
    'Massive undersea earthquake triggered devastating tsunamis across 14 countries.',
    'USGS / UN Report 2004'
  ),
  (
    'hist-0000-0000-0000-000000000002',
    '2015 Nepal Earthquake',
    'earthquake',
    'Kathmandu Valley',
    'Nepal',
    2015, 8857, 450000, 7.8,
    'Major earthquake struck near Gorkha district. Widespread destruction of Kathmandu.',
    'USGS Earthquake Hazards Program'
  ),
  (
    'hist-0000-0000-0000-000000000003',
    '1999 Odisha Super Cyclone',
    'cyclone',
    'Odisha Coast',
    'India',
    1999, 10000, 1500000, NULL,
    'Category 5 equivalent cyclone devastated the coast of Odisha. Most destructive Indian cyclone in 50 years.',
    'IMD Historical Records'
  ),
  (
    'hist-0000-0000-0000-000000000004',
    '2013 Uttarakhand Floods',
    'flood',
    'Kedarnath, Uttarakhand',
    'India',
    2013, 5700, 100000, NULL,
    'Severe flash floods and landslides. Pilgrimage season worsened casualties.',
    'NDMA India Report 2013'
  ),
  (
    'hist-0000-0000-0000-000000000005',
    '2001 Bhuj Earthquake',
    'earthquake',
    'Bhuj, Gujarat',
    'India',
    2001, 20000, 166000, 7.7,
    'Devastating earthquake on Republic Day. Entire city of Bhuj severely damaged.',
    'Geological Survey of India'
  )
ON CONFLICT DO NOTHING;

-- ---- Sample Disaster Risk Forecasts ----
INSERT INTO disaster_risk_forecasts (id, incident_id, risk_type, risk_score, confidence, forecast_window, notes) VALUES
  (
    'fore-0000-0000-0000-000000000001',
    'inci-0000-0000-0000-000000000001',
    'flood_escalation',
    0.78,
    0.82,
    'next_6h',
    'Continued rainfall in catchment areas. River levels rising. High flood escalation risk.'
  ),
  (
    'fore-0000-0000-0000-000000000002',
    'inci-0000-0000-0000-000000000002',
    'aftershock',
    0.65,
    0.75,
    'next_24h',
    'M5.0+ aftershock probable within 24 hours based on historical seismic patterns for this zone.'
  ),
  (
    'fore-0000-0000-0000-000000000003',
    'inci-0000-0000-0000-000000000003',
    'fire_spread',
    0.55,
    0.70,
    'next_1h',
    'Wind direction unfavorable. Fire spread risk moderate. Chemical storage in 200m radius.'
  )
ON CONFLICT DO NOTHING;
