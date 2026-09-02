export interface DrainageNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'manhole' | 'outlet' | 'pump_station';
  capacityUsed: number;
  surchargeStatus: 'normal' | 'overflow' | 'backflow';
}

export interface DrainagePipe {
  id: string;
  from: [number, number];
  to: [number, number];
  flowRate: number;
  capacityPercent: number;
}

export interface InundatedStreet {
  id: string;
  name: string;
  baseDepth: number;
  lat: number;
  lng: number;
  closed: boolean;
}

export const INUNDATED_STREETS: InundatedStreet[] = [
  { id: 's1', name: 'Milan Subway Underpass', baseDepth: 28, lat: 19.0833, lng: 72.8417, closed: true },
  { id: 's2', name: 'Hindmata Flyover Junction', baseDepth: 22, lat: 19.0125, lng: 72.8425, closed: true },
  { id: 's3', name: 'Kurla West Bridge Inlet', baseDepth: 18, lat: 19.0657, lng: 72.8794, closed: false },
  { id: 's4', name: 'Dadar TT Circle Corridor', baseDepth: 12, lat: 19.0178, lng: 72.8478, closed: false },
  { id: 's5', name: 'Andheri Subway Drain Outlet', baseDepth: 34, lat: 19.1197, lng: 72.8464, closed: true },
];

export const DRAINAGE_NODES: DrainageNode[] = [
  { id: 'n1', name: 'MH-104 (Dadar Main Trunk)', lat: 19.016, lng: 72.845, type: 'manhole', capacityUsed: 92, surchargeStatus: 'overflow' },
  { id: 'n2', name: 'MH-105 (Hindmata Sump)', lat: 19.011, lng: 72.841, type: 'manhole', capacityUsed: 98, surchargeStatus: 'backflow' },
  { id: 'n3', name: 'PS-02 (Kurla High-Discharge Pump)', lat: 19.068, lng: 72.882, type: 'pump_station', capacityUsed: 78, surchargeStatus: 'normal' },
  { id: 'n4', name: 'MH-208 (Milan Storm Drain)', lat: 19.081, lng: 72.840, type: 'manhole', capacityUsed: 95, surchargeStatus: 'overflow' },
  { id: 'n5', name: 'OUT-01 (Mahim Creek Outfall)', lat: 19.038, lng: 72.839, type: 'outlet', capacityUsed: 62, surchargeStatus: 'normal' },
];

export const DRAINAGE_PIPES: DrainagePipe[] = [
  { id: 'p1', from: [19.016, 72.845], to: [19.011, 72.841], flowRate: 4.8, capacityPercent: 96 },
  { id: 'p2', from: [19.011, 72.841], to: [19.038, 72.839], flowRate: 8.2, capacityPercent: 88 },
  { id: 'p3', from: [19.081, 72.840], to: [19.068, 72.882], flowRate: 6.4, capacityPercent: 94 },
];

/**
 * Fetches real, street-snapped coordinates from the free Open Source Routing Machine (OSRM)
 * Coordinates format: [lng, lat] for OSRM URL, returns [lat, lng] for Leaflet
 */
export async function fetchSnappedRoute(waypoints: [number, number][]): Promise<[number, number][]> {
  const coordString = waypoints.map(pt => `${pt[1]},${pt[0]}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes.length > 0) {
      // Convert [lng, lat] from GeoJSON back to Leaflet's [lat, lng]
      return data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    }
  } catch (err) {
    console.warn('OSRM route fetch failed, falling back to waypoints:', err);
  }
  return waypoints;
}

// 1. Standard Route: Passes right through flooded Hindmata junction & Milan subway
export const STANDARD_WAYPOINTS: [number, number][] = [
  [19.0020, 72.8380], // Parel
  [19.0125, 72.8425], // Hindmata (Flooded)
  [19.0657, 72.8794], // Kurla (Flooded)
  [19.0833, 72.8417], // Milan Subway (Flooded)
  [19.1020, 72.8450], // Santacruz
];

// 2. HydroCast Safe Route: Bypasses flooded underpasses via the elevated Western Express Flyovers
export const SAFE_WAYPOINTS: [number, number][] = [
  [19.0020, 72.8380], // Parel
  [19.0350, 72.8580], // Wadala Elevated Road
  [19.0600, 72.8680], // Bandra Kurla Flyover
  [19.0880, 72.8550], // High-Elevation Santacruz Bypass
  [19.1020, 72.8450], // Santacruz Destination
];