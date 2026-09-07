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

export interface JurisdictionItem {
  id: string;
  name: string;
  boundary: string;
  isLocked?: boolean;
  type?: 'community' | 'regional';
  region?: string;
  state?: string;
  organizationName?: string;
}

interface CommunityMapViewProps {
  boundaries: JurisdictionItem[];
  regionalNetworks?: JurisdictionItem[];
  selectedId: string | null;
  selectedType?: 'community' | 'regional' | null;
  activeFilter?: 'all' | 'community' | 'regional';
  highlightedCommunityIds?: string[];
  isEditMode?: boolean;
  onSelectJurisdiction?: (id: string, type: 'community' | 'regional') => void;
  onUpdateBoundary?: (geoJson: any) => void;
}

function parseGeoJson(raw: any) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Could not parse GeoJSON:", err);
    return null;
  }
}

/**
 * Controller component to handle map interactions like panning and zooming
 * to a selected community or regional network.
 */
function MapController({ 
  selectedId, 
  boundaries, 
  regionalNetworks = [], 
  isEditMode 
}: { 
  selectedId: string | null; 
  boundaries: JurisdictionItem[]; 
  regionalNetworks?: JurisdictionItem[];
  isEditMode: boolean;
}) {
  const map = useMap();

  React.useEffect(() => {
    if (selectedId && !isEditMode) {
      const allItems = [...boundaries, ...regionalNetworks];
      const target = allItems.find(b => b.id === selectedId);
      if (target && target.boundary) {
        try {
          const geoData = parseGeoJson(target.boundary);
          if (!geoData) return;
          const layer = L.geoJSON(geoData);
          const bounds = layer.getBounds();
          
          if (bounds.isValid()) {
            map.flyToBounds(bounds, {
              padding: [50, 50],
              maxZoom: target.type === 'regional' ? 10 : 13,
              duration: 1.5
            });
          }
        } catch (e) {
          console.error(`Error navigating to jurisdiction ${target.name}:`, e);
        }
      }
    }
  }, [selectedId, map, boundaries, regionalNetworks, isEditMode]);

  return null;
}

export default function CommunityMapView({ 
  boundaries, 
  regionalNetworks = [], 
  selectedId, 
  selectedType = 'community',
  activeFilter = 'all',
  highlightedCommunityIds = [],
  isEditMode = false, 
  onSelectJurisdiction,
  onUpdateBoundary 
}: CommunityMapViewProps) {
  const center: [number, number] = [54.5, -2];
  const featureGroupRef = React.useRef<L.FeatureGroup>(null);

  // Synchronize the FeatureGroup with the selected item's boundary for editing
  React.useEffect(() => {
    const group = featureGroupRef.current;
    if (!group) return;

    // Always clear the interactive group first
    group.clearLayers();

    if (isEditMode && selectedId) {
      const allItems = [...boundaries, ...regionalNetworks];
      const target = allItems.find(b => b.id === selectedId);
      if (target && target.boundary) {
        try {
          const geoData = parseGeoJson(target.boundary);
          if (!geoData) return;
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
  }, [isEditMode, selectedId, boundaries, regionalNetworks]);

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
  };

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
        color: selectedType === 'regional' ? '#6366f1' : '#f59e0b',
        fillOpacity: 0.4
      }
    }
  }), [selectedType]);

  const showCommunities = activeFilter === 'all' || activeFilter === 'community';
  const showRegionals = activeFilter === 'all' || activeFilter === 'regional';

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
      
      <MapController 
        boundaries={boundaries} 
        regionalNetworks={regionalNetworks} 
        selectedId={selectedId} 
        isEditMode={isEditMode} 
      />

      {/* 1. Regional Network Boundaries Layer (Rendered underneath local communities) */}
      {showRegionals && regionalNetworks.map((reg) => {
        if (isEditMode && selectedId === reg.id) return null;
        
        try {
          const geoData = parseGeoJson(reg.boundary);
          if (!geoData) return null;

          const isSelected = selectedId === reg.id;
          const isLocked = reg.isLocked;
          const feature = geoJsonDataToFeature(geoData);
          if (!feature) return null;

          return (
            <GeoJSON 
              key={`reg-${reg.id}-${isSelected ? 'selected' : 'unselected'}-${isLocked ? 'locked' : 'unlocked'}`} 
              data={feature}
              style={{
                color: isSelected ? '#4f46e5' : '#6366f1',
                weight: isSelected ? 4 : 2.5,
                fillOpacity: isSelected ? 0.22 : 0.08,
                fillColor: isSelected ? '#6366f1' : '#818cf8',
                dashArray: isSelected ? '' : '8, 6'
              }}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                    <span>🛡️ Regional Network</span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-0.5">{reg.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mb-2">Region: {reg.region || 'UK'}</p>
                  
                  <div className="flex flex-col gap-1.5 pt-1 border-t">
                    <Button 
                      size="sm" 
                      variant={isSelected ? "secondary" : "default"} 
                      className="h-7 text-xs w-full font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => onSelectJurisdiction?.(reg.id, 'regional')}
                    >
                      {isSelected ? "Viewing Member Communities" : "Inspect Regional Authority"}
                    </Button>
                  </div>
                </div>
              </Popup>
            </GeoJSON>
          );
        } catch (e) {
          console.error(`Invalid GeoJSON for regional network ${reg.name}:`, e);
          return null;
        }
      })}

      {/* 2. Static Local Communities Boundaries Layer */}
      {showCommunities && boundaries.map((comm) => {
        if (isEditMode && selectedId === comm.id) return null;
        
        try {
          const geoData = parseGeoJson(comm.boundary);
          if (!geoData) return null;

          const isSelected = selectedId === comm.id;
          const isHighlighted = highlightedCommunityIds.includes(comm.id);
          const isLocked = comm.isLocked;
          const feature = geoJsonDataToFeature(geoData);
          if (!feature) return null;

          let strokeColor = isSelected ? '#f59e0b' : (isHighlighted ? '#06b6d4' : (isLocked ? '#10b981' : '#0ea5e9'));
          let fillColor = isSelected ? '#f59e0b' : (isHighlighted ? '#22d3ee' : (isLocked ? '#10b981' : '#0ea5e9'));
          let fillOpacity = isSelected ? 0.45 : (isHighlighted ? 0.35 : 0.2);
          let weight = isSelected ? 3.5 : (isHighlighted ? 2.5 : 2);

          return (
            <GeoJSON 
              key={`comm-${comm.id}-${isSelected ? 'selected' : 'unselected'}-${isHighlighted ? 'hl' : 'nohl'}-${isLocked ? 'locked' : 'unlocked'}`} 
              data={feature}
              style={{
                color: strokeColor,
                weight: weight,
                fillOpacity: fillOpacity,
                fillColor: fillColor,
                dashArray: isLocked ? '' : '5, 5'
              }}
            >
              <Popup>
                <div className="p-1 min-w-[190px]">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    <span>🏡 Local Community</span>
                  </div>
                  <h3 className="font-bold text-sm mb-0.5">{comm.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mb-2 uppercase tracking-tighter">ID: {comm.id}</p>
                  
                  <div className="flex flex-col gap-1.5 pt-1 border-t">
                    {isHighlighted && (
                      <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 text-[10px] self-start mb-1">
                        Inside Active Regional Network
                      </Badge>
                    )}
                    {isLocked && <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] self-start mb-1">Verified & Locked</Badge>}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-xs w-full font-semibold"
                      onClick={() => onSelectJurisdiction?.(comm.id, 'community')}
                    >
                      Select Jurisdiction
                    </Button>
                    <Button asChild size="sm" variant="default" className="h-7 text-xs w-full">
                      <Link href={`/admin/communities?name=${encodeURIComponent(comm.name)}`}>
                        Go to Community Hub
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
    if (!data) return null;
    if (data.type === 'Feature') return data;
    if (data.type === 'FeatureCollection') return data;
    if (data.type === 'Polygon' || data.type === 'MultiPolygon') {
        return {
            type: 'Feature',
            properties: {},
            geometry: data
        };
    }
    return {
        type: 'Feature',
        properties: {},
        geometry: data.geometry || data
    };
}

