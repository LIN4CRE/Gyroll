import React from 'react';
import { X, Sliders, Volume2, Compass, Cpu, Vibrate } from 'lucide-react';
import { UserProgress } from '../game/types';
import { GyroSensorState } from '../game/input';
import { sound } from '../game/audio';
import { haptics } from '../game/haptics';

interface SettingsModalProps {
  onClose: () => void;
  progress: UserProgress;
  onUpdateSettings: (settings: UserProgress['settings']) => void;
  sensorState: GyroSensorState;
  onCalibrate: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  progress,
  onUpdateSettings,
  sensorState,
  onCalibrate,
}) => {
  const settings = progress.settings;

  const update = (partial: Partial<UserProgress['settings']>) => {
    const updated = { ...settings, ...partial };
    onUpdateSettings(updated);
    sound.setVolumes(
      updated.sfxVolume,
      updated.sfxVolume,
      updated.engineVolume,
      updated.isMuted
    );
    if (partial.enableHaptics !== undefined) {
      haptics.setEnabled(partial.enableHaptics);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 select-none">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">SETTINGS</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="space-y-4 my-4 overflow-y-auto pr-1 text-xs md:text-sm">
          {/* Section 1: Adaptive Difficulty System */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                ADAPTIVE DIFFICULTY SYSTEM
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableAdaptiveDifficulty}
                  onChange={(e) => update({ enableAdaptiveDifficulty: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Subtly tailors moving obstacle speeds and balance beam safe margins based on sustained player performance. When disabled, courses use default standard difficulty.
            </p>
            {settings.enableAdaptiveDifficulty && progress.adaptiveDifficulty && (
              <div className="mt-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/90 text-[11px] font-mono">
                <span className="text-slate-400">Current AI Tuning:</span>
                <span className="text-cyan-300 font-bold">
                  {progress.adaptiveDifficulty.label} ({progress.adaptiveDifficulty.multiplier.toFixed(2)}x)
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Motion Sensor & Tilt */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-cyan-400" />
                MOTION SENSOR & TILT
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                {sensorState.permissionGranted ? 'SENSOR ACTIVE' : 'NO SENSOR / DENIED'}
              </span>
            </div>

            {/* Live Visualizer + Calibration Button */}
            <div className="flex items-center justify-between gap-4 p-3 bg-slate-900/80 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full bg-slate-950 border border-cyan-500/50 flex items-center justify-center">
                  <div
                    className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-transform duration-75"
                    style={{
                      transform: `translate(${sensorState.tiltPercentX * 16}px, ${-sensorState.tiltPercentY * 16}px)`,
                    }}
                  />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">
                    Roll: <span className="font-mono text-white">{sensorState.rawGamma.toFixed(1)}°</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Pitch: <span className="font-mono text-white">{sensorState.rawBeta.toFixed(1)}°</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  onCalibrate();
                }}
                className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs active:scale-95 transition cursor-pointer"
              >
                CALIBRATE NEUTRAL
              </button>
            </div>

            {/* Tilt Sensitivity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">Tilt Sensitivity</span>
                <span className="font-mono text-cyan-400">{settings.sensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={settings.sensitivity}
                onChange={(e) => update({ sensitivity: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Deadzone */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">Tilt Deadzone</span>
                <span className="font-mono text-cyan-400">{Math.round(settings.deadzone * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.15"
                step="0.01"
                value={settings.deadzone}
                onChange={(e) => update({ deadzone: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Invert Steering */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Invert Steering Direction</span>
              <input
                type="checkbox"
                checked={settings.invertSteering}
                onChange={(e) => update({ invertSteering: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Section 3: Control Scheme */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <span className="font-bold text-white block">INPUT METHOD</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'auto', label: 'Auto (Sensor or Keys)' },
                { id: 'gyro', label: 'Gyroscope Only' },
                { id: 'touch_slider', label: 'Touch Drag Slider' },
                { id: 'touch_buttons', label: 'Left / Right Zones' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    sound.playClick();
                    update({ controlMode: m.id as any });
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition cursor-pointer ${
                    settings.controlMode === m.id
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Haptics & Audio */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Vibrate className="w-4 h-4 text-cyan-400" />
                HAPTIC FEEDBACK (MOBILE)
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableHaptics}
                  onChange={(e) => update({ enableHaptics: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400"
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                AUDIO VOLUMES
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-slate-400 text-xs">Mute</span>
                <input
                  type="checkbox"
                  checked={settings.isMuted}
                  onChange={(e) => update({ isMuted: e.target.checked })}
                  className="accent-cyan-400"
                />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">Sound Effects (SFX)</span>
                <span className="font-mono text-cyan-400">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => update({ sfxVolume: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">Ball Rolling Rumble</span>
                <span className="font-mono text-cyan-400">{Math.round(settings.engineVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.engineVolume}
                onChange={(e) => update({ engineVolume: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs active:scale-95 transition cursor-pointer"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
