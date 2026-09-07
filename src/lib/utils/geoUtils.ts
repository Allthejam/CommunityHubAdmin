/**
 * Geospatial utilities for cartographic boundary analysis,
 * point-in-polygon containment testing, and GeoJSON normalisation.
 */

export function parseGeoJson(raw: any): any {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Ray-casting algorithm to test if a 2D point [lng, lat] is inside a polygon ring [[lng, lat], ...].
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
    if (!polygon || polygon.length < 3) return false;
    const [x, y] = point; // x = lng, y = lat
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Extracts outer polygon coordinate rings from any GeoJSON structure
 * (FeatureCollection, Feature, MultiPolygon, Polygon, or raw geometry).
 */
export function getCoordinatesFromGeoJson(rawGeoJson: any): [number, number][][] {
    const geojson = parseGeoJson(rawGeoJson);
    if (!geojson) return [];

    if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        return geojson.features.flatMap((f: any) => getCoordinatesFromGeoJson(f));
    }
    if (geojson.type === 'Feature' && geojson.geometry) {
        return getCoordinatesFromGeoJson(geojson.geometry);
    }
    if (geojson.type === 'Polygon' && Array.isArray(geojson.coordinates) && geojson.coordinates.length > 0) {
        return [geojson.coordinates[0]]; // outer ring
    }
    if (geojson.type === 'MultiPolygon' && Array.isArray(geojson.coordinates)) {
        return geojson.coordinates
            .filter((poly: any) => Array.isArray(poly) && poly.length > 0)
            .map((poly: any) => poly[0]); // outer rings of each polygon in multipolygon
    }
    if (geojson.geometry) {
        return getCoordinatesFromGeoJson(geojson.geometry);
    }
    return [];
}

/**
 * Calculates the geographic centroid [lat, lng] of a GeoJSON boundary.
 */
export function getCentroidFromGeoJson(rawGeoJson: any): { lat: number; lng: number } | null {
    try {
        const rings = getCoordinatesFromGeoJson(rawGeoJson);
        if (rings.length === 0 || rings[0].length === 0) return null;
        let sumLng = 0;
        let sumLat = 0;
        let count = 0;
        for (const ring of rings) {
            for (const [lng, lat] of ring) {
                if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
                    sumLng += lng;
                    sumLat += lat;
                    count++;
                }
            }
        }
        if (count === 0) return null;
        return { lat: sumLat / count, lng: sumLng / count };
    } catch {
        return null;
    }
}

/**
 * Evaluates whether a local community is geographically situated within a Regional Network's authority boundary.
 */
export function isCommunityInRegionalNetwork(
    communityBoundary: any, 
    regionalBoundary: any, 
    communityRegion?: string, 
    regionalRegion?: string
): boolean {
    if (!regionalBoundary) return false;

    // 1. Precise Geometric Containment Check
    try {
        const centroid = getCentroidFromGeoJson(communityBoundary);
        if (centroid) {
            const point: [number, number] = [centroid.lng, centroid.lat];
            const regionalRings = getCoordinatesFromGeoJson(regionalBoundary);
            for (const ring of regionalRings) {
                if (isPointInPolygon(point, ring)) {
                    return true;
                }
            }
        }
    } catch (e) {
        // Continue to regional name fallback
    }

    // 2. Region / District Name Matching Fallback
    if (communityRegion && regionalRegion) {
        const cReg = communityRegion.toLowerCase().trim();
        const rReg = regionalRegion.toLowerCase().trim();
        if (cReg && rReg && (cReg.includes(rReg) || rReg.includes(cReg))) {
            return true;
        }
    }

    return false;
}
