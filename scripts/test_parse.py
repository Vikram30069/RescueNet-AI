import os
import re
import csv
import io

def parse_txt_to_csv(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    csv_lines = []
    in_csv = False
    
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        if not line_stripped:
            continue
            
        if line_stripped.startswith("id,name,"):
            in_csv = True
            # For some files the header is split! Like "google_\nmaps_link"
            # Let's accumulate header lines until we have enough commas, or just trust the next lines
            pass
            
        if in_csv:
            if line_stripped.startswith("---") or line_stripped.startswith("## ") or "(Fields with empty" in line_stripped or "Quality Control" in line_stripped:
                in_csv = False
                break
                
            # If it's a page number alone, skip
            if line_stripped.isdigit() and len(line_stripped) < 4:
                continue
                
            # Clean up known bad characters
            line_stripped = line_stripped.replace('\u3010', '[').replace('\u2705', '')
            
            # Remove line numbering if any
            line_stripped = re.sub(r'^\d+:\s*', '', line_stripped)
            
            csv_lines.append(line_stripped)
            
    # Now join all these lines. Wait, the problem is that lines are wrapped. 
    # A complete CSV row in these files might span multiple lines. 
    # A row always starts with an ID followed by a comma (e.g. `1,` or `hosp_001,`).
    
    full_csv = " ".join(csv_lines) # Not quite right, better to merge smartly
    
    merged_lines = []
    current_line = ""
    # Header is special because it starts with 'id'
    header_pattern = re.compile(r'^id,name,')
    row_pattern = re.compile(r'^([0-9]+|[a-zA-Z]+_[0-9]+),')
    
    for c_line in csv_lines:
        if header_pattern.match(c_line) or row_pattern.match(c_line):
            if current_line:
                merged_lines.append(current_line)
            current_line = c_line
        else:
            # continuation
            if current_line.endswith("?") or current_line.endswith("-"):
                 current_line += c_line
            else:
                 current_line += " " + c_line
    if current_line:
        merged_lines.append(current_line)
        
    print(f"{filepath} merged lines: {len(merged_lines)}")
    if len(merged_lines) > 0:
        print(merged_lines[0])
        if len(merged_lines) > 1:
            print(merged_lines[1])
            
    # Parse with csv
    parsed_data = []
    if merged_lines:
        reader = csv.DictReader(merged_lines)
        for row in reader:
            parsed_data.append(row)
            
    return parsed_data

if __name__ == "__main__":
    files = [
        "Telangana Blood Banks Dataset.txt",
        "Telangana Hospitals Dataset Compilation.txt",
        "Telangana – Fire Stations Dataset.txt",
        "telangana_ambulance_services.txt",
        "telangana_disaster_management_offices.txt",
        "telangana_emergency_control_rooms.txt",
        "telangana_ndrf_units.txt",
        "telangana_police_stations.txt"
    ]
    
    for file in files:
        data = parse_txt_to_csv(file)
        print(f"{file}: {len(data)} dicts.")

