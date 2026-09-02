import React from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

interface TimeSliderProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const TimeSlider: React.FC<TimeSliderProps> = ({
  currentStep,
  onStepChange,
  isPlaying,
  onTogglePlay,
}) => {
  // Compute projected time based on step
  const now = new Date();
  const projectedTime = new Date(now.getTime() + currentStep * 15 * 60000);
  const formattedProjected = projectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
            Forecast Horizon
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-zinc-400 font-mono">+{currentStep * 15}m</span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono border border-zinc-700">
            {formattedProjected}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2.5">
        <button
          onClick={onTogglePlay}
          className="p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition border border-zinc-700 flex items-center justify-center cursor-pointer"
          title={isPlaying ? "Pause Simulation" : "Play Simulation"}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => onStepChange(0)}
          className="p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition border border-zinc-700 cursor-pointer"
          title="Reset to Live (T=0)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 space-y-1">
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={currentStep}
            onChange={(e) => onStepChange(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
            <span>T+0</span>
            <span>+45m</span>
            <span>+90m</span>
            <span>+135m</span>
            <span>+180m</span>
          </div>
        </div>
      </div>
    </div>
  );
};