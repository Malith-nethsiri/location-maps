# API Documentation

## Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: `https://your-railway-backend.railway.app/api`

## Authentication
Currently, the API does not require authentication. All endpoints are publicly accessible with rate limiting.

## Rate Limiting
- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Handling
All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "metadata": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Endpoints

### Health Check

#### GET /health
Check API health and status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-09-23T10:30:00.000Z",
    "uptime": 3600,
    "environment": "production",
    "version": "1.0.0",
    "services": {
      "database": "connected",
      "redis": "connected",
      "google_maps": "available"
    }
  }
}
```

### Location Analysis

#### POST /location/analyze
Perform comprehensive location analysis including geocoding, nearby POIs, and satellite imagery.

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 5000,
  "includeCategories": ["school", "hospital", "government"]
}
```

**Parameters:**
- `latitude` (number, required): Latitude (-90 to 90)
- `longitude` (number, required): Longitude (-180 to 180)
- `radius` (number, optional): Search radius in meters (100-50000, default: 5000)
- `includeCategories` (array, optional): POI categories to include

**Response:**
```json
{
  "success": true,
  "data": {
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "address": {
      "formatted_address": "New York, NY, USA",
      "address_components": {
        "city": "New York",
        "state": "New York",
        "country": "United States",
        "postal_code": "10001"
      }
    },
    "nearest_city": {
      "name": "New York",
      "country": "United States",
      "state": "New York",
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "distance_km": 0.5,
      "population": 8336817
    },
    "points_of_interest": [
      {
        "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
        "name": "Example School",
        "category": "school",
        "coordinates": {
          "latitude": 40.7130,
          "longitude": -74.0065
        },
        "address": "123 Main St, New York, NY",
        "rating": 4.5,
        "user_ratings_total": 150,
        "distance_meters": 250
      }
    ],
    "satellite_imagery": {
      "image_url": "https://maps.googleapis.com/maps/api/staticmap?...",
      "metadata": {
        "center": {
          "latitude": 40.7128,
          "longitude": -74.0060
        },
        "zoom": 15,
        "size": "400x400"
      }
    },
    "search_radius": 5000,
    "total_pois_found": 25,
    "response_time_ms": 1250
  }
}
```

#### POST /location/geocode
Convert coordinates to human-readable address.

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "formatted_address": "New York, NY, USA",
    "address_components": {
      "street_number": "123",
      "route": "Main Street",
      "city": "New York",
      "state": "New York",
      "country": "United States",
      "postal_code": "10001"
    },
    "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "types": ["locality", "political"]
  }
}
```

#### GET /location/satellite/:lat/:lng
Get satellite imagery for specific coordinates.

**Parameters:**
- `lat` (number): Latitude
- `lng` (number): Longitude
- `zoom` (number, query): Zoom level (1-20, default: 15)
- `size` (string, query): Image size (default: "400x400")

**Response:**
```json
{
  "success": true,
  "data": {
    "image_url": "https://maps.googleapis.com/maps/api/staticmap?...",
    "metadata": {
      "center": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "zoom": 15,
      "size": "400x400",
      "maptype": "satellite"
    }
  }
}
```

#### GET /location/nearest-city/:lat/:lng
Find the nearest major city to given coordinates.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "New York",
    "country": "United States",
    "state": "New York",
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "distance_km": 5.2,
    "population": 8336817,
    "timezone": "America/New_York"
  }
}
```

### Points of Interest (POI)

#### POST /poi/search
Search for nearby POIs.

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 5000,
  "categories": ["school", "hospital"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pois": [
      {
        "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
        "name": "Example School",
        "category": "school",
        "subcategory": "primary_school",
        "coordinates": {
          "latitude": 40.7130,
          "longitude": -74.0065
        },
        "address": "123 Main St, New York, NY",
        "phone_number": "+1-555-123-4567",
        "website": "https://example-school.edu",
        "rating": 4.5,
        "user_ratings_total": 150,
        "business_status": "OPERATIONAL",
        "distance_meters": 250
      }
    ],
    "total_found": 1,
    "search_parameters": {
      "center": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "radius": 5000,
      "categories": ["school", "hospital"]
    }
  }
}
```

#### GET /poi/categories
Get available POI categories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "school",
      "name": "Schools",
      "description": "Educational institutions including primary, secondary, and higher education",
      "google_types": ["school", "university", "primary_school", "secondary_school"]
    }
  ]
}
```

#### GET /poi/:id
Get detailed information about a specific POI.

**Response:**
```json
{
  "success": true,
  "data": {
    "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
    "name": "Example School",
    "category": "school",
    "coordinates": {
      "latitude": 40.7130,
      "longitude": -74.0065
    },
    "address": "123 Main St, New York, NY 10001",
    "phone_number": "+1-555-123-4567",
    "website": "https://example-school.edu",
    "rating": 4.5,
    "user_ratings_total": 150,
    "business_status": "OPERATIONAL",
    "opening_hours": {
      "open_now": true,
      "periods": [...],
      "weekday_text": [...]
    },
    "reviews": [...]
  }
}
```

#### POST /poi/distances
Calculate distances from origin to multiple destinations.

**Request Body:**
```json
{
  "origin": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "destinations": [
    {
      "latitude": 40.7130,
      "longitude": -74.0065
    }
  ],
  "units": "metric"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "origin": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "distances": [
      {
        "destination_index": 0,
        "destination": {
          "latitude": 40.7130,
          "longitude": -74.0065
        },
        "distance": {
          "text": "0.3 km",
          "value": 250
        },
        "duration": {
          "text": "3 mins",
          "value": 180
        },
        "status": "OK"
      }
    ],
    "units": "metric",
    "total_destinations": 1
  }
}
```

### Navigation

#### POST /navigation/directions
Get turn-by-turn directions using Google Routes API.

**Request Body:**
```json
{
  "origin": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "destination": {
    "latitude": 40.7829,
    "longitude": -73.9654
  },
  "travelMode": "DRIVE",
  "units": "metric"
}
```

**Parameters:**
- `origin` (object, required): Origin coordinates
- `destination` (object, required): Destination coordinates
- `travelMode` (string, optional): DRIVE, WALK, BICYCLE, TRANSIT (default: DRIVE)
- `units` (string, optional): metric, imperial (default: metric)

**Response:**
```json
{
  "success": true,
  "data": {
    "origin": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "destination": {
      "latitude": 40.7829,
      "longitude": -73.9654
    },
    "travel_mode": "DRIVE",
    "distance": {
      "meters": 12500,
      "text": "12.5 km"
    },
    "duration": {
      "seconds": 1800,
      "text": "30m"
    },
    "polyline": "encoded_polyline_string",
    "steps": [
      {
        "step_number": 1,
        "instruction": "Head north on Main St",
        "distance": {
          "text": "0.5 km",
          "value": 500
        },
        "duration": {
          "text": "2 mins",
          "value": 120
        },
        "maneuver": "straight"
      }
    ],
    "overview": "Take Main St north to Central Park"
  },
  "metadata": {
    "requested_at": "2025-09-23T10:30:00.000Z",
    "travel_mode": "DRIVE",
    "units": "metric"
  }
}
```

#### POST /navigation/route-to-city
Get directions from coordinates to nearest major city.

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "travelMode": "DRIVE",
  "units": "metric"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nearest_city": {
      "name": "New York",
      "country": "United States",
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "distance_km": 5.2
    },
    "route": {
      // Same format as /navigation/directions response
    }
  }
}
```

#### POST /navigation/matrix
Get distance matrix between multiple origins and destinations.

**Request Body:**
```json
{
  "origins": [
    {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  ],
  "destinations": [
    {
      "latitude": 40.7829,
      "longitude": -73.9654
    }
  ],
  "travelMode": "DRIVE",
  "units": "metric"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "origins": [...],
    "destinations": [...],
    "travel_mode": "DRIVE",
    "units": "metric",
    "rows": [
      {
        "origin_index": 0,
        "origin": {
          "latitude": 40.7128,
          "longitude": -74.0060
        },
        "elements": [
          {
            "destination_index": 0,
            "destination": {
              "latitude": 40.7829,
              "longitude": -73.9654
            },
            "distance": {
              "text": "12.5 km",
              "value": 12500
            },
            "duration": {
              "text": "30 mins",
              "value": 1800
            },
            "status": "OK"
          }
        ]
      }
    ]
  }
}
```

#### GET /navigation/travel-modes
Get available travel modes.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "DRIVE",
      "name": "Driving",
      "description": "Driving directions using roads suitable for automobiles",
      "icon": "car"
    },
    {
      "id": "WALK",
      "name": "Walking",
      "description": "Walking directions using pedestrian paths and sidewalks",
      "icon": "walk"
    }
  ]
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400  | Bad Request - Invalid input parameters |
| 401  | Unauthorized - API key missing or invalid |
| 403  | Forbidden - Access denied |
| 404  | Not Found - Resource not found |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error - Server error |
| 503  | Service Unavailable - External API unavailable |

## Data Types

### Coordinates
```typescript
{
  latitude: number;  // -90 to 90
  longitude: number; // -180 to 180
}
```

### POI Categories
- `school` - Educational institutions
- `hospital` - Healthcare facilities
- `government` - Government buildings
- `religious` - Places of worship
- `store` - Retail stores
- `restaurant` - Food establishments
- `gas_station` - Fuel stations
- `bank` - Banks and ATMs
- `pharmacy` - Pharmacies
- `police` - Emergency services

### Travel Modes
- `DRIVE` - Driving
- `WALK` - Walking
- `BICYCLE` - Bicycling
- `TRANSIT` - Public transportation

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Limit**: 100 requests per 15-minute window per IP address
- **Headers**: Response includes rate limit headers
- **Exceeded**: Returns 429 status code with retry information

## Caching

The API implements intelligent caching to improve performance and reduce external API costs:

- **Location data**: Cached for 24 hours
- **POI data**: Cached for 1 hour
- **Routes**: Cached for 24 hours
- **Geocoding**: Cached for 7 days

## Best Practices

1. **Input Validation**: Always validate coordinates and parameters client-side
2. **Error Handling**: Implement proper error handling for all API calls
3. **Rate Limiting**: Implement client-side rate limiting to avoid hitting limits
4. **Caching**: Cache responses client-side when appropriate
5. **Retry Logic**: Implement exponential backoff for retries
6. **Monitoring**: Monitor API usage and performance

## Examples

### Complete Location Analysis
```javascript
const response = await fetch('/api/location/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 5000,
    includeCategories: ['school', 'hospital', 'government']
  })
});

const data = await response.json();
if (data.success) {
  console.log('Found', data.data.total_pois_found, 'POIs');
  console.log('Nearest city:', data.data.nearest_city.name);
}
```

### Get Directions
```javascript
const response = await fetch('/api/navigation/directions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    origin: { latitude: 40.7128, longitude: -74.0060 },
    destination: { latitude: 40.7829, longitude: -73.9654 },
    travelMode: 'DRIVE'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Distance:', data.data.distance.text);
  console.log('Duration:', data.data.duration.text);
}
```