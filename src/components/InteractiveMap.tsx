import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Location } from '../types/location';
import { reverseGeocode } from '../utils/geocoding';
import { debounce } from '../utils/debounce';
import { MapPopup } from './MapPopup';
import { PinInfoCard } from './PinInfoCard';

interface InteractiveMapProps {
  selectedLocation: Location | null;
}

// Custom marker icon with proper paths
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom cursor icon for the map
const cursorIcon = new L.DivIcon({
  className: 'cursor-pointer',
  html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 22L12 18L22 22L12 2Z" fill="#4B5563" stroke="#1F2937" stroke-width="2"/>
  </svg>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

interface HoverInfo {
  lat: number;
  lng: number;
  address?: string;
  postcode?: string;
}

function MapController({ location }: { location: Location | null }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      // Fly to the location with a smooth animation
      map.flyTo(
        [location.coordinates[1], location.coordinates[0]],
        14, // Zoom level for detailed view
        {
          duration: 1.5, // Animation duration in seconds
          easeLinearity: 0.25
        }
      );
    }
  }, [location, map]);

  return null;
}

function LocationMarker() {
  const map = useMap();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const cursorMarkerRef = useRef<L.Marker | null>(null);
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout>();

  // Set cursor style when map is ready
  useEffect(() => {
    const container = map.getContainer();
    if (container) {
      container.style.cursor = 'crosshair';
    }
  }, [map]);

  const debouncedUpdateLocationInfo = useCallback(
    debounce(async (lat: number, lng: number) => {
      try {
        const result = await reverseGeocode(lat, lng);
        if (result && result.display_name) {
          setHoverInfo({
            lat,
            lng,
            address: result.display_name.split(',')[0],
            postcode: result.address?.postcode
          });
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    }, 300),
    []
  );

  useMapEvents({
    mousemove: (e) => {
      const { lat, lng } = e.latlng;

      // Clear any existing timeout
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current);
      }

      // Set a new timeout to update hover info
      mouseMoveTimeoutRef.current = setTimeout(() => {
        setHoverInfo({ lat, lng });
        debouncedUpdateLocationInfo(lat, lng);
      }, 100);

      // Update cursor marker position
      if (!cursorMarkerRef.current) {
        cursorMarkerRef.current = L.marker([lat, lng], { icon: cursorIcon }).addTo(map);
      } else {
        cursorMarkerRef.current.setLatLng([lat, lng]);
      }
    },
    mouseout: () => {
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current);
      }
      setHoverInfo(null);
      if (cursorMarkerRef.current) {
        map.removeLayer(cursorMarkerRef.current);
        cursorMarkerRef.current = null;
      }
    },
    click: (e) => {
      const { lat, lng } = e.latlng;
      // Zoom in to clicked location
      map.flyTo([lat, lng], 14, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current);
      }
      if (cursorMarkerRef.current) {
        map.removeLayer(cursorMarkerRef.current);
      }
    };
  }, [map]);

  return hoverInfo ? (
    <PinInfoCard
      lat={hoverInfo.lat}
      lng={hoverInfo.lng}
      address={hoverInfo.address}
      postcode={hoverInfo.postcode}
    />
  ) : null;
}

export function InteractiveMap({ selectedLocation }: InteractiveMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const lastClickedMarkerRef = useRef<L.LatLng | null>(null);

  const handleMarkerClick = useCallback((e: L.LeafletMouseEvent) => {
    const map = e.target._map;
    if (!map) return;

    const point = map.latLngToContainerPoint(e.latlng);
    setPopupPosition({ x: point.x, y: point.y });
    setShowPopup(true);
    lastClickedMarkerRef.current = e.latlng;

    // Zoom in to marker location
    map.flyTo(e.latlng, 14, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, []);

  const handleMapMove = useCallback(() => {
    if (showPopup && lastClickedMarkerRef.current && mapRef.current) {
      const newPoint = mapRef.current.latLngToContainerPoint(lastClickedMarkerRef.current);
      setPopupPosition({ x: newPoint.x, y: newPoint.y });
    }
  }, [showPopup]);

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
    setIsLoading(false);
    map.on('move', handleMapMove);
    map.on('zoom', handleMapMove);
  }, [handleMapMove]);

  // Cleanup map event listeners
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.off('move', handleMapMove);
        mapRef.current.off('zoom', handleMapMove);
      }
    };
  }, [handleMapMove]);

  return (
    <div className="relative h-[700px] w-full rounded-xl overflow-hidden shadow-2xl border-2 border-gray-200">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        className="h-full w-full"
        zoomControl={false}
        whenReady={e => handleMapReady(e.target)}
      >
        <TileLayer
          attribution=""
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker />
        <MapController location={selectedLocation} />
        {selectedLocation && (
          <Marker
            position={[selectedLocation.coordinates[1], selectedLocation.coordinates[0]]}
            icon={customIcon}
            eventHandlers={{
              click: handleMarkerClick
            }}
          />
        )}
      </MapContainer>

      {showPopup && popupPosition && selectedLocation && (
        <MapPopup
          location={selectedLocation}
          position={popupPosition}
          onClose={() => {
            setShowPopup(false);
            lastClickedMarkerRef.current = null;
          }}
        />
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
}