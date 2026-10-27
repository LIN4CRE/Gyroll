import React, { useState } from 'react';
import { X, Check, Lock, Sparkles, CircleDot } from 'lucide-react';
import { BALL_SKINS, BALL_TRAILS, unlockSkin, unlockTrail } from '../game/customization';
import { BallSkin, BallTrail, UserProgress } from '../game/types';
import { sound } from '../game/audio';

interface CustomizationModalProps {
  onClose: () => void;
  progress: UserProgress;
  onUpdateProgress: (updated: UserProgress) => void;
  onPreviewSkin: (skin: BallSkin) => void;
  onPreviewTrail: (trail: BallTrail) => void;
}

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  onClose,
  progress,
  onUpdateProgress,
  onPreviewSkin,
  onPreviewTrail,
}) => {
  const [tab, setTab] = useState<'skins' | 'trails'>('skins');

  const handleEquipSkin = (skin: BallSkin) => {
    sound.playClick();
    const updated: UserProgress = {
      ...progress,
      selectedSkinId: skin.id,
    };
    onUpdateProgress(updated);
    onPreviewSkin(skin);
  };

  const handleUnlockSkin = (skin: BallSkin) => {
    const res = unlockSkin(progress, skin.id);
    if (res.success) {
      sound.playFinish();
      onUpdateProgress(res.progress);
      onPreviewSkin(skin);
    }
  };

  const handleEquipTrail = (trail: BallTrail) => {
    sound.playClick();
    const updated: UserProgress = {
      ...progress,
      selectedTrailId: trail.id,
    };
    onUpdateProgress(updated);
    onPreviewTrail(trail);
  };

  const handleUnlockTrail = (trail: BallTrail) => {
    const res = unlockTrail(progress, trail.id);
    if (res.success) {
      sound.playFinish();
      onUpdateProgress(res.progress);
      onPreviewTrail(trail);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">BALL GARAGE</h2>
            <p className="text-xs text-slate-400">Customize ball materials, finishes, and aerodynamic trails</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Coins */}
            <div className="flex items-center gap-1.5 bg-amber-950/70 border border-amber-500/50 rounded-full px-3.5 py-1 text-xs font-semibold text-amber-300 tabular-nums">
              <span>🪙</span>
              <span>{progress.coins}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => {
              setTab('skins');
              sound.playClick();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'skins'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <CircleDot className="w-4 h-4" />
            <span>BALL SKINS</span>
          </button>
          <button
            onClick={() => {
              setTab('trails');
              sound.playClick();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'trails'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>PARTICLE TRAILS</span>
          </button>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 my-4 overflow-y-auto pr-1">
          {tab === 'skins'
            ? BALL_SKINS.map((skin) => {
                const isUnlocked = progress.unlockedSkins.includes(skin.id);
                const isSelected = progress.selectedSkinId === skin.id;
                const canAfford = progress.coins >= skin.price;

                return (
                  <div
                    key={skin.id}
                    onMouseEnter={() => onPreviewSkin(skin)}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border transition ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400'
                        : 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div>
                      {/* Color Preview Swatch */}
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="w-7 h-7 rounded-full border border-white/20 shadow-inner"
                          style={{
                            background: `radial-gradient(circle at 30% 30%, ${skin.color}, #090d16)`,
                            boxShadow: `0 0 10px ${skin.emissive || 'transparent'}`,
                          }}
                        />
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 uppercase">
                            <Check className="w-3 h-3" /> Equipped
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-white text-sm">{skin.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {skin.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-700/60">
                      {isUnlocked ? (
                        isSelected ? (
                          <button
                            disabled
                            className="w-full py-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 font-semibold text-xs border border-cyan-800"
                          >
                            EQUIPPED
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquipSkin(skin)}
                            className="w-full py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs active:scale-95 transition cursor-pointer"
                          >
                            EQUIP
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleUnlockSkin(skin)}
                          disabled={!canAfford}
                          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>UNLOCK 🪙 {skin.price}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            : BALL_TRAILS.map((trail) => {
                const isUnlocked = progress.unlockedTrails.includes(trail.id);
                const isSelected = progress.selectedTrailId === trail.id;
                const canAfford = progress.coins >= trail.price;

                return (
                  <div
                    key={trail.id}
                    onMouseEnter={() => onPreviewTrail(trail)}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border transition ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400'
                        : 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="w-7 h-7 rounded-full border border-white/20 shadow-md"
                          style={{ backgroundColor: trail.particleColor || '#334155' }}
                        />
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 uppercase">
                            <Check className="w-3 h-3" /> Equipped
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-white text-sm">{trail.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {trail.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-700/60">
                      {isUnlocked ? (
                        isSelected ? (
                          <button
                            disabled
                            className="w-full py-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 font-semibold text-xs border border-cyan-800"
                          >
                            EQUIPPED
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquipTrail(trail)}
                            className="w-full py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs active:scale-95 transition cursor-pointer"
                          >
                            EQUIP
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleUnlockTrail(trail)}
                          disabled={!canAfford}
                          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>UNLOCK 🪙 {trail.price}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Turntable 3D preview active in background.</span>
        </div>
      </div>
    </div>
  );
};
