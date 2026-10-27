import React from 'react';
import { X, Smartphone, Keyboard, Shield, Zap, Flag } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 select-none">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">HOW TO PLAY</h2>
            <p className="text-xs text-slate-400">Master phone tilt physics and conquer the obstacle courses</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 my-4 overflow-y-auto pr-1 text-xs md:text-sm">
          {/* Card 1: Mobile Gyro Tilt */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Smartphone className="w-4 h-4" />
              <span>MOBILE GYROSCOPE CONTROLS</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Hold your phone in <strong>Landscape Mode</strong> like a steering wheel:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-center">
                <span className="text-cyan-300 font-bold block text-sm">Tilt Left / Right</span>
                <span className="text-slate-400 text-[11px]">Steers ball laterally across track</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-center">
                <span className="text-cyan-300 font-bold block text-sm">Tilt Forward / Back</span>
                <span className="text-slate-400 text-[11px]">Increases speed or applies brake</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Tip: Tap the <strong>CALIBRATE</strong> button at any time while holding your phone comfortably to set your neutral resting angle!
            </p>
          </div>

          {/* Card 2: PC Keyboard & Touch Alternative */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Keyboard className="w-4 h-4" />
              <span>KEYBOARD & TOUCH CONTROLS</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-300">
              <li><strong className="text-white font-mono">A / D</strong> or <strong className="text-white font-mono">← / →</strong>: Steer Left / Right</li>
              <li><strong className="text-white font-mono">W / S</strong> or <strong className="text-white font-mono">↑ / ↓</strong>: Accelerate forward / Brake</li>
              <li><strong className="text-white font-mono">Space</strong>: Stabilize & Brake</li>
              <li><strong className="text-white font-mono">R</strong>: Quick reset to last checkpoint</li>
              <li><strong className="text-white font-mono">Esc / P</strong>: Pause game</li>
            </ul>
          </div>

          {/* Card 3: Hazard & Obstacle Guide */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Shield className="w-4 h-4" />
              <span>HAZARD TACTICS</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                <strong className="text-cyan-300">Balance Beams:</strong> Keep the tilt bubble centered to avoid plunging into the void.
              </div>
              <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                <strong className="text-amber-300">Swinging Hammers:</strong> Watch the pendulum oscillation and roll past on the backswing.
              </div>
              <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                <strong className="text-emerald-300">Boost Pads:</strong> Golden chevrons launch you across airborne jump chasms.
              </div>
              <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                <strong className="text-purple-300">Checkpoints:</strong> Glowing arches record your progress. Falling will respawn you here!
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs active:scale-95 transition cursor-pointer"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
};
