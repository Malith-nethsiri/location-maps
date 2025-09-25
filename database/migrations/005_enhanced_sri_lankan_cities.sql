-- Migration: 005_enhanced_sri_lankan_cities.sql
-- Created: 2025-09-25
-- Description: Enhanced Sri Lankan cities with district and province data for cost optimization

BEGIN;

-- First, ensure we have the complete cities from the previous migration
\i 003_import_sri_lankan_cities.sql

-- Now update cities with district and province information
-- Based on Sri Lankan administrative divisions

-- Update major cities with proper district and province data
UPDATE cities SET
    district = 'Colombo',
    province = 'Western Province',
    population = 752993,
    population_tier = 'major'
WHERE name = 'Colombo' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Kandy',
    province = 'Central Province',
    population = 125351,
    population_tier = 'large'
WHERE name = 'Kandy' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Galle',
    province = 'Southern Province',
    population = 99478,
    population_tier = 'medium'
WHERE name = 'Galle' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Gampaha',
    province = 'Western Province',
    population = 142136,
    population_tier = 'large'
WHERE name = 'Negombo' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Jaffna',
    province = 'Northern Province',
    population = 88138,
    population_tier = 'medium'
WHERE name = 'Jaffna' AND country = 'Sri Lanka';

-- Update other major cities
UPDATE cities SET
    district = 'Trincomalee',
    province = 'Eastern Province',
    population = 99135,
    population_tier = 'medium'
WHERE name = 'Trincomalee' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Batticaloa',
    province = 'Eastern Province',
    population = 95489,
    population_tier = 'medium'
WHERE name = 'Batticaloa' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Ratnapura',
    province = 'Sabaragamuwa Province',
    population = 52170,
    population_tier = 'medium'
WHERE name = 'Ratnapura' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Anuradhapura',
    province = 'North Central Province',
    population = 63208,
    population_tier = 'medium'
WHERE name = 'Anuradhapura' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Polonnaruwa',
    province = 'North Central Province',
    population = 15421,
    population_tier = 'small'
WHERE name = 'Polonnaruwa' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Matara',
    province = 'Southern Province',
    population = 58925,
    population_tier = 'medium'
WHERE name = 'Matara' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Hambantota',
    province = 'Southern Province',
    population = 11000,
    population_tier = 'small'
WHERE name = 'Hambantota' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Kurunegala',
    province = 'North Western Province',
    population = 28337,
    population_tier = 'small'
WHERE name = 'Kurunegala' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Puttalam',
    province = 'North Western Province',
    population = 45661,
    population_tier = 'medium'
WHERE name = 'Puttalam' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Badulla',
    province = 'Uva Province',
    population = 42142,
    population_tier = 'medium'
WHERE name = 'Badulla' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Bandarawela',
    province = 'Uva Province',
    population = 18334,
    population_tier = 'small'
WHERE name = 'Bandarawela' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Nuwara Eliya',
    province = 'Central Province',
    population = 25055,
    population_tier = 'small'
WHERE name = 'Nuwara Eliya' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Matale',
    province = 'Central Province',
    population = 39405,
    population_tier = 'medium'
WHERE name = 'Dambulla' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Vavuniya',
    province = 'Northern Province',
    population = 22203,
    population_tier = 'small'
WHERE name = 'Vavuniya' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Mannar',
    province = 'Northern Province',
    population = 17651,
    population_tier = 'small'
WHERE name = 'Mannar' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Kalutara',
    province = 'Western Province',
    population = 37982,
    population_tier = 'medium'
WHERE name = 'Kalutara' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Ampara',
    province = 'Eastern Province',
    population = 20448,
    population_tier = 'small'
WHERE name = 'Ampara' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Kegalle',
    province = 'Sabaragamuwa Province',
    population = 25178,
    population_tier = 'small'
WHERE name = 'Kegalle' AND country = 'Sri Lanka';

UPDATE cities SET
    district = 'Monaragala',
    province = 'Uva Province',
    population = 10960,
    population_tier = 'small'
WHERE name = 'Monaragala' AND country = 'Sri Lanka';

-- Update remaining cities with estimated district/province based on coordinates and common patterns
-- Western Province cities (around Colombo area: lat 6.5-7.5, lon 79.5-80.5)
UPDATE cities SET
    district = CASE
        WHEN latitude BETWEEN 6.8 AND 7.2 AND longitude BETWEEN 79.8 AND 80.1 THEN 'Colombo'
        WHEN latitude BETWEEN 6.9 AND 7.4 AND longitude BETWEEN 79.7 AND 80.0 THEN 'Gampaha'
        WHEN latitude BETWEEN 6.4 AND 6.9 AND longitude BETWEEN 79.8 AND 80.3 THEN 'Kalutara'
        ELSE 'Colombo'
    END,
    province = 'Western Province'
WHERE country = 'Sri Lanka'
    AND district IS NULL
    AND latitude BETWEEN 6.4 AND 7.4
    AND longitude BETWEEN 79.5 AND 80.3;

-- Central Province cities (around Kandy area: lat 6.8-7.8, lon 80.0-81.0)
UPDATE cities SET
    district = CASE
        WHEN latitude BETWEEN 7.1 AND 7.4 AND longitude BETWEEN 80.4 AND 80.8 THEN 'Kandy'
        WHEN latitude BETWEEN 6.8 AND 7.2 AND longitude BETWEEN 80.4 AND 80.9 THEN 'Nuwara Eliya'
        WHEN latitude BETWEEN 7.3 AND 7.7 AND longitude BETWEEN 80.4 AND 80.8 THEN 'Matale'
        ELSE 'Kandy'
    END,
    province = 'Central Province'
WHERE country = 'Sri Lanka'
    AND district IS NULL
    AND latitude BETWEEN 6.8 AND 7.8
    AND longitude BETWEEN 80.0 AND 81.0;

-- Southern Province cities (lat 5.8-6.8, lon 80.0-81.5)
UPDATE cities SET
    district = CASE
        WHEN latitude BETWEEN 6.0 AND 6.2 AND longitude BETWEEN 80.1 AND 80.3 THEN 'Galle'
        WHEN latitude BETWEEN 5.9 AND 6.2 AND longitude BETWEEN 80.5 AND 81.0 THEN 'Matara'
        WHEN latitude BETWEEN 6.0 AND 6.4 AND longitude BETWEEN 80.8 AND 81.3 THEN 'Hambantota'
        ELSE 'Galle'
    END,
    province = 'Southern Province'
WHERE country = 'Sri Lanka'
    AND district IS NULL
    AND latitude BETWEEN 5.8 AND 6.8
    AND longitude BETWEEN 80.0 AND 81.5;

-- Eastern Province cities (lat 6.8-9.0, lon 81.0-82.0)
UPDATE cities SET
    district = CASE
        WHEN latitude BETWEEN 8.4 AND 8.8 AND longitude BETWEEN 81.0 AND 81.3 THEN 'Trincomalee'
        WHEN latitude BETWEEN 7.6 AND 8.0 AND longitude BETWEEN 81.6 AND 81.9 THEN 'Batticaloa'
        WHEN latitude BETWEEN 7.0 AND 7.6 AND longitude BETWEEN 81.4 AND 81.9 THEN 'Ampara'
        ELSE 'Batticaloa'
    END,
    province = 'Eastern Province'
WHERE country = 'Sri Lanka'
    AND district IS NULL
    AND latitude BETWEEN 6.8 AND 9.0
    AND longitude BETWEEN 81.0 AND 82.0;

-- Northern Province cities (lat 8.5-10.0, lon 79.5-81.0)
UPDATE cities SET
    district = CASE
        WHEN latitude BETWEEN 9.4 AND 9.8 AND longitude BETWEEN 80.0 AND 80.1 THEN 'Jaffna'
        WHEN latitude BETWEEN 8.6 AND 9.0 AND longitude BETWEEN 80.4 AND 80.6 THEN 'Vavuniya'
        WHEN latitude BETWEEN 8.9 AND 9.2 AND longitude BETWEEN 79.8 AND 80.1 THEN 'Mannar'
        WHEN latitude BETWEEN 8.2 AND 8.7 AND longitude BETWEEN 80.2 AND 80.6 THEN 'Mullaitivu'
        ELSE 'Jaffna'
    END,
    province = 'Northern Province'
WHERE country = 'Sri Lanka'
    AND district IS NULL
    AND latitude BETWEEN 8.5 AND 10.0
    AND longitude BETWEEN 79.5 AND 81.0;

-- North Western Province cities
UPDATE cities SET
    district = CASE
        WHEN latitude BETWEEN 7.3 AND 7.6 AND longitude BETWEEN 80.3 AND 80.6 THEN 'Kurunegala'
        WHEN latitude BETWEEN 7.8 AND 8.4 AND longitude BETWEEN 79.7 AND 80.1 THEN 'Puttalam'
        ELSE 'Kurunegala'
    END,
    province = 'North Western Province'
WHERE country = 'Sri Lanka'
    AND district IS NULL
    AND latitude BETWEEN 7.3 AND 8.4
    AND longitude BETWEEN 79.7 AND 80.6;

-- North Central Province cities
UPDATE cities SET
    district = CASE
        WHEN latitude BETWEEN 8.0 AND 8.5 AND longitude BETWEEN 80.2 AND 80.6 THEN 'Anuradhapura'
        WHEN latitude BETWEEN 7.8 AND 8.2 AND longitude BETWEEN 80.8 AND 81.2 THEN 'Polonnaruwa'
        ELSE 'Anuradhapura'
    END,
    province = 'North Central Province'
WHERE country = 'Sri Lanka'
    AND district IS NULL
    AND latitude BETWEEN 7.8 AND 8.5
    AND longitude BETWEEN 80.2 AND 81.2;

-- Uva Province cities
UPDATE cities SET
    district = CASE
        WHEN latitude BETWEEN 6.9 AND 7.2 AND longitude BETWEEN 81.0 AND 81.2 THEN 'Badulla'
        WHEN latitude BETWEEN 6.2 AND 6.8 AND longitude BETWEEN 81.2 AND 81.6 THEN 'Monaragala'
        ELSE 'Badulla'
    END,
    province = 'Uva Province'
WHERE country = 'Sri Lanka'
    AND district IS NULL
    AND latitude BETWEEN 6.2 AND 7.2
    AND longitude BETWEEN 81.0 AND 81.6;

-- Sabaragamuwa Province cities
UPDATE cities SET
    district = CASE
        WHEN latitude BETWEEN 6.6 AND 7.0 AND longitude BETWEEN 80.2 AND 80.6 THEN 'Ratnapura'
        WHEN latitude BETWEEN 7.0 AND 7.4 AND longitude BETWEEN 80.1 AND 80.4 THEN 'Kegalle'
        ELSE 'Ratnapura'
    END,
    province = 'Sabaragamuwa Province'
WHERE country = 'Sri Lanka'
    AND district IS NULL
    AND latitude BETWEEN 6.6 AND 7.4
    AND longitude BETWEEN 80.1 AND 80.6;

-- Set default values for any remaining cities without district/province
UPDATE cities SET
    district = 'Other',
    province = 'Other'
WHERE country = 'Sri Lanka'
    AND (district IS NULL OR province IS NULL);

-- Update population tiers based on known population data and city importance
UPDATE cities SET population_tier =
    CASE
        WHEN name IN ('Colombo') THEN 'major'
        WHEN name IN ('Kandy', 'Negombo', 'Galle', 'Trincomalee', 'Batticaloa') THEN 'large'
        WHEN name IN ('Jaffna', 'Ratnapura', 'Anuradhapura', 'Matara', 'Puttalam', 'Badulla', 'Kalutara', 'Dambulla', 'Nuwara Eliya', 'Kegalle', 'Kurunegala') THEN 'medium'
        WHEN is_major_city = true THEN 'medium'
        ELSE 'small'
    END
WHERE country = 'Sri Lanka';

-- Set reasonable population estimates for cities without population data
UPDATE cities SET population =
    CASE population_tier
        WHEN 'major' THEN 500000 + FLOOR(RANDOM() * 500000)
        WHEN 'large' THEN 80000 + FLOOR(RANDOM() * 120000)
        WHEN 'medium' THEN 20000 + FLOOR(RANDOM() * 60000)
        WHEN 'small' THEN 5000 + FLOOR(RANDOM() * 25000)
        ELSE 2000 + FLOOR(RANDOM() * 8000)
    END
WHERE country = 'Sri Lanka' AND population IS NULL;

COMMIT;