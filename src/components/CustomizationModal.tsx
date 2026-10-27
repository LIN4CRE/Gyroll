import React, { useState } from 'react';
import { X, Check, Lock, Sparkles, CircleDot, Sliders, Palette } from 'lucide-react';
import { BALL_SKINS, BALL_TRAILS, unlockSkin, unlockTrail, updateTrailConfig } from '../game/customization';
import { BallSkin, BallTrail, TrailCustomConfig, UserProgress } from '../game/types';
import { sound } from '../game/audio';

interface CustomizationModalProps {
  onClose: () => void;
  progress: UserProgress;
  onUpdateProgress: (updated: UserProgress) => void;
  onPreviewSkin: (skin: BallSkin) => void;
  onPreviewTrail: (trail: BallTrail, config?: TrailCustomConfig) => void;
}

const PRESET_COLORS = [
  '#38bdf8', // sky
  '#06b6d4', // cyan
  '#22c55e', // emerald
  '#eab308', // amber
  '#ea580c', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#a855f7', // purple
  '#ffffff', // white
  '#1e1b4b', // deep void
];

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  onClose,
  progress,
  onUpdateProgress,
  onPreviewSkin,
  onPreviewTrail,
}) => {
  const [tab, setTab] = useState<'skins' | 'trails'>('skins');
  const [selectedTrailToTune, setSelectedTrailToTune] = useState<string>(progress.selectedTrailId);

  const activeTrail = BALL_TRAILS.find((t) => t.id === selectedTrailToTune) || BALL_TRAILS[1];
  const activeTrailConfig: TrailCustomConfig =
    progress.trailConfigs[selectedTrailToTune] || activeTrail.defaultConfig;

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
    const config = progress.trailConfigs[trail.id] || trail.defaultConfig;
    const updated: UserProgress = {
      ...progress,
      selectedTrailId: trail.id,
    };
    onUpdateProgress(updated);
    setSelectedTrailToTune(trail.id);
    onPreviewTrail(trail, config);
  };

  const handleUnlockTrail = (trail: BallTrail) => {
    const res = unlockTrail(progress, trail.id);
    if (res.success) {
      sound.playFinish();
      onUpdateProgress(res.progress);
      setSelectedTrailToTune(trail.id);
      onPreviewTrail(trail, progress.trailConfigs[trail.id] || trail.defaultConfig);
    }
  };

  const handleUpdateConfig = (partial: Partial<TrailCustomConfig>) => {
    const updated = updateTrailConfig(progress, selectedTrailToTune, partial);
    onUpdateProgress(updated);
    onPreviewTrail(activeTrail, updated.trailConfigs[selectedTrailToTune]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 select-none">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">BALL GARAGE</h2>
            <p className="text-xs text-slate-400">
              Customize ball materials, aerodynamic trails, and particle parameters
            </p>
          </div>

          <div className="flex items-center gap-4">
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

        {/* Top Tab Bar */}
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
            <span>BALL TRAILS & TUNING</span>
          </button>
        </div>

        {/* Content Body */}
        {tab === 'skins' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 my-4 overflow-y-auto pr-1">
            {BALL_SKINS.map((skin) => {
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
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-4 overflow-y-auto pr-1 flex-1">
            {/* Trail Catalog (7 cols) */}
            <div className="md:col-span-7 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                CHOOSE TRAIL STYLE
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BALL_TRAILS.map((trail) => {
                  const isUnlocked = progress.unlockedTrails.includes(trail.id);
                  const isSelected = progress.selectedTrailId === trail.id;
                  const isTuning = selectedTrailToTune === trail.id;
                  const canAfford = progress.coins >= trail.price;

                  return (
                    <div
                      key={trail.id}
                      onClick={() => {
                        setSelectedTrailToTune(trail.id);
                        onPreviewTrail(trail, progress.trailConfigs[trail.id] || trail.defaultConfig);
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        isTuning
                          ? 'bg-cyan-950/40 border-cyan-400'
                          : 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-4 h-4 rounded-full border border-white/20 shadow-md"
                              style={{ backgroundColor: trail.particleColor || '#334155' }}
                            />
                            {trail.secondaryColor && (
                              <div
                                className="w-3 h-3 rounded-full border border-white/20 -ml-2"
                                style={{ backgroundColor: trail.secondaryColor }}
                              />
                            )}
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-cyan-400 uppercase flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> In Use
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-white text-xs">{trail.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {trail.description}
                        </p>
                        {!isUnlocked && (
                          <span className="text-[9px] text-amber-400/90 font-mono mt-1 block">
                            {trail.unlockRequirement}
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 pt-1.5 border-t border-slate-700/60 flex items-center justify-between">
                        {isUnlocked ? (
                          isSelected ? (
                            <span className="text-[10px] font-semibold text-cyan-300">Equipped</span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEquipTrail(trail);
                              }}
                              className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold text-[10px] transition cursor-pointer"
                            >
                              Equip
                            </button>
                          )
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlockTrail(trail);
                            }}
                            disabled={!canAfford}
                            className={`px-3 py-1 rounded font-bold text-[10px] transition cursor-pointer ${
                              canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            Unlock 🪙 {trail.price}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trail Customization Tuning Panel (5 cols) */}
            <div className="md:col-span-5 p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    TUNING: {activeTrail.name}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Real-time</span>
                </div>

                {activeTrail.particleType === 'none' ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No particle parameters available for 'None' trail. Select a particle trail on the left to tune.
                  </div>
                ) : (
                  <div className="space-y-3.5 mt-3 text-xs">
                    {/* Primary Color */}
                    <div>
                      <span className="text-slate-300 block mb-1">Primary Color</span>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => handleUpdateConfig({ primaryColor: c })}
                            className={`w-5 h-5 rounded-full border transition cursor-pointer ${
                              activeTrailConfig.primaryColor === c
                                ? 'ring-2 ring-cyan-400 scale-110'
                                : 'border-white/20'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Secondary Color */}
                    {activeTrail.secondaryColor && (
                      <div>
                        <span className="text-slate-300 block mb-1">Secondary Accent</span>
                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => handleUpdateConfig({ secondaryColor: c })}
                              className={`w-5 h-5 rounded-full border transition cursor-pointer ${
                                activeTrailConfig.secondaryColor === c
                                ? 'ring-2 ring-pink-400 scale-110'
                                : 'border-white/20'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trail Length Preset */}
                    <div>
                      <span className="text-slate-300 block mb-1">Trail Length</span>
                      <div className="grid grid-cols-3 gap-1">
                        {(['short', 'medium', 'long'] as const).map((len) => (
                          <button
                            key={len}
                            onClick={() => handleUpdateConfig({ length: len })}
                            className={`py-1 rounded text-[11px] font-semibold uppercase transition cursor-pointer ${
                              activeTrailConfig.length === len
                                ? 'bg-cyan-500 text-slate-950 font-bold'
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {len}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Particle Density */}
                    <div>
                      <span className="text-slate-300 block mb-1">Density (Performance)</span>
                      <div className="grid grid-cols-3 gap-1">
                        {(['low', 'medium', 'high'] as const).map((den) => (
                          <button
                            key={den}
                            onClick={() => handleUpdateConfig({ density: den })}
                            className={`py-1 rounded text-[11px] font-semibold uppercase transition cursor-pointer ${
                              activeTrailConfig.density === den
                                ? 'bg-cyan-500 text-slate-950 font-bold'
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {den}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Glow Intensity */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-300">Glow Intensity</span>
                        <span className="font-mono text-cyan-400">
                          {activeTrailConfig.glowIntensity.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={activeTrailConfig.glowIntensity}
                        onChange={(e) => handleUpdateConfig({ glowIntensity: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-700/60">
                Tuned settings automatically save and apply during gameplay.
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Live 3D turntable preview running in background.</span>
        </div>
      </div>
    </div>
  );
};
