'use client';

import { useEffect, useRef } from 'react';

interface Triangle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  life: number; // 0..1, counts down
  decay: number;
  hue: 'gold' | 'light';
  filled: boolean;
}

const MAX_TRIANGLES = 140;
/** Pixels of mouse travel between spawns — the more you move, the more triangles appear. */
const SPAWN_DISTANCE = 12;

const COLORS = {
  gold: '233, 183, 83',
  light: '255, 244, 214',
};

/**
 * Glittering triangles that spray out of the mouse pointer while it moves across the hero banner —
 * the faster/further you move, the more of them. Sits behind the hero text, never blocks clicks, and
 * is skipped on touch devices and for people who prefer reduced motion.
 */
export function HeroCursorTriangles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    ) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const triangles: Triangle[] = [];
    const mouse = { x: 0, y: 0, lastX: 0, lastY: 0, inside: false, travelled: 0 };
    const glow = { x: 0, y: 0, alpha: 0 };
    let raf = 0;
    let running = false;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (speed: number) => {
      if (triangles.length >= MAX_TRIANGLES) triangles.shift();
      const angle = Math.random() * Math.PI * 2;
      const drift = 0.25 + Math.random() * 0.9 + Math.min(speed, 40) * 0.03;
      triangles.push({
        x: mouse.x + (Math.random() - 0.5) * 14,
        y: mouse.y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * drift,
        vy: Math.sin(angle) * drift - 0.15,
        size: 5 + Math.random() * 11 + Math.min(speed, 40) * 0.12,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.09,
        life: 1,
        decay: 0.012 + Math.random() * 0.014,
        hue: Math.random() < 0.65 ? 'gold' : 'light',
        filled: Math.random() < 0.45,
      });
    };

    const drawTriangle = (t: Triangle) => {
      const alpha = Math.max(t.life, 0);
      const rgb = COLORS[t.hue];
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rotation);
      ctx.scale(0.55 + t.life * 0.45, 0.55 + t.life * 0.45);
      ctx.beginPath();
      ctx.moveTo(0, -t.size);
      ctx.lineTo(t.size * 0.87, t.size * 0.5);
      ctx.lineTo(-t.size * 0.87, t.size * 0.5);
      ctx.closePath();
      if (t.filled) {
        ctx.fillStyle = `rgba(${rgb}, ${alpha * 0.4})`;
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.95})`;
      ctx.lineWidth = 1.2;
      ctx.shadowColor = `rgba(${COLORS.gold}, ${alpha * 0.9})`;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    };

    const frame = () => {
      ctx.clearRect(0, 0, width, height);

      // Soft spotlight that trails the pointer.
      glow.x += (mouse.x - glow.x) * 0.18;
      glow.y += (mouse.y - glow.y) * 0.18;
      glow.alpha += ((mouse.inside ? 1 : 0) - glow.alpha) * 0.1;
      if (glow.alpha > 0.02) {
        const g = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, 170);
        g.addColorStop(0, `rgba(${COLORS.gold}, ${0.22 * glow.alpha})`);
        g.addColorStop(1, `rgba(${COLORS.gold}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(glow.x - 170, glow.y - 170, 340, 340);
      }

      for (let i = triangles.length - 1; i >= 0; i--) {
        const t = triangles[i];
        t.x += t.vx;
        t.y += t.vy;
        t.vx *= 0.985;
        t.vy *= 0.985;
        t.rotation += t.spin;
        t.life -= t.decay;
        if (t.life <= 0) {
          triangles.splice(i, 1);
          continue;
        }
        drawTriangle(t);
      }

      if (triangles.length > 0 || glow.alpha > 0.02 || mouse.inside) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      if (!inside) {
        mouse.inside = false;
        return;
      }
      if (!mouse.inside) {
        mouse.lastX = x;
        mouse.lastY = y;
        glow.x = x;
        glow.y = y;
      }
      mouse.inside = true;
      mouse.x = x;
      mouse.y = y;

      const dx = x - mouse.lastX;
      const dy = y - mouse.lastY;
      const dist = Math.hypot(dx, dy);
      mouse.travelled += dist;
      mouse.lastX = x;
      mouse.lastY = y;
      while (mouse.travelled >= SPAWN_DISTANCE) {
        mouse.travelled -= SPAWN_DISTANCE;
        spawn(dist);
      }
      start();
    };

    const onLeave = () => {
      mouse.inside = false;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-0" />;
}
