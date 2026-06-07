import type { SimulationConfig } from '../types/config.ts';
import { ShaderCompiler } from '../webgl/shaderCompiler.ts';
import { ShaderBuilder } from '../webgl/shaderBuilder.ts';
import vertexSource from '../shaders/vertex.glsl?raw';

type SystemKey = 'rigid' | 'elastic';

interface CompiledProg {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
}

export class PendulumPreview {
  private gl: WebGL2RenderingContext;
  private ctx: CanvasRenderingContext2D;
  private drawCanvas: HTMLCanvasElement;
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

  private readonly boxMargin = 16;
  private readonly boxSize = 170;
  private readonly armScale = 55;

  constructor(
    frameEl: HTMLElement,
    private mainCanvas: HTMLCanvasElement,
    config: SimulationConfig,
  ) {
    this.config = config;
    this.systemKey = config.system === 'rigid' ? 'rigid' : 'elastic';

    const simCanvas = document.createElement('canvas');
    simCanvas.width = 1;
    simCanvas.height = 1;
    const gl = simCanvas.getContext('webgl2', { antialias: false })!;
    this.gl = gl;
    gl.getExtension('EXT_color_buffer_float');

    this.drawCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
    this.ctx = this.drawCanvas.getContext('2d')!;
    this.syncSize();

    this.quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.fb = gl.createFramebuffer()!;

    this.baseAPair = this.makePair();
    this.pertAPair = this.makePair();
    if (this.systemKey === 'elastic') {
      this.baseBPair = this.makePair();
      this.pertBPair = this.makePair();
      this.baseSB = new Float32Array(4);
      this.pertSB = new Float32Array(4);
    }

    this.initProg = this.buildProg(ShaderBuilder.buildPreviewInit(this.systemKey));
    this.physicsProg = this.buildProg(ShaderBuilder.buildPreviewPhysicsLoop(this.systemKey));

    this.mainCanvas.addEventListener('mousemove', (e) => {
      const rect = this.mainCanvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (this.mainCanvas.width / rect.width);
      const py = (e.clientY - rect.top) * (this.mainCanvas.height / rect.height);
      this.onHover(px, py);
    });
    this.mainCanvas.addEventListener('mouseleave', () => this.onLeave());
    new ResizeObserver(() => this.syncSize()).observe(frameEl);
  }

  private syncSize() {
    this.drawCanvas.width = this.mainCanvas.width;
    this.drawCanvas.height = this.mainCanvas.height;
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
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, out);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private getElasticMode(): number {
    switch (this.config.system) {
      case 'elastic1': return 0;
      case 'elastic2': return 1;
      case 'elastic12': return 2;
      default: return 0;
    }
  }

  setDragging(v: boolean) {
    if (v) this.onLeave();
  }

  private onHover(px: number, py: number) {
    const nx = px / this.mainCanvas.width;
    const ny = 1 - py / this.mainCanvas.height;
    const t1 = this.config.theta1Range.min + nx * (this.config.theta1Range.max - this.config.theta1Range.min);
    const t2 = this.config.theta2Range.min + ny * (this.config.theta2Range.max - this.config.theta2Range.min);

    this.active = true;
    this.simulating = false;
    this.stopAnim();
    this.trail = [];
    this.diverged = false;
    this.readIdx = 0;

    this.gpuInit(t1, t2);
    this.readStates();
    this.trail.push(this.bob2(this.baseSA, this.baseSB));
    this.drawFrame();

    clearTimeout(this.debounceTimer ?? undefined);
    this.debounceTimer = window.setTimeout(() => {
      this.simulating = true;
      this.loop();
    }, 300);
  }

  private onLeave() {
    this.active = false;
    this.simulating = false;
    this.stopAnim();
    clearTimeout(this.debounceTimer ?? undefined);
    this.ctx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
  }

  private stopAnim() {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private gpuInit(t1: number, t2: number) {
    const gl = this.gl;
    const p = this.use(this.initProg);
    gl.uniform1f(this.u(p, 'u_theta1'), t1);
    gl.uniform1f(this.u(p, 'u_theta2'), t2);
    gl.uniform1f(this.u(p, 'u_omega1'), this.config.omega1);
    gl.uniform1f(this.u(p, 'u_omega2'), this.config.omega2);
    gl.uniform1f(this.u(p, 'u_perturb'), this.config.perturb);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    for (let i = 0; i < 5; i++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, null, 0);
    }
    if (this.systemKey === 'elastic') {
      gl.uniform1i(this.u(p, 'u_elasticMode'), this.getElasticMode());
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
    if (this.systemKey === 'elastic') {
      this.bind(0, sAPair[r]);
      this.bind(1, sBPair![r]);
      gl.uniform1i(this.u(p, 'u_stateTextureA'), 0);
      gl.uniform1i(this.u(p, 'u_stateTextureB'), 1);
      gl.uniform1i(this.u(p, 'u_elasticMode'), this.getElasticMode());
      gl.uniform1f(this.u(p, 'u_k1'), this.config.k1);
      gl.uniform1f(this.u(p, 'u_k2'), this.config.k2);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sAPair[w], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, sBPair![w], 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    } else {
      this.bind(0, sAPair[r]);
      gl.uniform1i(this.u(p, 'u_stateTexture'), 0);
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
    if (this.systemKey === 'elastic') {
      this.readTex(this.baseBPair![r], this.baseSB!);
      this.readTex(this.pertBPair![r], this.pertSB!);
    }
  }

  private decodeAngles(sA: Float32Array, sB: Float32Array | null): { t1: number; t2: number; l1: number; l2: number } {
    if (this.systemKey === 'rigid') {
      return { t1: sA[0], t2: sA[2], l1: 1, l2: 1 };
    }
    const m = this.getElasticMode();
    if (m === 0) return { t1: sA[0], t2: sB![0], l1: 1 + sA[2], l2: 1 };
    if (m === 1) return { t1: sA[0], t2: sA[2], l1: 1, l2: 1 + sB![0] };
    return { t1: sA[0], t2: sB![0], l1: 1 + sA[2], l2: 1 + sB![2] };
  }

  private bob2(sA: Float32Array, sB: Float32Array | null): { x: number; y: number } {
    const { t1, t2, l1, l2 } = this.decodeAngles(sA, sB);
    const x1 = l1 * Math.sin(t1);
    const y1 = -l1 * Math.cos(t1);
    return { x: x1 + l2 * Math.sin(t2), y: y1 - l2 * Math.cos(t2) };
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
      const m = this.getElasticMode();
      const bB = this.baseSB!, pB = this.pertSB!;
      if (m === 0) {
        sq += cd(bB[0], pB[0]) ** 2 + (bB[1] - pB[1]) ** 2 + (bA[2] - pA[2]) ** 2 + (bA[3] - pA[3]) ** 2;
      } else if (m === 1) {
        sq += cd(bA[2], pA[2]) ** 2 + (bA[3] - pA[3]) ** 2 + (bB[0] - pB[0]) ** 2 + (bB[1] - pB[1]) ** 2;
      } else {
        sq += cd(bB[0], pB[0]) ** 2 + (bB[1] - pB[1]) ** 2 + (bA[2] - pA[2]) ** 2 + (bA[3] - pA[3]) ** 2 + (bB[2] - pB[2]) ** 2 + (bB[3] - pB[3]) ** 2;
      }
    }
    return Math.sqrt(sq) > this.config.threshold;
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
    if (!this.diverged) {
      this.trail.push(this.bob2(this.baseSA, this.baseSB));
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

    const m = this.boxMargin;
    const bs = this.boxSize;
    const sc = this.armScale;
    const bx = m;
    const by = ch - m - bs;
    const cx = bx + bs / 2;
    const cy = by + bs / 2;
    const tc = (x: number, y: number) => ({ px: cx + x * sc, py: cy - y * sc });

    ctx.save();
    ctx.beginPath();
    const r = 10;
    ctx.moveTo(bx + r, by);
    ctx.arcTo(bx + bs, by, bx + bs, by + bs, r);
    ctx.arcTo(bx + bs, by + bs, bx, by + bs, r);
    ctx.arcTo(bx, by + bs, bx, by, r);
    ctx.arcTo(bx, by, bx + bs, by, r);
    ctx.closePath();
    ctx.fillStyle = this.diverged ? 'rgba(40, 20, 8, 0.88)' : 'rgba(8, 10, 16, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(bx, by, bs, bs);
    ctx.clip();

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
    ctx.beginPath(); ctx.arc(pp1.px, pp1.py, 2.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(232, 160, 48, 0.3)'; ctx.fill();
    ctx.beginPath(); ctx.arc(pp2.px, pp2.py, 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(232, 160, 48, 0.4)'; ctx.fill();

    const bp0 = tc(0, 0), bp1 = tc(bx1, by1), bp2 = tc(bx2, by2);
    ctx.beginPath(); ctx.moveTo(bp0.px, bp0.py); ctx.lineTo(bp1.px, bp1.py);
    ctx.strokeStyle = 'rgba(200, 202, 212, 0.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bp1.px, bp1.py); ctx.lineTo(bp2.px, bp2.py);
    ctx.strokeStyle = 'rgba(0, 212, 170, 0.7)'; ctx.lineWidth = 2; ctx.stroke();

    ctx.beginPath(); ctx.arc(bp1.px, bp1.py, 3.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200, 202, 212, 0.5)'; ctx.fill();
    ctx.beginPath(); ctx.arc(bp2.px, bp2.py, 4.5, 0, Math.PI * 2); ctx.fillStyle = '#00d4aa'; ctx.fill();
    ctx.shadowColor = 'rgba(0, 212, 170, 0.5)'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(bp0.px, bp0.py, 2.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200, 202, 212, 0.4)'; ctx.fill();

    ctx.restore();

    ctx.font = '500 10px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(200, 202, 212, 0.7)';
    ctx.textAlign = 'left';
    if (this.systemKey === 'elastic') {
      ctx.fillText(`l\u2081 ${baseD.l1.toFixed(2)}  l\u2082 ${baseD.l2.toFixed(2)}`, bx + 8, by + bs - 32);
    }
    ctx.fillText(`\u03b8\u2081 ${baseD.t1.toFixed(2)}`, bx + 8, by + bs - 20);
    ctx.fillText(`\u03b8\u2082 ${baseD.t2.toFixed(2)}`, bx + 8, by + bs - 8);

    if (this.diverged) {
      ctx.font = '600 9px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(232, 160, 48, 0.9)';
      ctx.textAlign = 'right';
      ctx.fillText('DIVERGED', bx + bs - 6, by + bs - 8);
    }

    ctx.restore();
  }

  rebuildForConfig(config: SimulationConfig) {
    const newKey: SystemKey = config.system === 'rigid' ? 'rigid' : 'elastic';
    this.config = config;
    if (newKey !== this.systemKey) {
      this.systemKey = newKey;
      if (newKey === 'elastic') {
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
