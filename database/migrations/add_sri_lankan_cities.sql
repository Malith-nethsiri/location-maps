-- Migration: Add Sri Lankan cities for multiple cities directions feature
-- Run this manually on Railway database

-- Insert Sri Lankan cities if they don't exist
INSERT INTO cities (name, country, state, latitude, longitude, population, is_major_city, timezone)
VALUES
('Colombo', 'Sri Lanka', 'Western Province', 6.9271, 79.8612, 752993, true, 'Asia/Colombo'),
('Kandy', 'Sri Lanka', 'Central Province', 7.2906, 80.6337, 125351, true, 'Asia/Colombo'),
('Galle', 'Sri Lanka', 'Southern Province', 6.0535, 80.2210, 99478, true, 'Asia/Colombo'),
('Negombo', 'Sri Lanka', 'Western Province', 7.2083, 79.8358, 142136, true, 'Asia/Colombo'),
('Jaffna', 'Sri Lanka', 'Northern Province', 9.6615, 80.0255, 88138, true, 'Asia/Colombo')
ON CONFLICT (name, country) DO NOTHING;

-- Verify the cities were inserted
SELECT name, country, latitude, longitude,
       ROUND(
           CAST(
               6371 * acos(
                   cos(radians(7.057203)) *
                   cos(radians(latitude)) *
                   cos(radians(longitude) - radians(80.176836)) +
                   sin(radians(7.057203)) *
                   sin(radians(latitude))
               ) AS DECIMAL
           ), 2
       ) as distance_km
FROM cities
WHERE country = 'Sri Lanka'
ORDER BY distance_km;