import React from 'react';
import { Clock, Play, Pause, FastForward, RotateCcw } from 'lucide-react';

interface TimeSliderProps {
  currentStep: number; // 0 to 12 (0 to 180 minutes in 15m steps)
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
  const totalMinutes = currentStep * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeFormatted = `+${hours}h ${minutes.toString().padStart(2, '0')}m`;

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Nowcasting Window (0–3 Hours)
          </span>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-400 font-mono text-xs font-bold">
          {timeFormatted} Horizon
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onTogglePlay}
          className="p-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold transition shadow-lg active:scale-95 flex items-center justify-center shrink-0"
          title={isPlaying ? "Pause Simulation" : "Play Spatiotemporal Simulation"}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        <button
          onClick={() => onStepChange(0)}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0"
          title="Reset to Live (T=0)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1 space-y-1.5">
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={currentStep}
            onChange={(e) => onStepChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Now (0m)</span>
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