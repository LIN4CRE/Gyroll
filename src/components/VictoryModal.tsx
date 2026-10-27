import React from 'react';
import { Trophy, Star, RotateCcw, ArrowRight, Grid } from 'lucide-react';
import { TrackDefinition } from '../game/types';

interface VictoryModalProps {
  track: TrackDefinition;
  time: number;
  falls: number;
  stars: number;
  earnedCoins: number;
  isNewBest: boolean;
  onReplay: () => void;
  onNextTrack: () => void;
  onLevelSelect: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  track,
  time,
  falls,
  stars,
  earnedCoins,
  isNewBest,
  onReplay,
  onNextTrack,
  onLevelSelect,
}) => {
  const formattedTime = time.toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 select-none">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col text-center">
        {/* Trophy Header */}
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/60 flex items-center justify-center mb-3">
          <Trophy className="w-8 h-8 text-amber-400" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-wider uppercase">
          COURSE COMPLETED!
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Course: <span className="font-semibold text-cyan-400">{track.name}</span>
        </p>

        {/* Stars */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`p-2 rounded-xl border transition-transform duration-300 ${
                s <= stars
                  ? 'bg-amber-950/60 border-amber-500/80 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-800/40 border-slate-700 opacity-40'
              }`}
            >
              <Star
                className={`w-7 h-7 ${
                  s <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-800/80 border border-slate-700 rounded-xl mb-4 text-center">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              TIME
            </span>
            <span className="font-mono font-bold text-base text-white tabular-nums">
              {formattedTime}s
            </span>
            {isNewBest && (
              <span className="text-[9px] font-bold text-cyan-400 uppercase block">
                NEW BEST!
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              FALLS
            </span>
            <span
              className={`font-mono font-bold text-base tabular-nums ${
                falls === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {falls}
            </span>
            {falls === 0 && (
              <span className="text-[9px] font-bold text-emerald-400 uppercase block">
                CLEAN RUN
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              REWARD
            </span>
            <span className="font-mono font-bold text-base text-amber-400 tabular-nums">
              +🪙 {earnedCoins}
            </span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase block">
              COINS
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            data-start="true"
            onClick={onNextTrack}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm active:scale-95 transition cursor-pointer"
          >
            <span>NEXT COURSE</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={onReplay}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>REPLAY</span>
            </button>

            <button
              onClick={onLevelSelect}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition active:scale-95 cursor-pointer"
            >
              <Grid className="w-3.5 h-3.5 text-amber-400" />
              <span>COURSES</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
