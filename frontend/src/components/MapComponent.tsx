import React, { useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Coordinates, MapMarker, MapPolyline } from '../types';

interface MapComponentProps {
  center: Coordinates;
  zoom?: number;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  onMapClick?: (coordinates: Coordinates) => void;
  satelliteView?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom = 10,
  markers = [],
  polylines = [],
  onMapClick,
  satelliteView = false,
  className = '',
  style = { height: '400px', width: '100%' }
}) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`} style={style}>
        <p className="text-gray-600">Google Maps API key not configured</p>
      </div>
    );
  }

  const renderMap = (status: Status) => {
    if (status === Status.LOADING) {
      return (
        <div className={`bg-gray-100 animate-pulse flex items-center justify-center ${className}`} style={style}>
          <div className="text-gray-500">Loading map...</div>
        </div>
      );
    }

    if (status === Status.FAILURE) {
      return (
        <div className={`bg-red-100 flex items-center justify-center ${className}`} style={style}>
          <p className="text-red-600">Failed to load map</p>
        </div>
      );
    }

    return (
      <Map
        center={center}
        zoom={zoom}
        markers={markers}
        polylines={polylines}
        onMapClick={onMapClick}
        satelliteView={satelliteView}
        className={className}
        style={style}
      />
    );
  };

  return (
    <Wrapper apiKey={apiKey} render={renderMap} libraries={['places']} />
  );
};

interface MapProps extends MapComponentProps {}

const Map: React.FC<MapProps> = ({
  center,
  zoom,
  markers,
  polylines,
  onMapClick,
  satelliteView,
  className,
  style
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [googleMarkers, setGoogleMarkers] = useState<google.maps.Marker[]>([]);
  const [googlePolylines, setGooglePolylines] = useState<google.maps.Polyline[]>([]);

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !map) {
      const newMap = new google.maps.Map(mapRef.current, {
        center: { lat: center.latitude, lng: center.longitude },
        zoom,
        mapTypeId: satelliteView ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP,
        streetViewControl: false,
        fullscreenControl: true,
        mapTypeControl: true,
        zoomControl: true,
      });

      // Add click listener
      if (onMapClick) {
        newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            onMapClick({
              latitude: event.latLng.lat(),
              longitude: event.latLng.lng()
            });
          }
        });
      }

      setMap(newMap);
    }
  }, [mapRef.current, satelliteView]);

  // Update map center
  useEffect(() => {
    if (map && center) {
      map.setCenter({ lat: center.latitude, lng: center.longitude });
    }
  }, [map, center]);

  // Update map type
  useEffect(() => {
    if (map) {
      map.setMapTypeId(satelliteView ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP);
    }
  }, [map, satelliteView]);

  // Update markers
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    googleMarkers.forEach(marker => marker.setMap(null));

    // Create new markers
    const newMarkers = markers?.map(markerData => {
      const marker = new google.maps.Marker({
        position: { lat: markerData.position.latitude, lng: markerData.position.longitude },
        map,
        title: markerData.title,
        icon: markerData.color ? {
          url: `http://maps.google.com/mapfiles/ms/icons/${markerData.color}-dot.png`
        } : undefined
      });

      // Add info window if info is provided
      if (markerData.info) {
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold text-lg">${markerData.info.name}</h3>
              ${markerData.info.category ? `<p class="text-sm text-gray-600">${markerData.info.category}</p>` : ''}
              ${markerData.info.address ? `<p class="text-sm">${markerData.info.address}</p>` : ''}
              ${markerData.info.rating ? `<p class="text-sm">★ ${markerData.info.rating}/5</p>` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          if (markerData.onClick) {
            markerData.onClick();
          }
        });
      } else if (markerData.onClick) {
        marker.addListener('click', markerData.onClick);
      }

      return marker;
    }) || [];

    setGoogleMarkers(newMarkers);

  }, [map, markers]);

  // Update polylines
  useEffect(() => {
    if (!map) return;

    // Clear existing polylines
    googlePolylines.forEach(polyline => polyline.setMap(null));

    // Create new polylines
    const newPolylines = polylines?.map(polylineData => {
      const polyline = new google.maps.Polyline({
        path: polylineData.path.map(coord => ({ lat: coord.latitude, lng: coord.longitude })),
        geodesic: true,
        strokeColor: polylineData.color || '#FF0000',
        strokeOpacity: polylineData.opacity || 1.0,
        strokeWeight: polylineData.weight || 2,
        map
      });

      return polyline;
    }) || [];

    setGooglePolylines(newPolylines);

  }, [map, polylines]);

  // Auto-fit bounds when markers change
  useEffect(() => {
    if (map && markers && markers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(marker => {
        bounds.extend({ lat: marker.position.latitude, lng: marker.position.longitude });
      });
      map.fitBounds(bounds);
    }
  }, [map, markers]);

  return <div ref={mapRef} className={className} style={style} />;
};

export default MapComponent;