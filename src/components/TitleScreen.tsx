import React from 'react';
import { Play, Grid, Sparkles, Settings as SettingsIcon, HelpCircle, Compass } from 'lucide-react';
import { GyroSensorState } from '../game/input';
import { TrackDefinition } from '../game/types';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenLevelSelect: () => void;
  onOpenCustomization: () => void;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
  sensorState: GyroSensorState;
  onRequestSensorPermission: () => void;
  selectedTrack: TrackDefinition;
  coins: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenLevelSelect,
  onOpenCustomization,
  onOpenSettings,
  onOpenHowToPlay,
  sensorState,
  onRequestSensorPermission,
  selectedTrack,
  coins,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none select-none z-20">
      {/* Top Bar: Coin Balance & Selected Course */}
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto pointer-events-auto">
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-full px-4 py-1.5 text-xs text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span>Course:</span>
          <span className="font-semibold text-white">{selectedTrack.name}</span>
          <span className="text-slate-400 text-[10px]">({selectedTrack.difficulty})</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Gyro Sensor Status Pill */}
          <button
            onClick={onRequestSensorPermission}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition border ${
              sensorState.permissionGranted
                ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                : 'bg-amber-950/70 border-amber-500/50 text-amber-300 active:scale-95 cursor-pointer'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>
              {sensorState.permissionGranted ? 'Gyro Active' : 'Tap to Enable Gyro'}
            </span>
          </button>

          {/* Gyro Coins */}
          <div className="flex items-center gap-1.5 bg-amber-950/70 border border-amber-500/50 rounded-full px-3.5 py-1.5 text-xs font-semibold text-amber-300 tabular-nums">
            <span className="text-base leading-none">🪙</span>
            <span>{coins}</span>
          </div>
        </div>
      </div>

      {/* Hero Title Lockup & 35-40% Negative Space */}
      <div className="flex flex-col items-center justify-center text-center my-auto pointer-events-auto">
        {/* Custom SVG Emblem Lockup */}
        <div className="relative mb-3 flex items-center justify-center">
          <svg className="w-48 h-14" viewBox="0 0 240 60" fill="none">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Background cyber wings */}
            <path
              d="M10 30 L45 10 L55 30 L45 50 Z"
              fill="#0369a1"
              opacity="0.4"
            />
            <path
              d="M230 30 L195 10 L185 30 L195 50 Z"
              fill="#0369a1"
              opacity="0.4"
            />
            {/* Center Orb Silhouette */}
            <circle cx="120" cy="30" r="22" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
            <circle cx="120" cy="30" r="16" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4 2" />
            <ellipse cx="120" cy="30" rx="20" ry="7" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
            <circle cx="120" cy="30" r="4" fill="#38bdf8" filter="url(#glow)" />
          </svg>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-100 to-cyan-500 uppercase drop-shadow-md">
          GYRO ROLL
        </h1>
        <p className="text-xs md:text-sm text-cyan-200/80 font-medium tracking-widest uppercase mt-1">
          Precision 3D Obstacle Course
        </p>

        {/* Primary Start Action */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            data-start="true"
            onClick={onStartGame}
            className="flex items-center gap-3 px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base md:text-lg rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.5)] active:scale-95 transition cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>PLAY NOW</span>
          </button>

          {/* Secondary Action Menu Bar */}
          <div className="flex items-center flex-wrap justify-center gap-2 mt-2">
            <button
              onClick={onOpenLevelSelect}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 transition active:scale-95 cursor-pointer"
            >
              <Grid className="w-4 h-4 text-cyan-400" />
              <span>TRACKS</span>
            </button>
            <button
              onClick={onOpenCustomization}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>BALL GARAGE</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 transition active:scale-95 cursor-pointer"
            >
              <SettingsIcon className="w-4 h-4 text-slate-400" />
              <span>SETTINGS</span>
            </button>
            <button
              onClick={onOpenHowToPlay}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 transition active:scale-95 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>HOW TO PLAY</span>
            </button>
          </div>
        </div>
      </div>

      {/* Flat Control-Hint Line at bottom */}
      <div className="w-full text-center pointer-events-none">
        <p className="text-[11px] md:text-xs text-slate-400 font-mono tracking-wide">
          Tilt Phone / A·D Steer · W·S Throttle · Space Brake · Esc Pause · Enter to Start
        </p>
      </div>
    </div>
  );
};
