import React from 'react';
import { X, Play, Trophy, Clock, Star } from 'lucide-react';
import { TRACKS } from '../game/tracks';
import { TrackDefinition, UserProgress } from '../game/types';

interface LevelSelectModalProps {
  onClose: () => void;
  onSelectTrack: (track: TrackDefinition) => void;
  progress: UserProgress;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  onClose,
  onSelectTrack,
  progress,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-none select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">SELECT COURSE</h2>
            <p className="text-xs text-slate-400">Choose a 3D obstacle course to tackle</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tracks List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6 overflow-y-auto pr-1">
          {TRACKS.map((track, idx) => {
            const record = progress.trackRecords[track.id];
            const isCompleted = record?.completed;
            const stars = record?.stars || 0;

            return (
              <div
                key={track.id}
                className="flex flex-col justify-between p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-cyan-500/60 transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-950"
                      style={{ backgroundColor: track.themeColor }}
                    >
                      {track.difficulty}
                    </span>
                    <span className="text-xs font-mono text-slate-400">#0{idx + 1}</span>
                  </div>

                  <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition">
                    {track.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {track.description}
                  </p>

                  {/* Stars Display */}
                  <div className="flex items-center gap-1 mt-3">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= stars
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                    {record?.zeroFalls && (
                      <span className="ml-1.5 text-[10px] font-semibold text-emerald-400">
                        CLEAN
                      </span>
                    )}
                  </div>

                  {/* Target and Best Time */}
                  <div className="mt-3 pt-3 border-t border-slate-700/60 text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-400">Target Gold:</span>
                      <span className="text-amber-400">{track.targetTimes.gold}s</span>
                    </div>
                    {isCompleted && (
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-400">Best Time:</span>
                        <span className="text-cyan-400 font-bold">
                          {record.bestTime.toFixed(2)}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Launch Button */}
                <button
                  onClick={() => onSelectTrack(track)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs active:scale-95 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>RACE COURSE</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Earn 🪙 Gyro Coins and Stars to unlock new balls in the garage!</span>
        </div>
      </div>
    </div>
  );
};
