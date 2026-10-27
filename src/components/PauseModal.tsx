import React from 'react';
import { Play, RotateCcw, Grid, Home } from 'lucide-react';
import { TrackDefinition } from '../game/types';

interface PauseModalProps {
  track: TrackDefinition;
  onResume: () => void;
  onRestart: () => void;
  onLevelSelect: () => void;
  onHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  track,
  onResume,
  onRestart,
  onLevelSelect,
  onHome,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 select-none">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col text-center">
        <h2 className="text-2xl font-black text-white tracking-wider uppercase mb-1">
          PAUSED
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Course: <span className="font-semibold text-cyan-400">{track.name}</span>
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm active:scale-95 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>RESUME</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>RESTART COURSE [R]</span>
          </button>

          <button
            onClick={onLevelSelect}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition active:scale-95 cursor-pointer"
          >
            <Grid className="w-4 h-4 text-amber-400" />
            <span>SELECT COURSE</span>
          </button>

          <button
            onClick={onHome}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
