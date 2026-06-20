import os
import pdfplumber

def explore_pdfs(pdf_files):
    for pdf_file in pdf_files:
        print(f"--- Exploring: {pdf_file} ---")
        try:
            with pdfplumber.open(pdf_file) as pdf:
                if len(pdf.pages) > 0:
                    first_page = pdf.pages[0]
                    tables = first_page.extract_tables()
                    if tables:
                        print(f"Found {len(tables)} tables on page 1.")
                        for i, table in enumerate(tables):
                            print(f"Table {i+1} headers: {table[0] if table else 'Empty'}")
                            print(f"Table {i+1} first row: {table[1] if len(table) > 1 else 'No rows'}")
                    else:
                        print("No tables found. Extracting text instead:")
                        text = first_page.extract_text()
                        print(text[:500] if text else "No text found.")
        except Exception as e:
            print(f"Error exploring {pdf_file}: {e}")
        print("\n")

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
    explore_pdfs(files)
