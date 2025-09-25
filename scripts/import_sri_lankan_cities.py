#!/usr/bin/env python3
"""
Sri Lankan Cities Data Import Script
Converts JSON data to SQL migration for PostgreSQL with PostGIS
"""

import json
import sys
import os
from pathlib import Path

def clean_value(value):
    """Clean NULL values and escape single quotes"""
    if value is None or value == "NULL" or value == "":
        return None
    return str(value).replace("'", "''")

def generate_sql_migration(json_file_path, output_file_path):
    """Generate SQL migration from JSON data"""

    print(f"Reading JSON data from: {json_file_path}")

    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            cities_data = json.load(f)
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        return False

    print(f"Loaded {len(cities_data)} cities")

    # Generate SQL migration
    sql_content = """-- Migration: Import Complete Sri Lankan Cities Dataset
-- Source: https://github.com/SKIDDOW/SriLankaCitiesDatabase
-- Total Cities: {total_cities}
-- Generated: {timestamp}

-- Delete existing Sri Lankan cities to avoid duplicates
DELETE FROM cities WHERE country = 'Sri Lanka';

-- Insert complete Sri Lankan cities dataset
INSERT INTO cities (
    name,
    country,
    state,
    latitude,
    longitude,
    population,
    is_major_city,
    timezone
) VALUES
""".format(
        total_cities=len(cities_data),
        timestamp=os.system("date")
    )

    values = []
    major_cities = {
        'Colombo', 'Kandy', 'Galle', 'Negombo', 'Jaffna', 'Trincomalee',
        'Batticaloa', 'Ratnapura', 'Anuradhapura', 'Polonnaruwa', 'Matara',
        'Hambantota', 'Kurunegala', 'Puttalam', 'Badulla', 'Bandarawela',
        'Nuwara Eliya', 'Dambulla', 'Sigiriya', 'Vavuniya', 'Mannar'
    }

    for city in cities_data:
        try:
            # Extract values
            name_en = clean_value(city.get('name_en'))
            latitude = float(city.get('latitude', 0))
            longitude = float(city.get('longitude', 0))

            # Skip invalid coordinates
            if latitude == 0 or longitude == 0:
                print(f"Skipping {name_en} - invalid coordinates")
                continue

            # Validate coordinate ranges for Sri Lanka
            if not (5.5 <= latitude <= 10.0 and 79.0 <= longitude <= 82.0):
                print(f"Warning: {name_en} coordinates ({latitude}, {longitude}) outside Sri Lanka bounds")

            # Determine if major city
            is_major = name_en in major_cities if name_en else False

            # Set population estimate based on major city status
            population = 100000 if is_major else None

            # Create SQL value tuple
            value = f"('{name_en}', 'Sri Lanka', 'Sri Lanka', {latitude}, {longitude}, {population or 'NULL'}, {str(is_major).lower()}, 'Asia/Colombo')"
            values.append(value)

        except Exception as e:
            print(f"Error processing city {city.get('id', 'unknown')}: {e}")
            continue

    # Join all values
    sql_content += ',\n'.join(values)
    sql_content += "\nON CONFLICT (name, country) DO UPDATE SET\n"
    sql_content += "    latitude = EXCLUDED.latitude,\n"
    sql_content += "    longitude = EXCLUDED.longitude,\n"
    sql_content += "    state = EXCLUDED.state,\n"
    sql_content += "    population = EXCLUDED.population,\n"
    sql_content += "    is_major_city = EXCLUDED.is_major_city;\n\n"

    # Add verification query
    sql_content += """-- Verify import
SELECT
    COUNT(*) as total_cities,
    COUNT(CASE WHEN is_major_city THEN 1 END) as major_cities,
    MIN(latitude) as min_lat,
    MAX(latitude) as max_lat,
    MIN(longitude) as min_lng,
    MAX(longitude) as max_lng
FROM cities
WHERE country = 'Sri Lanka';

-- Sample query: Find cities near Colombo (within 50km)
SELECT name, latitude, longitude,
    ROUND(ST_Distance(
        geom,
        ST_SetSRID(ST_MakePoint(79.8612, 6.9271), 4326)::geography
    ) / 1000, 2) as distance_km
FROM cities
WHERE country = 'Sri Lanka'
    AND ST_DWithin(
        geom,
        ST_SetSRID(ST_MakePoint(79.8612, 6.9271), 4326)::geography,
        50000
    )
ORDER BY distance_km
LIMIT 10;
"""

    # Write SQL file
    try:
        with open(output_file_path, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        print(f"SQL migration generated: {output_file_path}")
        print(f"Successfully processed {len(values)} cities")
        return True
    except Exception as e:
        print(f"Error writing SQL file: {e}")
        return False

def main():
    # File paths
    project_root = Path(__file__).parent.parent
    json_file = project_root / "sri_lanka_cities.json"
    sql_file = project_root / "database" / "migrations" / "003_import_sri_lankan_cities.sql"

    if not json_file.exists():
        print(f"JSON file not found: {json_file}")
        return 1

    # Ensure output directory exists
    sql_file.parent.mkdir(parents=True, exist_ok=True)

    # Generate migration
    success = generate_sql_migration(json_file, sql_file)

    if success:
        print("\n✅ Sri Lankan cities migration generated successfully!")
        print(f"📁 Migration file: {sql_file}")
        print("\nNext steps:")
        print("1. Review the generated SQL file")
        print("2. Apply the migration to your database")
        print("3. Verify the import with the included queries")
        return 0
    else:
        print("\n❌ Failed to generate migration")
        return 1

if __name__ == "__main__":
    sys.exit(main())