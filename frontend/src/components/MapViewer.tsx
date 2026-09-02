import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, Popup, CircleMarker } from 'react-leaflet';
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
import { Layers, Radio, ChevronDown, ChevronUp } from 'lucide-react';

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

export const MapViewer: React.FC<MapViewerProps> = ({
  currentStep,
  activeLayers,
  onSelectNode,
}) => {
  const stepFactor = currentStep / 4;
  const [standardRoads, setStandardRoads] = useState<[number, number][]>(STANDARD_WAYPOINTS);
  const [safeRoads, setSafeRoads] = useState<[number, number][]>(SAFE_WAYPOINTS);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchSnappedRoute(STANDARD_WAYPOINTS).then(coords => setStandardRoads(coords));
    fetchSnappedRoute(SAFE_WAYPOINTS).then(coords => setSafeRoads(coords));
  }, []);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      {/* Top Telemetry Overlay */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Doppler Radar</div>
            <div className="text-xs font-black text-white font-mono">{(18.5 + stepFactor * 8.2).toFixed(1)} dBZ</div>
          </div>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-sky-400" />
          <div>
            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Horizon</div>
            <div className="text-xs font-black text-sky-400 font-mono">+{currentStep * 15}m</div>
          </div>
        </div>
      </div>

      {/* Pop-up / Collapsible Floating Legend */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col items-end">
        {isLegendOpen && (
          <div className="mb-2 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-2xl text-xs space-y-2 text-slate-300 w-52 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" /> Layer Palette
              </span>
              <button 
                onClick={() => setIsLegendOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            
            {/* Water Depth */}
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Water Depth</div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span>&lt;10 cm (Passable)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                <span>10–30 cm (Caution)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                <span>&gt;30 cm (Submerged)</span>
              </div>
            </div>

            {/* Navigation Routes */}
            <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Routing</div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-3.5 h-1 bg-rose-500 rounded shrink-0"></span>
                <span>Standard (Blocked)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-3.5 h-1 bg-emerald-400 rounded shrink-0"></span>
                <span>Safe Bypass</span>
              </div>
            </div>

            {/* Drainage */}
            <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Drainage</div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
                <span>Overflow Node</span>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toggle Pill / Trigger Button */}
        <button
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          className="bg-slate-900/90 hover:bg-slate-800/95 active:scale-95 text-slate-200 border border-slate-700/70 px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Legend</span>
          {isLegendOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      </div>

      {/* Leaflet Map Engine */}
      <MapContainer
        center={[19.0550, 72.8550]}
        zoom={13}
        style={{ height: '100%', width: '100%', background: '#020617' }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* ESRI High-Resolution Satellite Basemap */}
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />

        {/* Road & Place Labels */}
        <TileLayer
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />

        {/* Inundation Hotspots */}
        {activeLayers.inundation &&
          INUNDATED_STREETS.map((street) => {
            const dynamicDepth = street.baseDepth + stepFactor * 6.5;
            const isHazard = dynamicDepth > 30;
            const isWarning = dynamicDepth > 10 && dynamicDepth <= 30;
            const color = isHazard ? '#f43f5e' : isWarning ? '#f59e0b' : '#10b981';

            return (
              <Circle
                key={street.id}
                center={[street.lat, street.lng]}
                radius={240 + stepFactor * 90}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.55,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-1 text-slate-900 font-sans">
                    <div className="font-bold text-sm text-slate-900">{street.name}</div>
                    <div className="text-xs text-slate-600 mt-1 font-mono">
                      Depth: <span className="font-bold text-rose-600">{dynamicDepth.toFixed(1)} cm</span>
                    </div>
                    <div className="text-[11px] font-semibold mt-1">
                      Status: {isHazard ? '⛔ Road Closed / Flooded' : '⚠️ Slow Traffic'}
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

        {/* Drainage Pipes & Manholes */}
        {activeLayers.drainage && (
          <>
            {DRAINAGE_PIPES.map((pipe) => (
              <Polyline
                key={pipe.id}
                positions={[pipe.from, pipe.to]}
                pathOptions={{
                  color: pipe.capacityPercent > 90 ? '#c084fc' : '#22d3ee',
                  weight: 4,
                  dashArray: '4, 6',
                }}
              />
            ))}

            {DRAINAGE_NODES.map((node) => (
              <CircleMarker
                key={node.id}
                center={[node.lat, node.lng]}
                radius={node.surchargeStatus === 'overflow' ? 8 : 6}
                eventHandlers={{ click: () => onSelectNode(node) }}
                pathOptions={{
                  color: node.surchargeStatus === 'overflow' ? '#f0abfc' : '#38bdf8',
                  fillColor: node.surchargeStatus === 'overflow' ? '#a855f7' : '#0284c7',
                  fillOpacity: 0.95,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-1 text-slate-900 font-sans">
                    <div className="font-bold text-sm">{node.name}</div>
                    <div className="text-xs text-slate-600">Capacity: {node.capacityUsed}% Used</div>
                    <div className="text-xs font-semibold text-purple-700 uppercase">
                      Status: {node.surchargeStatus}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        )}

        {/* Real Snapped Routes */}
        {activeLayers.routes && (
          <>
            <Polyline
              positions={standardRoads}
              pathOptions={{
                color: '#f43f5e',
                weight: 5,
                opacity: 0.85,
                dashArray: '8, 8',
              }}
            />
            <Polyline
              positions={safeRoads}
              pathOptions={{
                color: '#34d399',
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};