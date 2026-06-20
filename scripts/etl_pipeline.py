import os
import re
import csv
import io
import hashlib
from datetime import datetime

# Configuration
FILES_MAPPING = {
    "Hospital": "Telangana Hospitals Dataset Compilation.txt",
    "Fire Station": "Telangana – Fire Stations Dataset.txt",
    "Blood Bank": "Telangana Blood Banks Dataset.txt",
    "Ambulance Service": "telangana_ambulance_services.txt",
    "Disaster Management Office": "telangana_disaster_management_offices.txt",
    "Emergency Control Room": "telangana_emergency_control_rooms.txt",
    "NDRF Unit": "telangana_ndrf_units.txt",
    "Police Station": "telangana_police_stations.txt"
}

# The single unified schema we need
MASTER_SCHEMA = [
    "id", "asset_type", "name", "district", "address", "phone", 
    "alternate_phone", "website", "latitude", "longitude", 
    "google_maps_link", "source_url", "verification_status", "confidence", 
    "created_at", "updated_at"
]

def clean_text(text):
    if not text:
        return ""
    text = text.replace('\u3010', '[').replace('\u3011', ']')
    text = text.replace('\u2705', '')
    text = text.replace('\n', ' ')
    # Fix broken headers
    if text == "s ource_url": return "source_url"
    if text == "google_ maps_link": return "google_maps_link"
    return text.strip()

def parse_txt_to_csv(filepath, default_category):
    if not os.path.exists(filepath):
        print(f"Warning: {filepath} not found.")
        return []

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    csv_lines = []
    in_csv = False
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
            
        if line_stripped.startswith("id,name,") or line_stripped.startswith("id, name,"):
            in_csv = True
            
        if in_csv:
            if line_stripped.startswith("---") or line_stripped.startswith("## ") or "(Fields with empty" in line_stripped or "Quality Control" in line_stripped:
                break
                
            if line_stripped.isdigit() and len(line_stripped) < 4:
                continue
                
            line_stripped = clean_text(line_stripped)
            line_stripped = re.sub(r'^\d+:\s*', '', line_stripped)
            
            csv_lines.append(line_stripped)
            
    merged_lines = []
    current_line = ""
    header_pattern = re.compile(r'^id,\s*name,')
    row_pattern = re.compile(r'^([0-9]{1,4}|[a-zA-Z]+_[0-9]+),')
    
    for c_line in csv_lines:
        if header_pattern.match(c_line) or row_pattern.match(c_line):
            if current_line:
                merged_lines.append(current_line)
            current_line = c_line
        else:
            if current_line.endswith("?") or current_line.endswith("-"):
                 current_line += c_line
            else:
                 current_line += " " + c_line
    if current_line:
        merged_lines.append(current_line)
        
    # Fix header if broken due to wrapping
    if merged_lines:
        # e.g., 'id,name,district,...,google_ maps_link,s ource_url' -> 'google_maps_link,source_url'
        merged_lines[0] = merged_lines[0].replace('google_ maps_link', 'google_maps_link')
        merged_lines[0] = merged_lines[0].replace('s ource_url', 'source_url')
        
    parsed_data = []
    if merged_lines:
        reader = csv.DictReader(merged_lines)
        for row in reader:
            # Inject default category if missing
            if 'category' not in row and 'asset_type' not in row:
                row['asset_type'] = default_category
            elif 'category' in row:
                row['asset_type'] = row['category']
            else:
                pass
            parsed_data.append(row)
            
    return parsed_data

def normalize_district(district):
    if not district:
        return "Unknown"
    d = district.strip().title()
    if "Hyd" in d and "Hyderabad" not in d:
        return "Hyderabad"
    if d == "Ranga Reddy" or d == "Rangareddy":
        return "Rangareddy"
    return d

def normalize_phone(phone):
    if not phone:
        return ""
    # Preserve STD codes, allow multiple separated by comma
    phones = [p.strip() for p in phone.split(',')]
    clean_phones = []
    for p in phones:
        # keep digits and '+'
        cp = re.sub(r'[^\d\+]', '', p)
        if cp:
            clean_phones.append(cp)
    return ",".join(clean_phones)

def normalize_category(cat):
    if not cat: return ""
    cat_lower = cat.lower()
    
    if "hosp" in cat_lower: return "Hospital"
    if "fire" in cat_lower: return "Fire Station"
    if "blood" in cat_lower: return "Blood Bank"
    if "police" in cat_lower: return "Police Station"
    if "ambulance" in cat_lower: return "Ambulance Service"
    if "sdrf" in cat_lower: return "SDRF Unit"
    if "ndrf" in cat_lower: return "NDRF Unit"
    if "control room" in cat_lower: return "Emergency Control Room"
    
    # Everything else related to disaster management
    if "sdma" in cat_lower or "ddma" in cat_lower or "dm cell" in cat_lower or "disaster" in cat_lower or "madmc" in cat_lower or "dm office" in cat_lower:
        return "Disaster Management Office"
        
    return cat

def is_valid_float(val):
    if not val:
        return False
    try:
        float(val)
        return True
    except ValueError:
        return False

def generate_id(asset_type, district, count):
    type_prefix = "".join([word[0] for word in asset_type.split()]).upper()
    if asset_type == "Hospital": type_prefix = "HOSP"
    elif asset_type == "Fire Station": type_prefix = "FIRE"
    elif asset_type == "Police Station": type_prefix = "POL"
    dist_prefix = district[:4].upper()
    return f"{type_prefix}_{dist_prefix}_{count:03d}"

def process_datasets():
    raw_records = []
    
    # 1. Extraction
    for category, filename in FILES_MAPPING.items():
        rows = parse_txt_to_csv(filename, category)
        for r in rows:
            raw_records.append(r)
            
    # Write Raw
    with open('emergency_assets_raw.csv', 'w', newline='', encoding='utf-8') as f:
        # Use superset of keys
        keys = set()
        for r in raw_records:
            keys.update(r.keys())
        writer = csv.DictWriter(f, fieldnames=list(keys))
        writer.writeheader()
        writer.writerows(raw_records)
        
    # 2. Transformation
    clean_records = []
    for r in raw_records:
        clean = {}
        for k in MASTER_SCHEMA:
            clean[k] = ""
            
        clean['asset_type'] = normalize_category(r.get('asset_type', r.get('category', '')))
        clean['name'] = clean_text(r.get('name', ''))
        raw_dist = r.get('district') or r.get('state_covered') or ''
        clean['district'] = normalize_district(raw_dist)
        clean['address'] = clean_text(r.get('address', ''))
        clean['phone'] = normalize_phone(r.get('phone', ''))
        clean['alternate_phone'] = normalize_phone(r.get('alternate_phone', ''))
        clean['website'] = r.get('website', '')
        
        lat = r.get('latitude', '')
        lon = r.get('longitude', '')
        clean['latitude'] = lat if is_valid_float(lat) else ""
        clean['longitude'] = lon if is_valid_float(lon) else ""
        
        clean['google_maps_link'] = r.get('google_maps_link') or ''
        clean['source_url'] = r.get('source_url') or ''
        clean['verification_status'] = (r.get('verification_status') or 'UNVERIFIED').upper()
        clean['confidence'] = (r.get('confidence') or 'LOW').upper()
        
        clean_records.append(clean)
        
    # Write Clean
    with open('emergency_assets_clean.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=MASTER_SCHEMA)
        writer.writeheader()
        writer.writerows(clean_records)
        
    # 3. Deduplication
    master_records = {}
    district_counts = {}
    
    for r in clean_records:
        # Source key: SHA1(name + district + asset_type)
        key_str = f"{r['name']}{r['district']}{r['asset_type']}".lower()
        source_key = hashlib.sha1(key_str.encode('utf-8')).hexdigest()
        
        if source_key in master_records:
            existing = master_records[source_key]
            # Resolve conflict: keep higher confidence, then VERIFIED
            conf_scores = {'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
            exist_score = conf_scores.get(existing['confidence'], 0)
            new_score = conf_scores.get(r['confidence'], 0)
            
            if new_score > exist_score:
                master_records[source_key] = r
            elif new_score == exist_score and r['verification_status'] == 'VERIFIED' and existing['verification_status'] != 'VERIFIED':
                master_records[source_key] = r
        else:
            master_records[source_key] = r
            
    final_records = []
    for source_key, r in master_records.items():
        dist = r['district']
        cat = r['asset_type']
        count_key = f"{cat}_{dist}"
        district_counts[count_key] = district_counts.get(count_key, 0) + 1
        
        r['id'] = generate_id(cat, dist, district_counts[count_key])
        r['created_at'] = datetime.now().isoformat()
        r['updated_at'] = datetime.now().isoformat()
        final_records.append(r)
        
    # Write Master
    with open('emergency_assets_master.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=MASTER_SCHEMA)
        writer.writeheader()
        writer.writerows(final_records)
        
    # 4. Generate SQL
    generate_sql(final_records)
    
    # 5. Generate Reports
    generate_reports(raw_records, clean_records, final_records)

def generate_sql(records):
    sql = []
    sql.append("-- Emergency Assets PostgreSQL Schema\n")
    
    sql.append("DROP TABLE IF EXISTS emergency_assets_raw CASCADE;")
    sql.append("DROP TABLE IF EXISTS emergency_assets_clean CASCADE;")
    sql.append("DROP TABLE IF EXISTS emergency_assets CASCADE;\n")
    
    # Minimal schema for final
    sql.append("""
CREATE TABLE emergency_assets (
    id VARCHAR(50) PRIMARY KEY,
    asset_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(100),
    alternate_phone VARCHAR(100),
    website VARCHAR(255),
    latitude FLOAT,
    longitude FLOAT,
    google_maps_link VARCHAR(255),
    source_url TEXT,
    verification_status VARCHAR(50) NOT NULL,
    confidence VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

    sql.append("""
CREATE OR REPLACE VIEW emergency_assets_verified AS
SELECT * FROM emergency_assets
WHERE verification_status = 'VERIFIED'
  AND confidence IN ('HIGH', 'MEDIUM');
""")
    
    sql.append("\n-- Insert Data\n")
    for r in records:
        cols = []
        vals = []
        for k in MASTER_SCHEMA:
            val = r.get(k, '')
            cols.append(k)
            if val == "" and k in ('latitude', 'longitude'):
                vals.append("NULL")
            else:
                # Escape quotes
                val_str = str(val).replace("'", "''")
                vals.append(f"'{val_str}'")
                
        insert_stmt = f"INSERT INTO emergency_assets ({', '.join(cols)}) VALUES ({', '.join(vals)}) ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;"
        sql.append(insert_stmt)
        
    with open('emergency_assets.sql', 'w', encoding='utf-8') as f:
        f.write("\n".join(sql))

def generate_reports(raw, clean, final):
    # Validation
    val_issues = []
    for r in final:
        if r['verification_status'] == 'VERIFIED' and not r['phone'] and not r['alternate_phone']:
            val_issues.append(f"- ID {r['id']}: VERIFIED but missing phone numbers.")
        if r['latitude'] and not r['longitude']:
            val_issues.append(f"- ID {r['id']}: Latitude exists but missing longitude.")
        if not r['district'] or r['district'] == "Unknown":
            val_issues.append(f"- ID {r['id']}: Missing or unknown district.")
            
    with open('VALIDATION_REPORT.md', 'w', encoding='utf-8') as f:
        f.write("# Data Validation Report\n\n")
        if val_issues:
            f.write("### Issues Found:\n")
            f.write("\n".join(val_issues))
        else:
            f.write("No critical validation issues found.\n")
            
    # Integration Report
    cat_dist = {}
    for r in final:
        cat_dist[r['asset_type']] = cat_dist.get(r['asset_type'], 0) + 1
        
    with open('DATA_INTEGRATION_REPORT.md', 'w', encoding='utf-8') as f:
        f.write("# Data Integration Report\n\n")
        f.write(f"- Total Raw Records Ingested: {len(raw)}\n")
        f.write(f"- Total Clean Records Generated: {len(clean)}\n")
        f.write(f"- Total Final Records (After Deduplication): {len(final)}\n")
        f.write(f"- Duplicates Removed: {len(clean) - len(final)}\n\n")
        
        f.write("### Category Distribution\n")
        for k, v in cat_dist.items():
            f.write(f"- {k}: {v}\n")
            
    # Field Mapping
    with open('FIELD_MAPPING.md', 'w', encoding='utf-8') as f:
        f.write("# Field Mapping Report\n\n")
        f.write("Maps raw fields to final unified schema fields.\n\n")
        f.write("| Raw Field | Final Field | Transformation |\n")
        f.write("|---|---|---|\n")
        f.write("| category/asset_type | asset_type | Normalized to 9 standard types |\n")
        f.write("| district | district | Title cased, spelling fixes |\n")
        f.write("| phone | phone | Stripped non-numeric chars |\n")
        f.write("| latitude | latitude | Float casting, invalid to NULL |\n")
        

if __name__ == "__main__":
    process_datasets()
    print("ETL complete.")
