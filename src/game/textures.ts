import * as THREE from 'three';

/**
 * Creates tileable procedural CanvasTextures for high visual fidelity with zero external 404s.
 */

export function createTrackTexture(type: 'asphalt' | 'boost' | 'ice' | 'hazard'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (type === 'asphalt') {
    // Dark textured asphalt with side curb markings
    ctx.fillStyle = '#1e232a';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle asphalt grain noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 24;
      d[i] = Math.min(255, Math.max(0, d[i] + noise));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle edge borders
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, 16, 512);
    ctx.fillRect(496, 0, 16, 512);

    // Dashed center line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(250, 40, 12, 120);
    ctx.fillRect(250, 300, 12, 120);
  } else if (type === 'boost') {
    // Energetic boost lane with forward chevrons
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 24, 512);
    ctx.fillRect(488, 0, 24, 512);

    // Draw glowing neon forward chevrons pointing along -Z (upwards on canvas)
    ctx.fillStyle = '#fbbf24';
    for (let y = 80; y < 512; y += 140) {
      ctx.beginPath();
      ctx.moveTo(256, y - 50);
      ctx.lineTo(120, y + 20);
      ctx.lineTo(160, y + 20);
      ctx.lineTo(256, y - 20);
      ctx.lineTo(352, y + 20);
      ctx.lineTo(392, y + 20);
      ctx.closePath();
      ctx.fill();
    }
  } else if (type === 'ice') {
    // Slick crystalline cyan ice surface
    ctx.fillStyle = '#083344';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
      ctx.stroke();
    }

    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(0, 0, 16, 512);
    ctx.fillRect(496, 0, 16, 512);
  } else if (type === 'hazard') {
    // Diagonal yellow and black hazard stripes
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#18181b';
    const stripeW = 40;
    for (let x = -512; x < 1024; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW + 512, 512);
      ctx.lineTo(x + 512, 512);
      ctx.closePath();
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createBallTexture(pattern: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (pattern === 'cyber') {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 512, 256);

    // Glowing cyan grid lattice
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    for (let x = 0; x <= 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Glowing hexagon accents
    ctx.fillStyle = '#22d3ee';
    for (let x = 16; x < 512; x += 64) {
      for (let y = 16; y < 256; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === 'magma') {
    ctx.fillStyle = '#1c0c05';
    ctx.fillRect(0, 0, 512, 256);

    // Glowing fiery crack veins
    ctx.strokeStyle = '#ff5500';
    ctx.lineWidth = 4;
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      let cx = Math.random() * 512;
      let cy = Math.random() * 256;
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 4; j++) {
        cx += (Math.random() - 0.5) * 80;
        cy += (Math.random() - 0.5) * 80;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Hot yellow core spots
    ctx.fillStyle = '#ffcc00';
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 256, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === 'nebula') {
    // Swirling nebula dust
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#2e1065');
    grad.addColorStop(0.5, '#581c87');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Stardust sparkles
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const r = Math.random() * 2;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 256, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === 'toxic') {
    ctx.fillStyle = '#052e16';
    ctx.fillRect(0, 0, 512, 256);

    // Toxic hazard rings
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 5;
    for (let x = 64; x < 512; x += 128) {
      ctx.beginPath();
      ctx.arc(x, 128, 40, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // Clean metal panels
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(512, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 256);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
