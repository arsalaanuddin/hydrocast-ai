import React, { useState, useEffect } from 'react';
import { TimeSlider } from './components/TimeSlider';
import { MapViewer } from './components/MapViewer';
import { 
  INUNDATED_STREETS, 
  DRAINAGE_NODES, 
  type DrainageNode 
} from './data/mockGisData';
import { 
  Droplets, 
  Layers, 
  Radio, 
  Send, 
  AlertTriangle, 
  Navigation, 
  ShieldCheck, 
  Activity, 
  GitFork, 
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

export default function App() {
  const [currentStep, setCurrentStep] = useState<number>(2); // T=+30 mins default
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<DrainageNode | null>(DRAINAGE_NODES[0]);
  const [alertSent, setAlertSent] = useState<boolean>(false);

  // Active Layer Toggles
  const [layers, setLayers] = useState({
    inundation: true,
    drainage: true,
    radar: true,
    routes: true,
  });

  // Simulation play loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev >= 12 ? 0 : prev + 1));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const toggleLayer = (layerKey: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const handleBroadcast = () => {
    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 3500);
  };

  const stepFactor = currentStep / 4;
  const maxProjectedDepth = 28 + stepFactor * 6.5;

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* 1. Left Tactical Sidebar: Real-Time Monitoring & Controls */}
      <aside className="w-[440px] bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col justify-between shrink-0 shadow-2xl z-20">
        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-90px)]">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-1.5 text-sky-400 font-mono text-xs font-bold uppercase tracking-widest">
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>HYDROCAST COMMAND // MoES</span>
              </div>
              <h1 className="text-xl font-black text-white tracking-tight mt-0.5">
                Urban Flood Nowcasting System
              </h1>
            </div>
            <div className="px-2 py-1 rounded bg-sky-500/10 border border-sky-400/20 text-sky-400 font-mono text-[10px] font-bold">
              SIH26085
            </div>
          </div>

          {/* Module 2: Time-Slider (0-3 Hour Horizon) */}
          <TimeSlider
            currentStep={currentStep}
            onStepChange={(step) => {
              setIsPlaying(false);
              setCurrentStep(step);
            }}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
          />

          {/* Layer Visibility Toggles */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Map Layers
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => toggleLayer('inundation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                  layers.inundation ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                <span>Flood Depth</span>
                <span className={`w-2 h-2 rounded-full ${layers.inundation ? 'bg-sky-400' : 'bg-slate-600'}`} />
              </button>

              <button
                onClick={() => toggleLayer('drainage')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                  layers.drainage ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                <span>Drain Network</span>
                <span className={`w-2 h-2 rounded-full ${layers.drainage ? 'bg-purple-400' : 'bg-slate-600'}`} />
              </button>

              <button
                onClick={() => toggleLayer('routes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                  layers.routes ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                <span>Safe Routes</span>
                <span className={`w-2 h-2 rounded-full ${layers.routes ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              </button>

              <button
                onClick={() => toggleLayer('radar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-between ${
                  layers.radar ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                <span>Radar Grid</span>
                <span className={`w-2 h-2 rounded-full ${layers.radar ? 'bg-amber-400' : 'bg-slate-600'}`} />
              </button>
            </div>
          </div>

          {/* Module 3: Emergency Navigation & Route Comparison */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" /> Emergency Transit Routing
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                A* Dynamic Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-rose-500/30">
                <div className="text-[10px] text-rose-400 uppercase font-sans font-bold flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Shortest Path
                </div>
                <div className="text-slate-200 font-bold mt-1">4.2 km (Blocked)</div>
                <div className="text-[10px] text-rose-400/80">3 Inundated Nodes</div>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-emerald-500/30">
                <div className="text-[10px] text-emerald-400 uppercase font-sans font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> HydroCast Safe
                </div>
                <div className="text-emerald-300 font-bold mt-1">5.8 km (Clear)</div>
                <div className="text-[10px] text-emerald-400/80">0 Waterlogged Nodes</div>
              </div>
            </div>
          </div>

          {/* Module 4: High-Risk Intersections & Surcharge Monitor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Street Risk Ranking (+{currentStep * 15}m)</span>
              <span className="font-mono text-[10px] text-sky-400">DEM Coupled</span>
            </div>

            <div className="space-y-1.5">
              {INUNDATED_STREETS.map((street) => {
                const depth = street.baseDepth + stepFactor * 6.5;
                const isClosed = depth > 30;

                return (
                  <div key={street.id} className="bg-slate-800/40 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">{street.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Projected Depth: <span className={isClosed ? 'text-rose-400 font-bold' : 'text-amber-400'}>{depth.toFixed(1)} cm</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      isClosed ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {isClosed ? 'Submerged' : 'Caution'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Drainage Node Surcharge Monitor */}
          {selectedNode && (
            <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5" /> {selectedNode.name}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                  {selectedNode.surchargeStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div>Hydraulic Capacity: <span className="text-purple-300 font-bold">{selectedNode.capacityUsed}%</span></div>
                <div>Flow Rate: <span className="text-slate-300 font-bold">7.4 m³/s</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer: Hyper-Local Alert Webhook Trigger */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={handleBroadcast}
            className={`w-full py-3.5 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
              alertSent 
                ? 'bg-emerald-500 text-slate-950' 
                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 shadow-sky-500/20'
            }`}
          >
            {alertSent ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>NDRF / SDRF Alert Broadcast Dispatched!</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Dispatch Municipal Alert Broadcast</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* 2. Right Viewport: Interactive 2D/3D WebGIS Map */}
      <main className="flex-1 relative h-full">
        <MapViewer
          currentStep={currentStep}
          activeLayers={layers}
          onSelectNode={(node) => setSelectedNode(node)}
        />
      </main>
    </div>
  );
}