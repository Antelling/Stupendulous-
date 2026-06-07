import type { SimulationConfig } from '../types/config.ts';

export class PendulumState {
  t1 = 0;
  o1 = 0;
  t2 = 0;
  o2 = 0;
}

export class PendulumPreview {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private visible = false;
  private simulating = false;
  private animId: number | null = null;
  private debounceTimer: number | null = null;
  private trail: Array<{ x: number; y: number }> = [];
  private maxTrail = 500;
  private diverged = false;

  // Physics constants
  private readonly m1 = 1;
  private readonly m2 = 1;
  private readonly L1 = 1;
  private readonly L2 = 1;
  private readonly g = 9.81;

  private base = new PendulumState();
  private pert = new PendulumState();

  private readonly boxSize = 170;
  private readonly armScale = 55;

  constructor(
    private readonly frameEl: HTMLElement,
    private readonly mainCanvas: HTMLCanvasElement,
    private readonly config: SimulationConfig,
  ) {
    this.canvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.syncSize();
    this.attach();
  }

  private syncSize(): void {
    this.canvas.width = this.mainCanvas.width;
    this.canvas.height = this.mainCanvas.height;
  }

  private attach(): void {
    this.mainCanvas.addEventListener('mousemove', (e) => {
      if ((this.config as unknown as { isDragging: boolean }).isDragging) return;
      const rect = this.mainCanvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (this.mainCanvas.width / rect.width);
      const py = (e.clientY - rect.top) * (this.mainCanvas.height / rect.height);
      this.onHover(px, py);
    });

    this.mainCanvas.addEventListener('mouseleave', () => this.hide());
    new ResizeObserver(() => this.syncSize()).observe(this.frameEl);
  }

  private onHover(px: number, py: number): void {
    const nx = px / this.mainCanvas.width;
    const ny = 1 - py / this.mainCanvas.height;
    const theta1 = this.config.theta1Range.min + nx * (this.config.theta1Range.max - this.config.theta1Range.min);
    const theta2 = this.config.theta2Range.min + ny * (this.config.theta2Range.max - this.config.theta2Range.min);

    this.stopSim();
    this.visible = true;
    this.simulating = false;
    this.diverged = false;
    this.trail = [];

    const p = this.config.perturb;
    this.base = { t1: theta1, o1: this.config.omega1, t2: theta2, o2: this.config.omega2 };
    this.pert = { t1: theta1 + p, o1: this.config.omega1, t2: theta2 + p, o2: this.config.omega2 };

    this.drawStatic();

    clearTimeout(this.debounceTimer ?? undefined);
    this.debounceTimer = window.setTimeout(() => {
      this.simulating = true;
      this.simLoop();
    }, 300);
  }

  private hide(): void {
    this.visible = false;
    this.stopSim();
    clearTimeout(this.debounceTimer ?? undefined);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private stopSim(): void {
    this.simulating = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private computeAccel(t1: number, o1: number, t2: number, o2: number): [number, number] {
    const delta = t1 - t2;
    const sd = Math.sin(delta);
    const cd = Math.cos(delta);
    const denom = this.m1 + this.m2 * sd * sd;
    const n1 = -this.m2 * this.L1 * o1 * o1 * sd * cd
             - this.m2 * this.L2 * o2 * o2 * sd
             - (this.m1 + this.m2) * this.g * Math.sin(t1)
             + this.m2 * this.g * Math.sin(t2) * cd;
    const n2 = (this.m1 + this.m2) * this.L1 * o1 * o1 * sd
             + this.m2 * this.L2 * o2 * o2 * sd * cd
             + (this.m1 + this.m2) * this.g * Math.sin(t1) * cd
             - (this.m1 + this.m2) * this.g * Math.sin(t2);
    return [n1 / (this.L1 * denom), n2 / (this.L2 * denom)];
  }

  private verletStep(s: PendulumState): void {
    const dt = this.config.dt;
    const a = this.computeAccel(s.t1, s.o1, s.t2, s.o2);
    const oh1 = s.o1 + 0.5 * dt * a[0];
    const oh2 = s.o2 + 0.5 * dt * a[1];
    s.t1 += dt * oh1;
    s.t2 += dt * oh2;
    const an = this.computeAccel(s.t1, oh1, s.t2, oh2);
    s.o1 = oh1 + 0.5 * dt * an[0];
    s.o2 = oh2 + 0.5 * dt * an[1];
  }

  private circularDiff(a: number, b: number): number {
    const PI = Math.PI;
    const d = a - b;
    return d - 2 * PI * Math.floor(d / (2 * PI) + 0.5);
  }

  private measureDiv(): number {
    const a = this.base, b = this.pert;
    const d1 = this.circularDiff(a.t1, b.t1);
    const d2 = this.circularDiff(a.t2, b.t2);
    return Math.sqrt(d1 * d1 + d2 * d2 + (a.o1 - b.o1) ** 2 + (a.o2 - b.o2) ** 2);
  }

  private bob2Pos(s: PendulumState): { x: number; y: number } {
    const x1 = this.L1 * Math.sin(s.t1);
    const y1 = -this.L1 * Math.cos(s.t1);
    return { x: x1 + this.L2 * Math.sin(s.t2), y: y1 - this.L2 * Math.cos(s.t2) };
  }

  private simLoop(): void {
    if (!this.simulating || !this.visible) return;

    const steps = 15;
    for (let i = 0; i < steps; i++) {
      this.verletStep(this.base);
      this.verletStep(this.pert);

      if (!this.diverged) {
        const div = this.measureDiv();
        if (div > this.config.threshold) {
          this.diverged = true;
        }
      }

      if (!this.diverged) {
        const p = this.bob2Pos(this.base);
        this.trail.push(p);
        if (this.trail.length > this.maxTrail) this.trail.shift();
      }
    }

    this.drawFrame();
    this.animId = requestAnimationFrame(() => this.simLoop());
  }

  private boxOrigin(): { x: number; y: number; cx: number; cy: number } {
    const margin = 16;
    const bs = this.boxSize;
    return {
      x: margin,
      y: this.canvas.height - margin - bs,
      cx: margin + bs / 2,
      cy: this.canvas.height - margin - bs / 2,
    };
  }

  private drawStatic(): void {
    this.drawFrame();
  }

  private drawFrame(): void {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    if (!this.visible) return;

    const { x: bx, y: by, cx, cy } = this.boxOrigin();
    const bs = this.boxSize;
    const sc = this.armScale;

    // Backdrop
    ctx.save();
    ctx.beginPath();
    const r = 10;
    ctx.moveTo(bx + r, by);
    ctx.arcTo(bx + bs, by, bx + bs, by + bs, r);
    ctx.arcTo(bx + bs, by + bs, bx, by + bs, r);
    ctx.arcTo(bx, by + bs, bx, by, r);
    ctx.arcTo(bx, by, bx + bs, by, r);
    ctx.closePath();
    ctx.fillStyle = 'rgba(8, 10, 16, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Clip to box
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx, by, bs, bs);
    ctx.clip();

    // Draw trail
    if (this.trail.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i];
        const px = cx + p.x * sc;
        const py = cy + p.y * sc;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      const trailAlpha = this.diverged ? 0.5 : 0.7;
      ctx.strokeStyle = this.diverged ? `rgba(0, 212, 170, ${trailAlpha})` : 'rgba(0, 212, 170, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (!this.diverged) {
        ctx.shadowColor = 'rgba(0, 212, 170, 0.4)';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = 'rgba(0, 212, 170, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Draw perturbed pendulum (behind main)
    this.drawPendulum(this.pert, cx, cy, sc, true);

    // Draw main pendulum
    this.drawPendulum(this.base, cx, cy, sc, false);

    ctx.restore();

    // Theta label
    const t1 = this.base.t1.toFixed(2);
    const t2 = this.base.t2.toFixed(2);
    ctx.font = '500 10px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(200, 202, 212, 0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(`\u03b8\u2081 ${t1}`, bx + 8, by + bs - 20);
    ctx.fillText(`\u03b8\u2082 ${t2}`, bx + 8, by + bs - 8);

    if (this.diverged) {
      ctx.font = '600 9px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(232, 160, 48, 0.9)';
      ctx.textAlign = 'right';
      ctx.fillText('DIVERGED', bx + bs - 6, by + bs - 8);
    }
  }

  private drawPendulum(state: PendulumState, cx: number, cy: number, sc: number, isPerturbed: boolean): void {
    const x1 = this.L1 * Math.sin(state.t1);
    const y1 = -this.L1 * Math.cos(state.t1);
    const x2 = x1 + this.L2 * Math.sin(state.t2);
    const y2 = y1 - this.L2 * Math.cos(state.t2);

    const px1 = cx + x1 * sc;
    const py1 = cy + y1 * sc;
    const px2 = cx + x2 * sc;
    const py2 = cy + y2 * sc;

    if (isPerturbed) {
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(px1, py1);
      this.ctx.lineTo(px2, py2);
      this.ctx.strokeStyle = 'rgba(232, 160, 48, 0.35)';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(px1, py1, 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(232, 160, 48, 0.3)';
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(px2, py2, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(232, 160, 48, 0.4)';
      this.ctx.fill();
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(px1, py1);
      this.ctx.strokeStyle = 'rgba(200, 202, 212, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(px1, py1);
      this.ctx.lineTo(px2, py2);
      this.ctx.strokeStyle = 'rgba(0, 212, 170, 0.7)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(px1, py1, 3.5, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(200, 202, 212, 0.5)';
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(px2, py2, 4.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#00d4aa';
      this.ctx.fill();
      this.ctx.shadowColor = 'rgba(0, 212, 170, 0.5)';
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(200, 202, 212, 0.4)';
      this.ctx.fill();
    }
  }
}
