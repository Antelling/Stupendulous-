import type { SimulationConfig, PhaseSpaceDimension } from '../types/config.ts';
import { ShaderCompiler } from '../webgl/shaderCompiler.ts';
import { ShaderBuilder } from '../webgl/shaderBuilder.ts';
import { FrequencyAnalyzer } from './frequencyAnalyzer.ts';
import { PhaseSpaceGraph } from './phaseSpaceGraph.ts';
import vertexSource from '../shaders/vertex.glsl?raw';

type SystemKey = 'rigid' | 'elastic' | 'nonlinear';

interface CompiledProg {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
}

const DIM_INDEX: Record<PhaseSpaceDimension, number> = {
  angle1: 0,
  velocity1: 1,
  stretch1: 2,
  stretchRate1: 3,
  angle2: 4,
  velocity2: 5,
  stretch2: 6,
  stretchRate2: 7,
};

export class PendulumPreview {
  private gl: WebGL2RenderingContext;
  private ctx: CanvasRenderingContext2D;
  private graphCtx: CanvasRenderingContext2D;
  private poincareCtx: CanvasRenderingContext2D;
  private drawCanvas: HTMLCanvasElement;
  private graphCanvas: HTMLCanvasElement;
  private poincareCanvas: HTMLCanvasElement;
  private config: SimulationConfig;
  private systemKey: SystemKey;
  private quadBuf: WebGLBuffer;
  private fb: WebGLFramebuffer;

  private baseAPair: [WebGLTexture, WebGLTexture];
  private baseBPair: [WebGLTexture, WebGLTexture] | null = null;
  private pertAPair: [WebGLTexture, WebGLTexture];
  private pertBPair: [WebGLTexture, WebGLTexture] | null = null;

  private initProg: CompiledProg;
  private physicsProg: CompiledProg;

  private readIdx: 0 | 1 = 0;
  private trail: Array<{ x: number; y: number }> = [];
  private diverged = false;

  private active = false;
  private simulating = false;
  private animId: number | null = null;
  private debounceTimer: number | null = null;

  private baseSA = new Float32Array(4);
  private baseSB: Float32Array | null = null;
  private pertSA = new Float32Array(4);
  private pertSB: Float32Array | null = null;

  private readonly boxMargin = 0;
  private readonly boxSize = 500;
  private readonly armScale = 110;

  private freqAnalyzer: FrequencyAnalyzer;
  private lastAnalysis: { isPeriodic: boolean; period: number | null; confidence: number } | null = null;
  private analysisFrameSkip = 0;

  private phaseSpaceGraph: PhaseSpaceGraph;
  private previewEnabled = false;
  private previewBtn: HTMLButtonElement;
  private previewStatus: HTMLElement;

  constructor(
    frameEl: HTMLElement,
    private mainCanvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    config: SimulationConfig,
  ) {
    this.config = config;
    this.systemKey = config.system === 'rigid' ? 'rigid' : (config.system === 'nonlinear' ? 'nonlinear' : 'elastic');

    this.gl = gl;

    this.drawCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
    this.ctx = this.drawCanvas.getContext('2d')!;
    this.graphCanvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
    this.graphCtx = this.graphCanvas.getContext('2d')!;
    this.poincareCanvas = document.getElementById('poincareCanvas') as HTMLCanvasElement;
    this.poincareCtx = this.poincareCanvas.getContext('2d')!;
    this.phaseSpaceGraph = new PhaseSpaceGraph(this.graphCanvas, this.poincareCanvas, 1000);
    this.syncSize();

    this.previewBtn = document.getElementById('previewToggleBtn') as HTMLButtonElement;
    this.previewStatus = document.getElementById('previewStatus') as HTMLElement;
    this.previewBtn.addEventListener('click', () => this.togglePreview());

    this.quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.fb = gl.createFramebuffer()!;

    this.baseAPair = this.makePair();
    this.pertAPair = this.makePair();
    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.baseBPair = this.makePair();
      this.pertBPair = this.makePair();
      this.baseSB = new Float32Array(4);
      this.pertSB = new Float32Array(4);
    }

    this.initProg = this.buildProg(ShaderBuilder.buildPreviewInit(this.systemKey));
    this.physicsProg = this.buildProg(ShaderBuilder.buildPreviewPhysicsLoop(this.systemKey));

    this.freqAnalyzer = new FrequencyAnalyzer(2048, this.config.dt, 15);

    this.mainCanvas.addEventListener('click', (e) => {
      if (this.previewEnabled) {
        const rect = this.mainCanvas.getBoundingClientRect();
        const px = (e.clientX - rect.left) * (this.mainCanvas.width / rect.width);
        const py = (e.clientY - rect.top) * (this.mainCanvas.height / rect.height);
        this.onClick(px, py);
      }
    });

    new ResizeObserver(() => this.syncSize()).observe(frameEl);
  }

  private syncSize() {
    const size = this.boxSize + 2 * this.boxMargin;
    this.drawCanvas.width = size;
    this.drawCanvas.height = 500;
    this.graphCanvas.width = size;
    this.graphCanvas.height = 200;
    this.phaseSpaceGraph.resize(size, 200);
  }

  private togglePreview() {
    this.previewEnabled = !this.previewEnabled;
    if (this.previewEnabled) {
      this.previewBtn.textContent = '✕ Stop';
      this.previewBtn.style.background = '#3a2020';
      this.previewStatus.textContent = 'Click on the main canvas to start simulation';
      this.previewStatus.style.color = '#888';
    } else {
      this.previewBtn.textContent = '▶ Start';
      this.previewBtn.style.background = '';
      this.previewStatus.textContent = 'Click "Start" then click on the main canvas';
      this.previewStatus.style.color = '#666';
      this.onLeave();
    }
  }

  private makeTex(): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, 1, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private makePair(): [WebGLTexture, WebGLTexture] {
    return [this.makeTex(), this.makeTex()];
  }

  private buildProg(src: string): CompiledProg {
    const c = new ShaderCompiler(this.gl);
    const sp = c.linkProgram(vertexSource, src, 'p' as any);
    const vao = this.gl.createVertexArray()!;
    this.gl.bindVertexArray(vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuf);
    const loc = this.gl.getAttribLocation(sp.program, 'a_position');
    if (loc >= 0) {
      this.gl.enableVertexAttribArray(loc);
      this.gl.vertexAttribPointer(loc, 2, this.gl.FLOAT, false, 0, 0);
    }
    this.gl.bindVertexArray(null);
    return { program: sp.program, vao };
  }

  private use(cp: CompiledProg): WebGLProgram {
    this.gl.useProgram(cp.program);
    this.gl.bindVertexArray(cp.vao);
    return cp.program;
  }

  private u(p: WebGLProgram, n: string): WebGLUniformLocation {
    const l = this.gl.getUniformLocation(p, n);
    if (!l) throw new Error(`uniform not found: ${n}`);
    return l;
  }

  private bind(unit: number, tex: WebGLTexture) {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
  }

  private readTex(tex: WebGLTexture, out: Float32Array) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    for (let i = 1; i < 5; i++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, null, 0);
    }
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, out);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  setDragging(v: boolean) {
    if (v) this.onLeave();
  }

  private onClick(px: number, py: number) {
    const nx = px / this.mainCanvas.width;
    const ny = 1 - py / this.mainCanvas.height;

    const dx = this.config.phaseSpace.x.min + nx * (this.config.phaseSpace.x.max - this.config.phaseSpace.x.min);
    const dy = this.config.phaseSpace.y.min + ny * (this.config.phaseSpace.y.max - this.config.phaseSpace.y.min);

    this.active = true;
    this.simulating = false;
    this.stopAnim();
    this.trail = [];
    this.diverged = false;
    this.readIdx = 0;
    this.freqAnalyzer.reset();
    this.lastAnalysis = null;
    this.analysisFrameSkip = 0;
    this.phaseSpaceGraph.reset();

    this.gpuInit(dx, dy);
    this.readStates();
    this.trail.push(this.bob2(this.baseSA, this.baseSB));
    this.drawFrame();

    this.previewStatus.textContent = 'Simulating...';
    this.previewStatus.style.color = '#0d4';

    clearTimeout(this.debounceTimer ?? undefined);
    this.debounceTimer = window.setTimeout(() => {
      this.simulating = true;
      this.loop();
    }, 100);
  }

  private onLeave() {
    this.active = false;
    this.simulating = false;
    this.stopAnim();
    clearTimeout(this.debounceTimer ?? undefined);
    this.ctx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
    this.graphCtx.clearRect(0, 0, this.graphCanvas.width, this.graphCanvas.height);
    if (this.previewEnabled) {
      this.previewStatus.textContent = 'Click on the main canvas to start simulation';
      this.previewStatus.style.color = '#888';
    }
  }

  private stopAnim() {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private gpuInit(dx: number, dy: number) {
    const gl = this.gl;
    const p = this.use(this.initProg);
    const iv = this.config.phaseSpace.initialValues;

    if (this.systemKey === 'rigid') {
      const state = [iv.angle1, iv.velocity1, iv.angle2, iv.velocity2];
      const xDim = DIM_INDEX[this.config.phaseSpace.x.dimension];
      const yDim = DIM_INDEX[this.config.phaseSpace.y.dimension];
      // rigid state layout: (angle1, velocity1, angle2, velocity2)
      // map elastic-style indices to rigid layout
      const rigidIndex = (dim: number) => dim === 0 ? 0 : dim === 1 ? 1 : dim === 4 ? 2 : dim === 5 ? 3 : -1;
      const xi = rigidIndex(xDim);
      const yi = rigidIndex(yDim);
      if (xi >= 0) state[xi] += dx;
      if (yi >= 0) state[yi] += dy;
      gl.uniform4f(this.u(p, 'u_initialState'), state[0], state[1], state[2], state[3]);
    } else {
      const a = [iv.angle1, iv.velocity1, iv.stretch1, iv.stretchRate1];
      const b = [iv.angle2, iv.velocity2, iv.stretch2, iv.stretchRate2];
      const xDim = DIM_INDEX[this.config.phaseSpace.x.dimension];
      const yDim = DIM_INDEX[this.config.phaseSpace.y.dimension];
      if (xDim < 4) a[xDim] += dx; else b[xDim - 4] += dx;
      if (yDim < 4) a[yDim] += dy; else b[yDim - 4] += dy;
      gl.uniform4f(this.u(p, 'u_initialA'), a[0], a[1], a[2], a[3]);
      gl.uniform4f(this.u(p, 'u_initialB'), b[0], b[1], b[2], b[3]);
    }

    gl.uniform1f(this.u(p, 'u_perturb'), this.config.perturb);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    for (let i = 0; i < 5; i++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, null, 0);
    }
    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.baseAPair[0], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.baseBPair![0], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, this.pertAPair[0], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_2D, this.pertBPair![0], 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);
    } else {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.baseAPair[0], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.pertAPair[0], 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    }
    gl.viewport(0, 0, 1, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  private gpuStep(sAPair: [WebGLTexture, WebGLTexture], sBPair: [WebGLTexture, WebGLTexture] | null) {
    const gl = this.gl;
    const r = this.readIdx;
    const w = (1 - r) as 0 | 1;
    const p = this.use(this.physicsProg);
    gl.uniform1f(this.u(p, 'u_dt'), this.config.dt);
    gl.uniform1i(this.u(p, 'u_steps'), 15);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    for (let i = 0; i < 5; i++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, null, 0);
    }
    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.bind(0, sAPair[r]);
      this.bind(1, sBPair![r]);
      gl.uniform1i(this.u(p, 'u_stateTextureA'), 0);
      gl.uniform1i(this.u(p, 'u_stateTextureB'), 1);
      gl.uniform1f(this.u(p, 'u_k1'), this.config.k1);
      gl.uniform1f(this.u(p, 'u_k2'), this.config.k2);
      gl.uniform1f(this.u(p, 'u_m1'), this.config.m1);
      gl.uniform1f(this.u(p, 'u_m2'), this.config.m2);
      gl.uniform1f(this.u(p, 'u_L1'), this.config.L1);
      gl.uniform1f(this.u(p, 'u_L2'), this.config.L2);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sAPair[w], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, sBPair![w], 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    } else {
      this.bind(0, sAPair[r]);
      gl.uniform1i(this.u(p, 'u_stateTexture'), 0);
      gl.uniform1f(this.u(p, 'u_m1'), this.config.m1);
      gl.uniform1f(this.u(p, 'u_m2'), this.config.m2);
      gl.uniform1f(this.u(p, 'u_L1'), this.config.L1);
      gl.uniform1f(this.u(p, 'u_L2'), this.config.L2);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sAPair[w], 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    }
    gl.viewport(0, 0, 1, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  private readStates() {
    const r = this.readIdx;
    this.readTex(this.baseAPair[r], this.baseSA);
    this.readTex(this.pertAPair[r], this.pertSA);
    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.readTex(this.baseBPair![r], this.baseSB!);
      this.readTex(this.pertBPair![r], this.pertSB!);
    }
  }

  private decodeAngles(sA: Float32Array, sB: Float32Array | null): { t1: number; t2: number; l1: number; l2: number } {
    if (this.systemKey === 'rigid') {
      return { t1: sA[0], t2: sA[2], l1: this.config.L1, l2: this.config.L2 };
    }
    return { t1: sA[0], t2: sB![0], l1: this.config.L1 + sA[2], l2: this.config.L2 + sB![2] };
  }

  private bob2(sA: Float32Array, sB: Float32Array | null): { x: number; y: number } {
    const { t1, t2, l1, l2 } = this.decodeAngles(sA, sB);
    const x1 = l1 * Math.sin(t1);
    const y1 = -l1 * Math.cos(t1);
    return { x: x1 + l2 * Math.sin(t2), y: y1 - l2 * Math.cos(t2) };
  }

  private calculateEnergies(sA: Float32Array, sB: Float32Array | null): { ke: number; pe: number; ee: number } {
    const { t1, t2, l1, l2 } = this.decodeAngles(sA, sB);
    const w1 = sA[1];
    const w2 = this.systemKey === 'rigid' ? sA[3] : sB![1];

    const x1 = l1 * Math.sin(t1);
    const y1 = -l1 * Math.cos(t1);
    const x2 = x1 + l2 * Math.sin(t2);
    const y2 = y1 - l2 * Math.cos(t2);

    const vx1 = l1 * w1 * Math.cos(t1);
    const vy1 = l1 * w1 * Math.sin(t1);
    const vx2 = vx1 + l2 * w2 * Math.cos(t2);
    const vy2 = vy1 + l2 * w2 * Math.sin(t2);

    const ke = 0.5 * this.config.m1 * (vx1 * vx1 + vy1 * vy1) + 
               0.5 * this.config.m2 * (vx2 * vx2 + vy2 * vy2);

    const g = 9.81;
    const pe = this.config.m1 * g * y1 + this.config.m2 * g * y2;

    let ee = 0;
    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      const dl1 = sA[2];
      const dl2 = sB![2];
      
      if (this.systemKey === 'nonlinear') {
        const L10 = this.config.L1;
        const L20 = this.config.L2;
        const absDl1 = Math.abs(dl1);
        const absDl2 = Math.abs(dl2);
        const ee1 = this.config.k1 * L10 * (Math.exp(absDl1 / L10) - 1 - absDl1 / L10);
        const ee2 = this.config.k2 * L20 * (Math.exp(absDl2 / L20) - 1 - absDl2 / L20);
        ee = ee1 + ee2;
      } else {
        ee = 0.5 * this.config.k1 * dl1 * dl1 + 0.5 * this.config.k2 * dl2 * dl2;
      }
    }

    return { ke, pe, ee };
  }

  private checkDivergence(): boolean {
    const PI = Math.PI;
    const cd = (a: number, b: number) => {
      const d = a - b;
      return d - 2 * PI * Math.floor(d / (2 * PI) + 0.5);
    };
    const bA = this.baseSA, pA = this.pertSA;
    let sq = cd(bA[0], pA[0]) ** 2 + (bA[1] - pA[1]) ** 2;
    if (this.systemKey === 'rigid') {
      sq += cd(bA[2], pA[2]) ** 2 + (bA[3] - pA[3]) ** 2;
    } else {
      const bB = this.baseSB!, pB = this.pertSB!;
      sq += cd(bB[0], pB[0]) ** 2 + (bB[1] - pB[1]) ** 2 + (bA[2] - pA[2]) ** 2 + (bA[3] - pA[3]) ** 2 + (bB[2] - pB[2]) ** 2 + (bB[3] - pB[3]) ** 2;
    }
    return Math.sqrt(sq) > 0.05;
  }

  private loop() {
    if (!this.active || !this.simulating) return;

    const w = (1 - this.readIdx) as 0 | 1;
    this.gpuStep(this.baseAPair, this.baseBPair);
    this.gpuStep(this.pertAPair, this.pertBPair);
    this.readIdx = w;
    this.readStates();

    if (!this.diverged && this.checkDivergence()) {
      this.diverged = true;
    }

    // Always add to phase space graph and poincare section, even after divergence
    // Wrap angles to [-π, π] for display
    const wrapAngle = (a: number) => {
      const PI = Math.PI;
      return a - 2 * PI * Math.floor((a + PI) / (2 * PI));
    };
    const t1 = wrapAngle(this.baseSA[0]);
    const w1 = this.baseSA[1];
    const t2 = wrapAngle(this.systemKey === 'rigid' ? this.baseSA[2] : this.baseSB![0]);
    const w2 = this.systemKey === 'rigid' ? this.baseSA[3] : this.baseSB![1];
    const energies = this.calculateEnergies(this.baseSA, this.baseSB);

    this.phaseSpaceGraph.addPoint(t1, w1, t2, w2, energies.ke, energies.pe, energies.ee);

    // Only add to trail if not diverged
    if (!this.diverged) {
      const pos = this.bob2(this.baseSA, this.baseSB);
      this.trail.push(pos);
    }

    this.drawFrame();
    this.animId = requestAnimationFrame(() => this.loop());
  }

  private drawFrame() {
    const ctx = this.ctx;
    const cw = this.drawCanvas.width;
    const ch = this.drawCanvas.height;
    ctx.clearRect(0, 0, cw, ch);
    if (!this.active) return;

    const bs = this.boxSize;
    const maxReach = (this.trail.length > 0
      ? Math.max(...this.trail.map(p => Math.max(Math.abs(p.x), Math.abs(p.y))))
      : 2) * 1.15;
    const sc = Math.min(this.armScale, (bs / 2 - 20) / maxReach);
    const cx = bs / 2;
    const cy = ch / 2;
    const tc = (x: number, y: number) => ({ px: cx + x * sc, py: cy - y * sc });

    ctx.save();
    ctx.fillStyle = this.diverged ? 'rgba(40, 20, 8, 0.88)' : 'rgba(8, 10, 16, 0.88)';
    ctx.fillRect(0, 0, cw, ch);

    if (this.trail.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < this.trail.length; i++) {
        const pt = tc(this.trail[i].x, this.trail[i].y);
        if (i === 0) ctx.moveTo(pt.px, pt.py);
        else ctx.lineTo(pt.px, pt.py);
      }
      ctx.strokeStyle = this.diverged ? 'rgba(0, 212, 170, 0.5)' : 'rgba(0, 212, 170, 0.7)';
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

    const baseD = this.decodeAngles(this.baseSA, this.baseSB);
    const pertD = this.decodeAngles(this.pertSA, this.pertSB);

    const bx1 = baseD.l1 * Math.sin(baseD.t1), by1 = -baseD.l1 * Math.cos(baseD.t1);
    const bx2 = bx1 + baseD.l2 * Math.sin(baseD.t2), by2 = by1 - baseD.l2 * Math.cos(baseD.t2);
    const px1 = pertD.l1 * Math.sin(pertD.t1), py1 = -pertD.l1 * Math.cos(pertD.t1);
    const px2 = px1 + pertD.l2 * Math.sin(pertD.t2), py2 = py1 - pertD.l2 * Math.cos(pertD.t2);

    const pp0 = tc(0, 0), pp1 = tc(px1, py1), pp2 = tc(px2, py2);
    ctx.beginPath(); ctx.moveTo(pp0.px, pp0.py); ctx.lineTo(pp1.px, pp1.py); ctx.lineTo(pp2.px, pp2.py);
    ctx.strokeStyle = 'rgba(232, 160, 48, 0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    const bobRadius1 = 2 + this.config.m1 * 2;
    const bobRadius2 = 2.5 + this.config.m2 * 2.5;
    ctx.beginPath(); ctx.arc(pp1.px, pp1.py, bobRadius1 * 0.7, 0, Math.PI * 2); ctx.fillStyle = 'rgba(232, 160, 48, 0.3)'; ctx.fill();
    ctx.beginPath(); ctx.arc(pp2.px, pp2.py, bobRadius2 * 0.7, 0, Math.PI * 2); ctx.fillStyle = 'rgba(232, 160, 48, 0.4)'; ctx.fill();

    const bp0 = tc(0, 0), bp1 = tc(bx1, by1), bp2 = tc(bx2, by2);
    ctx.beginPath(); ctx.moveTo(bp0.px, bp0.py); ctx.lineTo(bp1.px, bp1.py);
    ctx.strokeStyle = 'rgba(200, 202, 212, 0.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bp1.px, bp1.py); ctx.lineTo(bp2.px, bp2.py);
    ctx.strokeStyle = 'rgba(0, 212, 170, 0.7)'; ctx.lineWidth = 2; ctx.stroke();

    ctx.beginPath(); ctx.arc(bp1.px, bp1.py, bobRadius1, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200, 202, 212, 0.5)'; ctx.fill();
    ctx.beginPath(); ctx.arc(bp2.px, bp2.py, bobRadius2, 0, Math.PI * 2); ctx.fillStyle = '#00d4aa'; ctx.fill();
    ctx.shadowColor = 'rgba(0, 212, 170, 0.5)'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(bp0.px, bp0.py, 2.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200, 202, 212, 0.4)'; ctx.fill();

    ctx.font = '500 10px monospace';
    ctx.fillStyle = 'rgba(200, 202, 212, 0.7)';
    ctx.textAlign = 'left';
    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      ctx.fillText(`l₁ ${baseD.l1.toFixed(2)}  l₂ ${baseD.l2.toFixed(2)}`, 8, ch - 32);
    }
    ctx.fillText(`θ₁ ${baseD.t1.toFixed(2)}`, 8, ch - 20);
    ctx.fillText(`θ₂ ${baseD.t2.toFixed(2)}`, 8, ch - 8);

    if (this.diverged) {
      ctx.font = '600 9px monospace';
      ctx.fillStyle = 'rgba(232, 160, 48, 0.9)';
      ctx.textAlign = 'right';
      ctx.fillText('DIVERGED', cw - 6, ch - 8);
    }

    if (this.lastAnalysis) {
      ctx.font = '500 10px monospace';
      ctx.textAlign = 'right';
      if (this.lastAnalysis.isPeriodic) {
        ctx.fillStyle = 'rgba(100, 220, 120, 0.9)';
        const periodStr = this.lastAnalysis.period !== null ? this.lastAnalysis.period.toFixed(2) : '?';
        ctx.fillText(`PERIODIC  T=${periodStr}s`, cw - 6, 18);
        ctx.fillStyle = 'rgba(100, 220, 120, 0.5)';
        ctx.fillText(`conf ${(this.lastAnalysis.confidence * 100).toFixed(0)}%`, cw - 6, 30);
      } else {
        ctx.fillStyle = 'rgba(220, 100, 100, 0.9)';
        ctx.fillText('CHAOTIC', cw - 6, 18);
        if (this.lastAnalysis.confidence > 0) {
          ctx.fillStyle = 'rgba(220, 100, 100, 0.5)';
          ctx.fillText(`conf ${(this.lastAnalysis.confidence * 100).toFixed(0)}%`, cw - 6, 30);
        }
      }
    }

    ctx.restore();

    const showEnergy = this.systemKey === 'elastic' || this.systemKey === 'nonlinear';
    this.phaseSpaceGraph.draw(showEnergy);
    this.phaseSpaceGraph.drawPoincare();
  }

  rebuildForConfig(config: SimulationConfig) {
    const newKey: SystemKey = config.system === 'rigid' ? 'rigid' : (config.system === 'nonlinear' ? 'nonlinear' : 'elastic');
    this.config = config;
    if (newKey !== this.systemKey) {
      this.systemKey = newKey;
      if (newKey === 'elastic' || newKey === 'nonlinear') {
        if (!this.baseBPair) this.baseBPair = this.makePair();
        if (!this.pertBPair) this.pertBPair = this.makePair();
        if (!this.baseSB) this.baseSB = new Float32Array(4);
        if (!this.pertSB) this.pertSB = new Float32Array(4);
      }
      const gl = this.gl;
      gl.deleteProgram(this.initProg.program);
      gl.deleteVertexArray(this.initProg.vao);
      gl.deleteProgram(this.physicsProg.program);
      gl.deleteVertexArray(this.physicsProg.vao);
      this.initProg = this.buildProg(ShaderBuilder.buildPreviewInit(this.systemKey));
      this.physicsProg = this.buildProg(ShaderBuilder.buildPreviewPhysicsLoop(this.systemKey));
    }
    this.onLeave();
  }

  dispose() {
    this.stopAnim();
    clearTimeout(this.debounceTimer ?? undefined);
    const gl = this.gl;
    gl.deleteProgram(this.initProg.program);
    gl.deleteVertexArray(this.initProg.vao);
    gl.deleteProgram(this.physicsProg.program);
    gl.deleteVertexArray(this.physicsProg.vao);
    gl.deleteFramebuffer(this.fb);
    gl.deleteBuffer(this.quadBuf);
    const pairs: Array<[WebGLTexture, WebGLTexture]> = [this.baseAPair, this.pertAPair];
    if (this.baseBPair) pairs.push(this.baseBPair);
    if (this.pertBPair) pairs.push(this.pertBPair);
    for (const p of pairs) { gl.deleteTexture(p[0]); gl.deleteTexture(p[1]); }
  }
}
