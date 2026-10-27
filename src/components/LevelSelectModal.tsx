import React, { useState } from 'react';
import { X, Play, Trophy, Clock, Star, Medal, Award, CheckCircle2 } from 'lucide-react';
import { TRACKS } from '../game/tracks';
import { TrackDefinition, UserProgress } from '../game/types';
import { sound } from '../game/audio';

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
  const [activeLeaderboardTrackId, setActiveLeaderboardTrackId] = useState<string | null>(null);

  const activeLeaderboardTrack = TRACKS.find((t) => t.id === activeLeaderboardTrackId);
  const activeLeaderboardEntries = activeLeaderboardTrackId
    ? progress.leaderboards[activeLeaderboardTrackId] || []
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 select-none">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">SELECT COURSE</h2>
            <p className="text-xs text-slate-400">
              Handcrafted 3D physics courses with local leaderboards & performance progression
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher: Course Grid vs Leaderboard Drawer */}
        {activeLeaderboardTrack ? (
          <div className="my-5 overflow-y-auto pr-1 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveLeaderboardTrackId(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  ← BACK TO COURSES
                </button>
                <span className="font-bold text-white text-base">
                  Top 10 Times: {activeLeaderboardTrack.name}
                </span>
              </div>
              <button
                onClick={() => onSelectTrack(activeLeaderboardTrack)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs active:scale-95 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>RACE NOW</span>
              </button>
            </div>

            {/* Top 10 Table */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 bg-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="col-span-2">RANK</span>
                <span className="col-span-4">PILOT</span>
                <span className="col-span-3">TIME</span>
                <span className="col-span-3 text-right">MEDAL / DATE</span>
              </div>

              <div className="divide-y divide-slate-800/60">
                {activeLeaderboardEntries.length > 0 ? (
                  activeLeaderboardEntries.map((entry, idx) => {
                    const isPodium = idx < 3;
                    return (
                      <div
                        key={entry.id || idx}
                        className={`grid grid-cols-12 px-4 py-2.5 items-center text-xs transition ${
                          idx === 0
                            ? 'bg-amber-500/10 text-amber-200'
                            : idx === 1
                            ? 'bg-slate-500/10 text-slate-200'
                            : idx === 2
                            ? 'bg-amber-700/10 text-amber-300'
                            : 'text-slate-300 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="col-span-2 flex items-center gap-1.5 font-mono font-bold">
                          {idx === 0 ? (
                            <Medal className="w-4 h-4 text-amber-400" />
                          ) : idx === 1 ? (
                            <Medal className="w-4 h-4 text-slate-300" />
                          ) : idx === 2 ? (
                            <Medal className="w-4 h-4 text-amber-600" />
                          ) : (
                            <span className="w-4 text-center text-slate-500 font-mono">
                              #{idx + 1}
                            </span>
                          )}
                        </div>

                        <div className="col-span-4 flex items-center gap-2 font-medium">
                          <span className="truncate">{entry.playerName}</span>
                          {entry.zeroFalls && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/40 text-[9px] font-bold text-emerald-400">
                              CLEAN
                            </span>
                          )}
                        </div>

                        <div className="col-span-3 font-mono font-bold tabular-nums text-cyan-300 text-sm">
                          {entry.time.toFixed(2)}s
                        </div>

                        <div className="col-span-3 flex items-center justify-end gap-2 text-[11px] text-slate-400 font-mono">
                          <div className="flex items-center text-amber-400">
                            {'★'.repeat(entry.stars || 1)}
                          </div>
                          <span>{entry.date}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No run times recorded yet. Complete this course to set the #1 record!
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6 overflow-y-auto pr-1">
            {TRACKS.map((track, idx) => {
              const record = progress.trackRecords[track.id];
              const isCompleted = record?.completed;
              const stars = record?.stars || 0;
              const bestEntry = (progress.leaderboards[track.id] || [])[0];

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

                    {/* Weather badge */}
                    {track.weather && track.weather !== 'none' && (
                      <div className="mt-2 text-[10px] font-semibold text-cyan-300/80 capitalize flex items-center gap-1">
                        <span>Atmosphere:</span>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                          {track.weather}
                        </span>
                      </div>
                    )}

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
                          CLEAN RUN
                        </span>
                      )}
                    </div>

                    {/* Record & Target times */}
                    <div className="mt-3 pt-3 border-t border-slate-700/60 text-[11px] text-slate-300 space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-400">Target Gold:</span>
                        <span className="text-amber-400">{track.targetTimes.gold}s</span>
                      </div>
                      {bestEntry ? (
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-slate-400">#1 Record:</span>
                          <span className="text-cyan-400 font-bold">
                            {bestEntry.time.toFixed(2)}s ({bestEntry.playerName})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-slate-400">Status:</span>
                          <span className="text-slate-400 italic">Unbeaten</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Race Course & Top Times */}
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      onClick={() => onSelectTrack(track)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs active:scale-95 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>RACE COURSE</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick();
                        setActiveLeaderboardTrackId(track.id);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition cursor-pointer"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>TOP 10 TIMES</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Earn 🪙 Gyro Coins and Stars to unlock new balls and trails in the garage!</span>
        </div>
      </div>
    </div>
  );
};
