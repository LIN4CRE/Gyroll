import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

export const CelebrationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const particles: Particle[] = [];
    const colors = ['#38bdf8', '#f59e0b', '#ec4899', '#a855f7', '#22c55e', '#ffffff', '#fbbf24'];

    function createRocketBurst(x: number, y: number) {
      const count = 35;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 3.5,
          alpha: 1.0,
          decay: 0.012 + Math.random() * 0.015,
        });
      }
    }

    // Launch initial celebratory bursts
    createRocketBurst(width * 0.3, height * 0.4);
    createRocketBurst(width * 0.7, height * 0.35);
    createRocketBurst(width * 0.5, height * 0.3);

    let frameCount = 0;
    const loop = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      // Trigger staggered second wave bursts
      if (frameCount === 25) {
        createRocketBurst(width * 0.25, height * 0.3);
        createRocketBurst(width * 0.75, height * 0.32);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // Gravity
        p.vx *= 0.98;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (particles.length > 0 || frameCount < 40) {
        animId = requestAnimationFrame(loop);
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 w-full h-full"
    />
  );
};
