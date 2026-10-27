import React from 'react';
import { Pause, RotateCcw, Volume2, VolumeX, Compass, ShieldAlert, Sparkles } from 'lucide-react';
import { GyroSensorState } from '../game/input';
import { TrackDefinition } from '../game/types';

interface GameHUDProps {
  track: TrackDefinition;
  speed: number;
  time: number;
  falls: number;
  currentCheckpoint: number;
  totalCheckpoints: number;
  isRecovering: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onCalibrate: () => void;
  sensorState: GyroSensorState;
  controlMode: 'auto' | 'gyro' | 'touch_slider' | 'touch_buttons';
  onTouchSteer: (steer: number, throttle: number, brake: boolean) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  track,
  speed,
  time,
  falls,
  currentCheckpoint,
  totalCheckpoints,
  isRecovering,
  isMuted,
  onToggleMute,
  onPause,
  onRestart,
  onCalibrate,
  sensorState,
  controlMode,
  onTouchSteer,
}) => {
  // Format Time 00:00.00
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const hundredths = Math.floor((time * 100) % 100);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;

  // Speed in km/h
  const speedKmh = Math.round(speed * 3.6);

  // Tilt bubble coordinates (-1 to 1 mapped to ±16px offset)
  const bubbleX = sensorState.tiltPercentX * 18;
  const bubbleY = -sensorState.tiltPercentY * 18;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 md:p-6 font-sans">
      {/* Top Perimeter Header */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Track Name & Checkpoint Pips */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 px-3.5 py-1.5 rounded-lg">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: track.themeColor }}
            />
            <span className="font-bold text-xs md:text-sm text-white tracking-wide">
              {track.name}
            </span>
          </div>

          {/* Checkpoint Status */}
          <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 px-3 py-1 rounded-md text-[11px] text-slate-300">
            <span>CHECKPOINT:</span>
            <span className="font-mono font-bold text-cyan-400">
              {currentCheckpoint} / {totalCheckpoints}
            </span>
          </div>
        </div>

        {/* Top-Center: Large Central Chrono Timer */}
        <div className="flex flex-col items-center pointer-events-auto">
          <div className="bg-slate-900/85 border border-cyan-500/40 rounded-xl px-5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
            <span className="font-mono font-bold text-xl md:text-2xl text-cyan-300 tracking-wider tabular-nums">
              {formattedTime}
            </span>
          </div>
          {/* Target Star Goals */}
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
            <span className="text-amber-400">★ {track.targetTimes.gold}s</span>
            <span className="text-slate-400">★ {track.targetTimes.silver}s</span>
            <span className="text-amber-700">★ {track.targetTimes.bronze}s</span>
          </div>
        </div>

        {/* Top-Right: Quick Utilities */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer"
            title="Mute Audio [M]"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onRestart}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer"
            title="Restart Track [R]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onPause}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer"
            title="Pause [Esc]"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Void Notification: Respawn Banner */}
      {isRecovering && (
        <div className="my-auto mx-auto flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-amber-950/90 border border-amber-500/80 text-amber-200 shadow-2xl animate-bounce">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-sm tracking-wider uppercase">
            Recovering to Checkpoint...
          </span>
        </div>
      )}

      {/* Bottom Perimeter: Speedometer, Spirit Bubble Level & Touch Controls */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Speed & Falls */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-baseline gap-1 bg-slate-900/80 border border-slate-700/80 px-4 py-2 rounded-xl">
            <span className="font-mono font-black text-2xl md:text-3xl text-white tabular-nums">
              {speedKmh}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              KM/H
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-800 px-3 py-1 rounded-md text-[11px] text-slate-300">
            <span>FALLS:</span>
            <span
              className={`font-mono font-bold ${
                falls === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {falls}
            </span>
          </div>
        </div>

        {/* Center / Touch Area for On-Screen Controls */}
        <div className="flex-1 max-w-md mx-4 pointer-events-auto flex flex-col items-center">
          {controlMode === 'touch_slider' ? (
            <div className="w-full bg-slate-900/80 border border-cyan-500/40 rounded-2xl p-3 flex flex-col items-center gap-1 shadow-lg">
              <span className="text-[10px] text-cyan-300 font-semibold tracking-wider uppercase">
                Drag to Steer
              </span>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                defaultValue="0"
                onChange={(e) => onTouchSteer(parseFloat(e.target.value), 0, false)}
                onPointerUp={(e) => {
                  (e.target as HTMLInputElement).value = '0';
                  onTouchSteer(0, 0, false);
                }}
                className="w-full accent-cyan-400 h-6 cursor-pointer"
              />
            </div>
          ) : controlMode === 'touch_buttons' ? (
            <div className="w-full flex items-center justify-between gap-4">
              <button
                onPointerDown={() => onTouchSteer(-1.0, 0, false)}
                onPointerUp={() => onTouchSteer(0, 0, false)}
                className="flex-1 py-4 bg-slate-900/80 border border-cyan-500/40 rounded-xl text-cyan-300 font-bold text-sm active:bg-cyan-600 active:text-black transition"
              >
                ◀ STEER LEFT
              </button>
              <button
                onPointerDown={() => onTouchSteer(1.0, 0, false)}
                onPointerUp={() => onTouchSteer(0, 0, false)}
                className="flex-1 py-4 bg-slate-900/80 border border-cyan-500/40 rounded-xl text-cyan-300 font-bold text-sm active:bg-cyan-600 active:text-black transition"
              >
                STEER RIGHT ▶
              </button>
            </div>
          ) : null}
        </div>

        {/* Bottom-Right: Gyro Bubble Level & Calibrate */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Spirit Bubble Level Visualizer */}
          <div className="relative w-14 h-14 rounded-full bg-slate-900/85 border border-cyan-500/50 flex items-center justify-center shadow-lg">
            {/* Center target crosshair */}
            <div className="absolute w-full h-[1px] bg-cyan-500/25"></div>
            <div className="absolute h-full w-[1px] bg-cyan-500/25"></div>
            <div className="w-5 h-5 rounded-full border border-cyan-500/40"></div>
            {/* Floating Gyro Bubble */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-transform duration-75"
              style={{
                transform: `translate(${bubbleX}px, ${bubbleY}px)`,
              }}
            />
          </div>

          {/* Quick Recalibrate Button */}
          <button
            onClick={onCalibrate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-cyan-300 active:scale-95 transition cursor-pointer"
            title="Set current phone angle as neutral center"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>CALIBRATE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
