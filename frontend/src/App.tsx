import React, { useState, useEffect } from 'react';
import { TimeSlider } from './components/TimeSlider';
import { MapViewer } from './components/MapViewer';
import { MunicipalAlertModal } from './components/MunicipalAlertModal';
import { FileText, Loader2, Building2 } from 'lucide-react';
import { generateAndDownloadSitRep } from './utils/sitrepGenerator';
import { 
  INUNDATED_STREETS, 
  DRAINAGE_NODES, 
  type DrainageNode 
} from './data/mockGisData';

export default function App() {
  const [currentStep, setCurrentStep] = useState<number>(2); // T=+30 mins
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<DrainageNode | null>(DRAINAGE_NODES[0]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'forecast' | 'drainage' | 'transit'>('forecast');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  const [layers, setLayers] = useState({
    inundation: true,
    drainage: true,
    radar: true,
    routes: true,
  });

  const stepFactor = currentStep / 4;
  const maxProjectedDepth = 28 + stepFactor * 6.5;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev >= 12 ? 0 : prev + 1));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleExportSitRep = async () => {
    setIsExporting(true);
    try {
      await generateAndDownloadSitRep({
        leadTimeMinutes: currentStep * 15,
        peakDepth: maxProjectedDepth,
        dbzReflectivity: 24.5 + stepFactor * 7.5,
        activeStep: currentStep,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleLayer = (layerKey: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden antialiased">
      
      {/* 1. Institutional Top Navigation Bar */}
      <header className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded bg-blue-500"></div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Ministry of Earth Sciences (MoES) &bull; HydroCast AI
            </span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="text-xs font-medium text-zinc-400">
            Mumbai Urban Inundation Nowcasting System
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-2 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>U-Net: 184ms</span>
          </div>

          {/* Automated Incident SitRep PDF Button */}
          <button
            onClick={handleExportSitRep}
            disabled={isExporting}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition cursor-pointer font-sans text-xs font-semibold disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Synthesizing SitRep...</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>Export SitRep PDF</span>
              </>
            )}
          </button>

          <div className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px]">
            MCGM DISASTER OPS
          </div>
        </div>
      </header>

      {/* 2. Main Workspace: Sidebar + Map */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Operations Sidebar */}
        <aside className="w-96 bg-zinc-900/95 border-r border-zinc-800 flex flex-col justify-between shrink-0 z-20">
          
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-110px)]">
            
            {/* Temporal Scrubber */}
            <TimeSlider
              currentStep={currentStep}
              onStepChange={(step) => {
                setIsPlaying(false);
                setCurrentStep(step);
              }}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
            />

            {/* High-Level Stat Bar */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900 border border-zinc-800 rounded p-2.5">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Peak Water Depth
                </span>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {maxProjectedDepth.toFixed(1)} <span className="text-xs font-normal text-zinc-400">cm</span>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded p-2.5">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Closed Intersections
                </span>
                <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                  {INUNDATED_STREETS.filter(s => (s.baseDepth + stepFactor * 6.5) > 30).length} <span className="text-xs font-normal text-zinc-400">Nodes</span>
                </div>
              </div>
            </div>

            {/* Layer Filter Toolbar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded p-2 space-y-1.5">
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-1">
                Active Map Layers
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                {(['inundation', 'drainage', 'routes', 'radar'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => toggleLayer(key)}
                    className={`py-1 rounded font-medium border text-center transition cursor-pointer capitalize ${
                      layers[key]
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Segmented Operational Navigation Tabs */}
            <div>
              <div className="flex border-b border-zinc-800 text-xs font-medium">
                <button
                  onClick={() => setActiveTab('forecast')}
                  className={`pb-2 px-3 border-b-2 transition cursor-pointer ${
                    activeTab === 'forecast'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Ward Forecast
                </button>
                <button
                  onClick={() => setActiveTab('drainage')}
                  className={`pb-2 px-3 border-b-2 transition cursor-pointer ${
                    activeTab === 'drainage'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Drainage Grid
                </button>
                <button
                  onClick={() => setActiveTab('transit')}
                  className={`pb-2 px-3 border-b-2 transition cursor-pointer ${
                    activeTab === 'transit'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Transit Routing
                </button>
              </div>

              {/* Tab Panel 1: Ward Forecast */}
              {activeTab === 'forecast' && (
                <div className="pt-3 space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex justify-between">
                    <span>Monitored Vulnerable Intersections</span>
                    <span className="text-[10px] font-mono text-zinc-400">DEM Coupled</span>
                  </div>

                  <div className="space-y-1.5">
                    {INUNDATED_STREETS.map((street) => {
                      const depth = street.baseDepth + stepFactor * 6.5;
                      const isClosed = depth > 30;

                      return (
                        <div key={street.id} className="bg-zinc-900 border border-zinc-800 rounded p-2 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-medium text-zinc-200">{street.name}</div>
                            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                              Est: <span className={isClosed ? 'text-rose-400 font-bold' : 'text-amber-400'}>{depth.toFixed(1)} cm</span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                            isClosed ? 'bg-rose-950/60 border border-rose-800 text-rose-300' : 'bg-amber-950/60 border border-amber-800 text-amber-300'
                          }`}>
                            {isClosed ? 'Closed' : 'Caution'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab Panel 2: Drainage Grid */}
              {activeTab === 'drainage' && (
                <div className="pt-3 space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Stormwater Surcharge Telemetry
                  </div>

                  <div className="space-y-1.5">
                    {DRAINAGE_NODES.map((node) => (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`p-2 rounded border cursor-pointer transition ${
                          selectedNode?.id === node.id
                            ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex justify-between font-medium">
                          <span>{node.name}</span>
                          <span className="font-mono text-zinc-400">{node.capacityUsed}% Load</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-zinc-400 mt-1 font-mono">
                          <span>Status: <span className="text-purple-400 uppercase">{node.surchargeStatus}</span></span>
                          <span>7.4 m³/s</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab Panel 3: Transit Routing */}
              {activeTab === 'transit' && (
                <div className="pt-3 space-y-2.5 text-xs">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Emergency Evacuation Corridor (A*)
                  </div>

                  <div className="space-y-2 font-mono">
                    <div className="p-2.5 rounded bg-zinc-900 border border-rose-900/60 text-zinc-300">
                      <div className="text-[10px] uppercase font-sans font-semibold text-rose-400">Shortest Route (Blocked)</div>
                      <div className="text-zinc-200 font-bold mt-0.5">4.2 km &bull; 3 Submerged Chokepoints</div>
                      <div className="text-[11px] text-zinc-400 mt-1">Traverses Milan Subway & Hindmata Junction</div>
                    </div>

                    <div className="p-2.5 rounded bg-zinc-900 border border-emerald-900/60 text-zinc-300">
                      <div className="text-[10px] uppercase font-sans font-semibold text-emerald-400">HydroCast Recommended Path</div>
                      <div className="text-zinc-200 font-bold mt-0.5">5.8 km &bull; 0 Submerged Chokepoints</div>
                      <div className="text-[11px] text-zinc-400 mt-1">Routed via Western Express Elevated Flyover</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Action Footer: Official Municipal Dispatch Trigger */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-950">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs tracking-wider transition cursor-pointer flex items-center justify-center space-x-2"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Initiate Municipal CAP Directive</span>
            </button>
          </div>
        </aside>

        {/* Right Map Viewport */}
        <main className="flex-1 relative h-full">
          <MapViewer
            currentStep={currentStep}
            activeLayers={layers}
            onSelectNode={(node) => setSelectedNode(node)}
          />
        </main>
      </div>

      {/* Emergency Municipality Dispatch Modal */}
      <MunicipalAlertModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        leadTimeMinutes={currentStep * 15}
        peakDepth={maxProjectedDepth}
      />
    </div>
  );
}