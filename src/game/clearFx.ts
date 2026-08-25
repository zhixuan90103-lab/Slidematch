import { FEEL, PIECE_FX_COLOR } from './design';

type Spark = {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  rot: number;
  vr: number;
};

const pool: HTMLDivElement[] = [];
const live: Spark[] = [];

function acquireEl(host: HTMLElement): HTMLDivElement {
  const el = pool.pop() ?? document.createElement('div');
  el.className = 'clear-spark';
  el.hidden = false;
  host.append(el);
  return el;
}

function releaseEl(el: HTMLDivElement): void {
  el.hidden = true;
  el.style.transform = 'translate3d(-9999px,0,0)';
  el.style.clipPath = '';
  el.style.borderRadius = '';
  el.style.width = '';
  el.style.height = '';
  pool.push(el);
}

function styleShape(el: HTMLDivElement, size: number): { w: number; h: number; rot0: number } {
  const kind = Math.floor(Math.random() * 5);
  el.style.clipPath = '';
  if (kind === 0) {
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = '50%';
    return { w: size, h: size, rot0: 0 };
  }
  if (kind === 1) {
    el.style.width = `${size}px`;
    el.style.height = `${size * 0.58}px`;
    el.style.borderRadius = `${size}px`;
    return { w: size, h: size * 0.58, rot0: 0 };
  }
  if (kind === 2) {
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = '1px';
    return { w: size, h: size, rot0: 45 };
  }
  if (kind === 3) {
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = '2px';
    el.style.clipPath = 'polygon(50% 0, 100% 100%, 0 100%)';
    return { w: size, h: size, rot0: Math.random() * 50 - 25 };
  }
  el.style.width = `${size * 0.72}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = `${size * 0.36}px ${size * 0.36}px ${size * 0.12}px ${size * 0.12}px`;
  return { w: size * 0.72, h: size, rot0: 0 };
}

export function spawnClearBurst(
  host: HTMLElement,
  cx: number,
  cy: number,
  color: number,
): void {
  const n =
    FEEL.fx.countMin + Math.floor(Math.random() * (FEEL.fx.countMax - FEEL.fx.countMin + 1));
  const tint = PIECE_FX_COLOR[color] ?? PIECE_FX_COLOR[0]!;
  const r = FEEL.fx.emitR;
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.35;
    const spd = FEEL.fx.speed * (0.55 + Math.random() * 0.7);
    const jitter = 1 - FEEL.fx.sizeJitter + Math.random() * FEEL.fx.sizeJitter * 2;
    const size = FEEL.fx.size * jitter;
    const el = acquireEl(host);
    el.style.background = tint;
    const shape = styleShape(el, size);
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r;
    live.push({
      el,
      x: px - shape.w / 2,
      y: py - shape.h / 2,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 40,
      life: 0,
      maxLife: FEEL.fx.life * (0.85 + Math.random() * 0.3),
      size,
      rot: shape.rot0 + Math.random() * 360,
      vr: (Math.random() - 0.5) * 720,
    });
  }
}

export function tickClearFx(dt: number): boolean {
  const step = Math.min(dt, 1 / 30);
  for (let i = live.length - 1; i >= 0; i--) {
    const s = live[i]!;
    s.life += step;
    s.vy += FEEL.fx.gravity * step;
    s.x += s.vx * step;
    s.y += s.vy * step;
    s.vr += (Math.random() - 0.5) * 900 * step;
    if (s.vr > 540) s.vr = 540;
    else if (s.vr < -540) s.vr = -540;
    s.rot += s.vr * step;
    const u = Math.min(1, s.life / s.maxLife);
    const fade = 1 - u;
    const sc = 1 - u * 0.85;
    s.el.style.opacity = String(fade);
    s.el.style.transform = `translate3d(${s.x}px,${s.y}px,0) rotate(${s.rot}deg) scale(${sc})`;
    if (u >= 1) {
      releaseEl(s.el);
      live.splice(i, 1);
    }
  }
  return live.length > 0;
}

export function disposeClearFx(): void {
  for (const s of live) releaseEl(s.el);
  live.length = 0;
}
