import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, Popup, CircleMarker, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  DRAINAGE_NODES, 
  DRAINAGE_PIPES, 
  INUNDATED_STREETS, 
  STANDARD_WAYPOINTS,
  SAFE_WAYPOINTS,
  fetchSnappedRoute,
  type DrainageNode 
} from '../data/mockGisData';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface MapViewerProps {
  currentStep: number;
  activeLayers: {
    inundation: boolean;
    drainage: boolean;
    radar: boolean;
    routes: boolean;
  };
  onSelectNode: (node: DrainageNode) => void;
}

// 1 km x 1 km Doppler Radar Grid cells over Mumbai Metropolitan Region
const RADAR_GRID_CELLS = [
  { id: 'r1', bounds: [[19.000, 72.825], [19.020, 72.850]] as [[number, number], [number, number]], baseDbz: 32 },
  { id: 'r2', bounds: [[19.020, 72.835], [19.040, 72.860]] as [[number, number], [number, number]], baseDbz: 42 },
  { id: 'r3', bounds: [[19.040, 72.845], [19.060, 72.870]] as [[number, number], [number, number]], baseDbz: 48 },
  { id: 'r4', bounds: [[19.060, 72.855], [19.080, 72.880]] as [[number, number], [number, number]], baseDbz: 52 },
  { id: 'r5', bounds: [[19.080, 72.830], [19.100, 72.855]] as [[number, number], [number, number]], baseDbz: 45 },
  { id: 'r6', bounds: [[19.100, 72.835], [19.120, 72.860]] as [[number, number], [number, number]], baseDbz: 38 },
];

export const MapViewer: React.FC<MapViewerProps> = ({
  currentStep,
  activeLayers,
  onSelectNode,
}) => {
  const stepFactor = currentStep / 4;
  const [standardRoads, setStandardRoads] = useState<[number, number][]>(STANDARD_WAYPOINTS);
  const [safeRoads, setSafeRoads] = useState<[number, number][]>(SAFE_WAYPOINTS);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(true);

  useEffect(() => {
    fetchSnappedRoute(STANDARD_WAYPOINTS).then(coords => setStandardRoads(coords));
    fetchSnappedRoute(SAFE_WAYPOINTS).then(coords => setSafeRoads(coords));
  }, []);

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden">
      {/* Top Floating Viewport Info */}
      <div className="absolute top-3 left-3 z-[1000] flex gap-2">
        <div className="bg-zinc-900/95 border border-zinc-800 px-3 py-1.5 rounded shadow-lg text-[11px] text-zinc-300 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>IMD DWR-MUMBAI ({(24.5 + stepFactor * 7.5).toFixed(1)} dBZ)</span>
        </div>
      </div>

      {/* Floating Collapsible GIS Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] flex flex-col items-end">
        {isLegendOpen && (
          <div className="mb-2 bg-zinc-900/95 border border-zinc-800 p-3 rounded-lg shadow-xl text-xs space-y-2 text-zinc-300 w-56">
            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              <span>Layer Symbology</span>
              <button onClick={() => setIsLegendOpen(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
            </div>
            
            {/* Inundation */}
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Surface Inundation</span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> &lt; 10 cm (Passable)
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> 10–30 cm (Moderate)
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> &gt; 30 cm (Severe / Closed)
              </div>
            </div>

            {/* Radar Reflectivity */}
            {activeLayers.radar && (
              <div className="space-y-1 pt-1.5 border-t border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Radar Grid (dBZ)</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="w-3 h-2 bg-cyan-400/50 border border-cyan-400"></span> 20–35 dBZ (Light)
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="w-3 h-2 bg-amber-400/50 border border-amber-400"></span> 35–45 dBZ (Moderate)
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="w-3 h-2 bg-rose-500/50 border border-rose-500"></span> &gt; 45 dBZ (Heavy)
                </div>
              </div>
            )}

            {/* Transit */}
            <div className="space-y-1 pt-1.5 border-t border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Transit Routing</span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-3.5 h-0.5 bg-rose-500"></span> Standard Shortest (Blocked)
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-3.5 h-0.5 bg-emerald-400"></span> Dynamic Safe Bypass
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          className="bg-zinc-900/95 hover:bg-zinc-800 border border-zinc-700 px-2.5 py-1.5 rounded shadow text-[11px] font-medium text-zinc-300 flex items-center gap-1.5 cursor-pointer"
        >
          <Layers className="w-3 h-3 text-zinc-400" />
          <span>Symbology</span>
          {isLegendOpen ? <ChevronDown className="w-3 h-3 text-zinc-400" /> : <ChevronUp className="w-3 h-3 text-zinc-400" />}
        </button>
      </div>

      {/* Map Engine */}
      <MapContainer
        center={[19.0550, 72.8550]}
        zoom={13}
        style={{ height: '100%', width: '100%', background: '#09090b' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <TileLayer
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />

        {/* 1. Doppler Weather Radar (DWR) Precipitation Grid Overlay */}
        {activeLayers.radar &&
          RADAR_GRID_CELLS.map((cell) => {
            const currentDbz = Math.min(cell.baseDbz + stepFactor * 4.5, 65);
            // Standard meteorological color scales
            const fillColor =
              currentDbz >= 48 ? '#ef4444' :
              currentDbz >= 40 ? '#f59e0b' :
              currentDbz >= 30 ? '#06b6d4' : '#10b981';

            // Z-R Marshall-Palmer conversion to mm/hr for the tooltip
            const rainRate = Math.pow(Math.pow(10, currentDbz / 10) / 200, 1 / 1.6);

            return (
              <Rectangle
                key={cell.id}
                bounds={cell.bounds}
                pathOptions={{
                  color: fillColor,
                  weight: 1,
                  fillColor: fillColor,
                  fillOpacity: 0.35,
                  dashArray: '2, 2',
                }}
              >
                <Popup>
                  <div className="space-y-1 font-sans">
                    <div className="font-semibold text-xs text-zinc-100">DWR Precipitation Grid ({cell.id.toUpperCase()})</div>
                    <div className="text-[11px] text-zinc-300 font-mono">
                      Reflectivity: <span className="font-bold text-amber-400">{currentDbz.toFixed(1)} dBZ</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      Rainfall Intensity: <span className="font-bold text-sky-400">{rainRate.toFixed(1)} mm/hr</span>
                    </div>
                  </div>
                </Popup>
              </Rectangle>
            );
          })}

        {/* 2. Inundated Street Intersections */}
        {activeLayers.inundation &&
          INUNDATED_STREETS.map((street) => {
            const dynamicDepth = street.baseDepth + stepFactor * 6.5;
            const isHazard = dynamicDepth > 30;
            const isWarning = dynamicDepth > 10 && dynamicDepth <= 30;
            const color = isHazard ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

            return (
              <Circle
                key={street.id}
                center={[street.lat, street.lng]}
                radius={220 + stepFactor * 80}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.5,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold text-xs text-zinc-100">{street.name}</div>
                    <div className="text-[11px] text-zinc-400">
                      Projected Depth: <span className="font-mono text-zinc-100 font-bold">{dynamicDepth.toFixed(1)} cm</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Status: <span className={isHazard ? 'text-rose-400 font-medium' : 'text-amber-400 font-medium'}>{isHazard ? 'Roadway Closed' : 'Moderate Inundation'}</span>
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

        {/* 3. Drainage Network */}
        {activeLayers.drainage && (
          <>
            {DRAINAGE_PIPES.map((pipe) => (
              <Polyline
                key={pipe.id}
                positions={[pipe.from, pipe.to]}
                pathOptions={{
                  color: pipe.capacityPercent > 90 ? '#c084fc' : '#38bdf8',
                  weight: 2.5,
                  dashArray: '4, 4',
                }}
              />
            ))}

            {DRAINAGE_NODES.map((node) => (
              <CircleMarker
                key={node.id}
                center={[node.lat, node.lng]}
                radius={node.surchargeStatus === 'overflow' ? 7 : 5}
                eventHandlers={{ click: () => onSelectNode(node) }}
                pathOptions={{
                  color: node.surchargeStatus === 'overflow' ? '#e879f9' : '#0284c7',
                  fillColor: node.surchargeStatus === 'overflow' ? '#c026d3' : '#0ea5e9',
                  fillOpacity: 0.9,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold text-xs text-zinc-100">{node.name}</div>
                    <div className="text-[11px] text-zinc-400">Capacity: <span className="font-mono text-zinc-200">{node.capacityUsed}%</span></div>
                    <div className="text-[10px] text-zinc-400">Condition: <span className="uppercase font-mono text-purple-400 font-semibold">{node.surchargeStatus}</span></div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        )}

        {/* 4. Emergency Routes */}
        {activeLayers.routes && (
          <>
            <Polyline
              positions={standardRoads}
              pathOptions={{
                color: '#ef4444',
                weight: 4,
                opacity: 0.8,
                dashArray: '6, 6',
              }}
            />
            <Polyline
              positions={safeRoads}
              pathOptions={{
                color: '#10b981',
                weight: 4.5,
                opacity: 0.95,
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};