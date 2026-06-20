import os
import pdfplumber

def extract_to_text(pdf_files):
    for pdf_file in pdf_files:
        print(f"Extracting {pdf_file}")
        try:
            with pdfplumber.open(pdf_file) as pdf:
                full_text = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        full_text.append(text)
                
                txt_filename = pdf_file.replace('.pdf', '.txt')
                with open(txt_filename, 'w', encoding='utf-8') as f:
                    f.write("\n".join(full_text))
        except Exception as e:
            print(f"Error exploring {pdf_file}: {e}")

if __name__ == "__main__":
    files = [
        "Telangana Blood Banks Dataset - Copy.pdf",
        "Telangana Blood Banks Dataset.pdf",
        "Telangana Hospitals Dataset Compilation.pdf",
        "Telangana – Fire Stations Dataset.pdf",
        "telangana_ambulance_services.pdf",
        "telangana_disaster_management_offices.pdf",
        "telangana_emergency_control_rooms.pdf",
        "telangana_ndrf_units.pdf",
        "telangana_police_stations.pdf"
    ]
    extract_to_text(files)
