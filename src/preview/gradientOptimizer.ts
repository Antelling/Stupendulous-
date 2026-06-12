import type { SimulationConfig } from '../types/config.ts';
import { ShaderCompiler } from '../webgl/shaderCompiler.ts';
import { ShaderBuilder } from '../webgl/shaderBuilder.ts';
import vertexSource from '../shaders/vertex.glsl?raw';

type SystemKey = 'rigid' | 'elastic' | 'nonlinear';

export interface StateVector {
  angle1: number;
  velocity1: number;
  angle2: number;
  velocity2: number;
  stretch1: number;
  stretchRate1: number;
  stretch2: number;
  stretchRate2: number;
}

interface CompiledProg {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
}

interface OptimizerLogEntry {
  cycle: number;
  bestResidual: number;
  perturbScale: number;
  dt: number;
  numPeriods: number;
  newBest: boolean;
  residuals: number[];
}

function getCloudSizeDimensions(count: number): { width: number; height: number } {
  const side = Math.ceil(Math.sqrt(count));
  return { width: side, height: side };
}

function stateToFloat32Array(state: StateVector, system: string): { a: Float32Array; b: Float32Array | null } {
  if (system === 'rigid') {
    return {
      a: new Float32Array([state.angle1, state.velocity1, state.angle2, state.velocity2]),
      b: null,
    };
  }
  return {
    a: new Float32Array([state.angle1, state.velocity1, state.stretch1, state.stretchRate1]),
    b: new Float32Array([state.angle2, state.velocity2, state.stretch2, state.stretchRate2]),
  };
}

function float32ArrayToState(a: Float32Array, b: Float32Array | null, system: string): StateVector {
  if (system === 'rigid') {
    return {
      angle1: a[0], velocity1: a[1], angle2: a[2], velocity2: a[3],
      stretch1: 0, stretchRate1: 0, stretch2: 0, stretchRate2: 0,
    };
  }
  return {
    angle1: a[0], velocity1: a[1], stretch1: a[2], stretchRate1: a[3],
    angle2: b![0], velocity2: b![1], stretch2: b![2], stretchRate2: b![3],
  };
}

function circularDiff(a: number, b: number): number {
  const d = a - b;
  return d - 2 * Math.PI * Math.floor(d / (2 * Math.PI) + 0.5);
}

function computeResidual(start: StateVector, end: StateVector, system: string): number {
  const d1 = circularDiff(start.angle1, end.angle1);
  const d2 = circularDiff(start.angle2, end.angle2);
  const dv1 = start.velocity1 - end.velocity1;
  const dv2 = start.velocity2 - end.velocity2;

  if (system === 'rigid') {
    return Math.sqrt(d1 * d1 + dv1 * dv1 + d2 * d2 + dv2 * dv2);
  }

  const ds1 = start.stretch1 - end.stretch1;
  const dsr1 = start.stretchRate1 - end.stretchRate1;
  const ds2 = start.stretch2 - end.stretch2;
  const dsr2 = start.stretchRate2 - end.stretchRate2;

  return Math.sqrt(
    d1 * d1 + dv1 * dv1 + ds1 * ds1 + dsr1 * dsr1 +
    d2 * d2 + dv2 * dv2 + ds2 * ds2 + dsr2 * dsr2
  );
}

export class GradientOptimizer {
  private gl: WebGL2RenderingContext;
  private config: SimulationConfig;
  private systemKey: SystemKey;
  private quadBuf: WebGLBuffer;
  private fb: WebGLFramebuffer;

  private batchInitProg: CompiledProg;
  private batchPhysicsProg: CompiledProg;

  private texAPair: [WebGLTexture, WebGLTexture];
  private texBPair: [WebGLTexture, WebGLTexture] | null = null;

  private texWidth = 1;
  private texHeight = 1;

  private logs: OptimizerLogEntry[] = [];
  private onLog?: (entry: OptimizerLogEntry) => void;
  private onProgress?: (cycle: number, residual: number) => void;

  private isRunning = false;
  private shouldStop = false;

  private seedState: StateVector | null = null;
  private bestResidual = Infinity;
  private bestState: StateVector | null = null;

  private cloudSize = 16;

  constructor(gl: WebGL2RenderingContext, config: SimulationConfig) {
    this.gl = gl;
    this.config = config;
    this.systemKey = config.system === 'rigid' ? 'rigid' : (config.system === 'nonlinear' ? 'nonlinear' : 'elastic');

    this.quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.fb = gl.createFramebuffer()!;

    this.texAPair = this.makePair(1, 1);
    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.texBPair = this.makePair(1, 1);
    }

    this.batchInitProg = this.buildProg(ShaderBuilder.buildBatchInit(this.systemKey));
    this.batchPhysicsProg = this.buildProg(ShaderBuilder.buildBatchPhysics(this.systemKey));
  }

  setCloudSize(size: number) {
    this.cloudSize = size;
  }

  setOnLog(callback: (entry: OptimizerLogEntry) => void) {
    this.onLog = callback;
  }

  setOnProgress(callback: (cycle: number, residual: number) => void) {
    this.onProgress = callback;
  }

  getLogs(): OptimizerLogEntry[] {
    return [...this.logs];
  }

  getBestState(): StateVector | null {
    return this.bestState;
  }

  getBestResidual(): number {
    return this.bestResidual;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  pause() {
    this.shouldStop = true;
  }

  resume() {
    this.shouldStop = false;
    if (!this.isRunning && this.seedState) {
      this.runOptimizationLoop();
    }
  }

  private makeTex(width: number, height: number): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private makePair(width: number, height: number): [WebGLTexture, WebGLTexture] {
    return [this.makeTex(width, height), this.makeTex(width, height)];
  }

  private resizeTextures(width: number, height: number) {
    const gl = this.gl;
    gl.deleteTexture(this.texAPair[0]);
    gl.deleteTexture(this.texAPair[1]);
    this.texAPair = this.makePair(width, height);
    if (this.texBPair) {
      gl.deleteTexture(this.texBPair[0]);
      gl.deleteTexture(this.texBPair[1]);
      this.texBPair = this.makePair(width, height);
    }
    this.texWidth = width;
    this.texHeight = height;
  }

  private buildProg(src: string): CompiledProg {
    const c = new ShaderCompiler(this.gl);
    const sp = c.linkProgram(vertexSource, src, 'batch' as any);
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

  private runBatchInit(seed: StateVector, perturbScale: number, seedVal: number) {
    const gl = this.gl;
    const p = this.use(this.batchInitProg);
    const { a, b } = stateToFloat32Array(seed, this.config.system);

    if (this.systemKey === 'rigid') {
      gl.uniform4f(this.u(p, 'u_seedState'), a[0], a[1], a[2], a[3]);
    } else {
      gl.uniform4f(this.u(p, 'u_seedA'), a[0], a[1], a[2], a[3]);
      gl.uniform4f(this.u(p, 'u_seedB'), b![0], b![1], b![2], b![3]);
    }
    gl.uniform1f(this.u(p, 'u_perturbScale'), perturbScale);
    gl.uniform1f(this.u(p, 'u_seed'), seedVal);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    for (let i = 0; i < 5; i++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, null, 0);
    }
    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texAPair[0], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.texBPair![0], 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    } else {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texAPair[0], 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    }
    gl.viewport(0, 0, this.texWidth, this.texHeight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  private runBatchPhysics(readIdx: 0 | 1, steps: number, dt: number) {
    const gl = this.gl;
    const w = (1 - readIdx) as 0 | 1;
    const p = this.use(this.batchPhysicsProg);

    gl.uniform1f(this.u(p, 'u_dt'), dt);
    gl.uniform1i(this.u(p, 'u_steps'), steps);
    gl.uniform1f(this.u(p, 'u_m1'), this.config.m1);
    gl.uniform1f(this.u(p, 'u_m2'), this.config.m2);
    gl.uniform1f(this.u(p, 'u_L1'), this.config.L1);
    gl.uniform1f(this.u(p, 'u_L2'), this.config.L2);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    for (let i = 0; i < 5; i++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, null, 0);
    }
    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.bind(0, this.texAPair[readIdx]);
      this.bind(1, this.texBPair![readIdx]);
      gl.uniform1i(this.u(p, 'u_stateTextureA'), 0);
      gl.uniform1i(this.u(p, 'u_stateTextureB'), 1);
      gl.uniform1f(this.u(p, 'u_k1'), this.config.k1);
      gl.uniform1f(this.u(p, 'u_k2'), this.config.k2);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texAPair[w], 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.texBPair![w], 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    } else {
      this.bind(0, this.texAPair[readIdx]);
      gl.uniform1i(this.u(p, 'u_stateTexture'), 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texAPair[w], 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    }
    gl.viewport(0, 0, this.texWidth, this.texHeight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);

    return w;
  }

  private readBackStates(readIdx: 0 | 1): { states: StateVector[]; aData: Float32Array; bData: Float32Array | null } {
    const gl = this.gl;
    const count = this.texWidth * this.texHeight;
    const aData = new Float32Array(count * 4);
    const bData = this.systemKey === 'rigid' ? null : new Float32Array(count * 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texAPair[readIdx], 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, 0, this.texWidth, this.texHeight, gl.RGBA, gl.FLOAT, aData);

    if (bData) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texBPair![readIdx], 0);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.readBuffer(gl.COLOR_ATTACHMENT0);
      gl.readPixels(0, 0, this.texWidth, this.texHeight, gl.RGBA, gl.FLOAT, bData);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const states: StateVector[] = [];
    for (let i = 0; i < count; i++) {
      const a = new Float32Array(aData.buffer, i * 4 * 4, 4);
      const b = bData ? new Float32Array(bData.buffer, i * 4 * 4, 4) : null;
      states.push(float32ArrayToState(a, b, this.config.system));
    }

    return { states, aData, bData };
  }

  private periodFrames = 0;

  async startOptimization(initialState: StateVector, periodFrames: number) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.shouldStop = false;
    this.seedState = { ...initialState };
    this.bestState = { ...initialState };
    this.bestResidual = Infinity;
    this.logs = [];
    this.periodFrames = periodFrames;

    const dim = getCloudSizeDimensions(this.cloudSize);
    this.resizeTextures(dim.width, dim.height);

    await this.runOptimizationLoop();
  }

  private async runOptimizationLoop() {
    if (!this.seedState) return;

    let perturbScale = 0.01;
    let dt = this.config.dt;
    let numPeriods = 1;
    let noImprovementCount = 0;
    let cycle = 0;
    const stepsPerFrame = 15;
    const maxCycles = 200;

    while (this.isRunning && cycle < maxCycles) {
      if (this.shouldStop) {
        // Don't set isRunning = false here, just pause
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      cycle++;
      const totalSteps = Math.floor(this.periodFrames * stepsPerFrame * numPeriods);

      // Generate candidates and simulate
      const seedVal = cycle * 1.618;
      this.runBatchInit(this.seedState, perturbScale, seedVal);
      let readIdx: 0 | 1 = 0;
      readIdx = this.runBatchPhysics(readIdx, totalSteps, dt);

      // Read back results
      const { states: endStates } = this.readBackStates(readIdx);

      // Read back the initial states from the texture (what was actually simulated)
      const { states: initialStates } = this.readBackStates(0);

      // Compute residuals
      const residuals: number[] = [];
      let cycleBestResidual = Infinity;
      let cycleBestIdx = 0;

      for (let i = 0; i < this.cloudSize; i++) {
        const residual = computeResidual(initialStates[i], endStates[i], this.config.system);
        residuals.push(residual);
        if (residual < cycleBestResidual) {
          cycleBestResidual = residual;
          cycleBestIdx = i;
        }
      }

      const newBest = cycleBestResidual < this.bestResidual;
      if (newBest) {
        this.bestResidual = cycleBestResidual;
        // Store the INITIAL state that produced the best periodic orbit
        this.bestState = { ...initialStates[cycleBestIdx] };
        this.seedState = { ...initialStates[cycleBestIdx] };
        noImprovementCount = 0;
      } else {
        noImprovementCount++;
      }

      const logEntry: OptimizerLogEntry = {
        cycle,
        bestResidual: cycleBestResidual,
        perturbScale,
        dt,
        numPeriods,
        newBest,
        residuals: residuals.slice(0, this.cloudSize),
      };
      this.logs.push(logEntry);
      if (this.onLog) this.onLog(logEntry);
      if (this.onProgress) this.onProgress(cycle, this.bestResidual);

      // Adaptive refinement
      if (noImprovementCount >= 3) {
        perturbScale *= 0.8;
        dt *= 0.8;
        numPeriods += 1;
        noImprovementCount = 0;
      }

      // Stop criteria - only stop if we hit max cycles or very small perturbations
      if (perturbScale < 1e-9 || cycle >= maxCycles) {
        break;
      }

      // Yield to event loop
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isRunning = false;
  }



  dispose() {
    this.pause();
    const gl = this.gl;
    gl.deleteProgram(this.batchInitProg.program);
    gl.deleteVertexArray(this.batchInitProg.vao);
    gl.deleteProgram(this.batchPhysicsProg.program);
    gl.deleteVertexArray(this.batchPhysicsProg.vao);
    gl.deleteFramebuffer(this.fb);
    gl.deleteBuffer(this.quadBuf);
    gl.deleteTexture(this.texAPair[0]);
    gl.deleteTexture(this.texAPair[1]);
    if (this.texBPair) {
      gl.deleteTexture(this.texBPair[0]);
      gl.deleteTexture(this.texBPair[1]);
    }
  }
}
