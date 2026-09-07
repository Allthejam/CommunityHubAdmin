'use client';

import * as React from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix for default marker icons in Leaflet which can cause drawing tools to fail
if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
}

interface CommunityMapViewProps {
  boundaries: { id: string; name: string; boundary: string; isLocked?: boolean }[];
  selectedId: string | null;
  isEditMode?: boolean;
  onUpdateBoundary?: (geoJson: any) => void;
}

/**
 * Controller component to handle map interactions like panning and zooming
 * to a selected community.
 */
function MapController({ selectedId, boundaries, isEditMode }: { selectedId: string | null; boundaries: CommunityMapViewProps['boundaries']; isEditMode: boolean }) {
  const map = useMap();

  React.useEffect(() => {
    if (selectedId && !isEditMode) {
      const comm = boundaries.find(b => b.id === selectedId);
      if (comm && comm.boundary) {
        try {
          const geoData = JSON.parse(comm.boundary);
          const layer = L.geoJSON(geoData);
          const bounds = layer.getBounds();
          
          if (bounds.isValid()) {
            map.flyToBounds(bounds, {
              padding: [50, 50],
              maxZoom: 13,
              duration: 1.5
            });
          }
        } catch (e) {
          console.error(`Error navigating to community ${comm.name}:`, e);
        }
      }
    }
  }, [selectedId, map, boundaries, isEditMode]);

  return null;
}

export default function CommunityMapView({ boundaries, selectedId, isEditMode = false, onUpdateBoundary }: CommunityMapViewProps) {
  const center: [number, number] = [54.5, -2];
  const featureGroupRef = React.useRef<L.FeatureGroup>(null);

  // Synchronize the FeatureGroup with the selected community's boundary for editing
  React.useEffect(() => {
    const group = featureGroupRef.current;
    if (!group) return;

    // Always clear the interactive group first
    group.clearLayers();

    if (isEditMode && selectedId) {
      const comm = boundaries.find(b => b.id === selectedId);
      if (comm && comm.boundary) {
        try {
          const geoData = JSON.parse(comm.boundary);
          // Create Leaflet layers from the GeoJSON
          const layer = L.geoJSON(geoData);
          // Add each individual polygon/shape to the FeatureGroup managed by EditControl
          layer.eachLayer((l) => {
            group.addLayer(l);
          });
        } catch (e) {
          console.error("Error loading boundary for editing:", e);
        }
      }
    }
  }, [isEditMode, selectedId, boundaries]);

  const onEdited = (e: any) => {
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      const geoJson = layer.toGeoJSON();
      if (onUpdateBoundary) {
        onUpdateBoundary(geoJson);
      }
    });
  };

  const onCreated = (e: any) => {
    const { layer } = e;
    const geoJson = layer.toGeoJSON();
    if (onUpdateBoundary) {
      onUpdateBoundary(geoJson);
    }
  };

  const onDeleteDeleted = () => {
    if (onUpdateBoundary) {
        onUpdateBoundary(null);
    }
  }

  const drawOptions = React.useMemo(() => ({
    rectangle: false,
    circle: false,
    polyline: false,
    circlemarker: false,
    marker: false,
    polygon: {
      allowIntersection: false,
      drawError: {
        color: '#e1e1e1',
        message: 'Boundary overlap or intersection detected'
      },
      shapeOptions: {
        color: '#f59e0b',
        fillOpacity: 0.5
      }
    }
  }), []);

  return (
    <MapContainer 
      center={center} 
      zoom={6} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapController boundaries={boundaries} selectedId={selectedId} isEditMode={isEditMode} />

      {/* Static Boundaries Layer (Hidden if we are editing them) */}
      {boundaries.map((comm) => {
        if (isEditMode && selectedId === comm.id) return null;
        
        try {
          const geoData = JSON.parse(comm.boundary);
          const isSelected = selectedId === comm.id;
          const isLocked = comm.isLocked;

          return (
            <GeoJSON 
              key={`${comm.id}-${isSelected ? 'selected' : 'unselected'}-${isLocked ? 'locked' : 'unlocked'}`} 
              data={geoJsonDataToFeature(geoData)}
              style={{
                color: isSelected ? '#f59e0b' : (isLocked ? '#10b981' : '#0ea5e9'),
                weight: isSelected ? 3 : 2,
                fillOpacity: isSelected ? 0.4 : 0.2,
                fillColor: isSelected ? '#f59e0b' : (isLocked ? '#10b981' : '#0ea5e9'),
                dashArray: isLocked ? '' : '5, 5'
              }}
            >
              <Popup>
                <div className="p-1 min-w-[180px]">
                  <h3 className="font-bold text-sm mb-1">{comm.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mb-2 uppercase tracking-tighter">ID: {comm.id}</p>
                  <div className="flex flex-col gap-2">
                      {isLocked && <Badge variant="secondary" className="bg-green-100 text-green-800 self-start mb-2">Verified & Locked</Badge>}
                      <Button asChild size="sm" variant="default" className="h-8 text-xs w-full">
                          <Link href={`/admin/communities?name=${encodeURIComponent(comm.name)}`}>
                          Go to Community
                          </Link>
                      </Button>
                  </div>
                </div>
              </Popup>
            </GeoJSON>
          );
        } catch (e) {
          console.error(`Invalid GeoJSON for community ${comm.name}:`, e);
          return null;
        }
      })}

      {/* Interactive Layer for redrawing and creation */}
      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topright"
          onEdited={onEdited}
          onCreated={onCreated}
          onDeleted={onDeleteDeleted}
          draw={isEditMode ? drawOptions : {
            polygon: false, rectangle: false, circle: false, marker: false, circlemarker: false, polyline: false
          }}
          edit={{
              remove: isEditMode,
              edit: isEditMode
          }}
        />
      </FeatureGroup>
    </MapContainer>
  );
}

// Helper to ensure GeoJSON is treated as a Feature
function geoJsonDataToFeature(data: any) {
    if (data.type === 'Feature') return data;
    return {
        type: 'Feature',
        properties: {},
        geometry: data
    };
}
