import type { SimulationConfig, PhaseSpaceDimension } from '../types/config.ts';
import { TextureManager } from '../webgl/textureManager.ts';
import { FramebufferManager } from '../webgl/framebufferManager.ts';
import { UniformSetter } from '../webgl/uniformSetter.ts';
import { ShaderCompiler } from '../webgl/shaderCompiler.ts';
import { ShaderBuilder } from '../webgl/shaderBuilder.ts';
import type { ShaderProgram } from '../types/shaders.ts';

import vertexSource from '../shaders/vertex.glsl?raw';

type SystemKey = 'rigid' | 'elastic' | 'nonlinear';
type ModeKey = 'distance' | 'divergence';

interface CompiledProgram {
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

export class Simulator {
  private gl: WebGL2RenderingContext;
  private config: SimulationConfig;
  private textures: TextureManager;
  private fb: FramebufferManager;
  private uniforms: UniformSetter;
  private systemKey: SystemKey;
  private modeKey: ModeKey;

  private stateAPair: [WebGLTexture, WebGLTexture];
  private stateBPair: [WebGLTexture, WebGLTexture] | null = null;
  private perturbedAPair: [WebGLTexture, WebGLTexture] | null = null;
  private perturbedBPair: [WebGLTexture, WebGLTexture] | null = null;
  private dataPair: [WebGLTexture, WebGLTexture];

  private readIndex: 0 | 1 = 0;
  private frameCount = 0;
  private isDivergenceComplete = false;

  private framebuffer: WebGLFramebuffer;
  private programs: Map<string, CompiledProgram> = new Map();

  private intervalId: number | null = null;
  private renderIntervalId: number | null = null;
  private onDivergenceRender: (() => void) | null = null;

  constructor(
    gl: WebGL2RenderingContext,
    config: SimulationConfig,
    private quadBuffer: WebGLBuffer,
  ) {
    this.gl = gl;
    this.config = config;
    this.textures = new TextureManager(gl);
    this.fb = new FramebufferManager(gl);
    this.uniforms = new UniformSetter(gl);

    this.systemKey = config.system === 'elastic12' ? 'elastic' : config.system;
    this.modeKey = config.vizMode;

    const res = config.resolution;

    this.stateAPair = this.textures.createTexturePair(res);
    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.stateBPair = this.textures.createTexturePair(res);
    }
    if (this.modeKey === 'divergence') {
      this.perturbedAPair = this.textures.createTexturePair(res);
      if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
        this.perturbedBPair = this.textures.createTexturePair(res);
      }
    }
    this.dataPair = this.textures.createTexturePair(res);

    this.framebuffer = gl.createFramebuffer()!;

    this.compilePrograms();
  }

  private compilePrograms(): void {
    const compiler = new ShaderCompiler(this.gl);
    const builder = ShaderBuilder;

    const initSrc = builder.buildInit(this.systemKey, this.modeKey);
    this.compileAndStore(compiler, 'init', initSrc);

    if (this.modeKey === 'distance') {
      const physicsSrc = builder.buildPhysics(this.systemKey);
      const accumSrc = builder.buildAccumulate(this.systemKey);
      this.compileAndStore(compiler, 'physics', physicsSrc);
      this.compileAndStore(compiler, 'accumulate', accumSrc);
    } else {
      const divStepSrc = builder.buildDivergenceStep(this.systemKey);
      this.compileAndStore(compiler, 'divergeStep', divStepSrc);
    }
  }

  private compileAndStore(compiler: ShaderCompiler, name: string, fragSrc: string): void {
    const program = compiler.linkProgram(vertexSource, fragSrc, name as any);
    const vao = this.gl.createVertexArray()!;
    this.gl.bindVertexArray(vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    const posLoc = this.gl.getAttribLocation(program.program, 'a_position');
    if (posLoc >= 0) {
      this.gl.enableVertexAttribArray(posLoc);
      this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0);
    }
    this.gl.bindVertexArray(null);
    this.programs.set(name, { program: program.program, vao });
  }

  private getProg(name: string): CompiledProgram {
    const p = this.programs.get(name);
    if (!p) throw new Error(`Program not found: ${name}`);
    return p;
  }

  private setPhaseSpaceUniforms(program: WebGLProgram): void {
    const ps = this.config.phaseSpace;
    const iv = ps.initialValues;

    if (this.systemKey === 'rigid') {
      this.uniforms.set4f(program, 'u_initialState',
        iv.angle1, iv.velocity1, iv.angle2, iv.velocity2);
    } else {
      this.uniforms.set4f(program, 'u_initialA',
        iv.angle1, iv.velocity1, iv.stretch1, iv.stretchRate1);
      this.uniforms.set4f(program, 'u_initialB',
        iv.angle2, iv.velocity2, iv.stretch2, iv.stretchRate2);
    }

    this.uniforms.set2f(program, 'u_xRange', ps.x.min, ps.x.max);
    this.uniforms.set2f(program, 'u_yRange', ps.y.min, ps.y.max);
    this.uniforms.set1i(program, 'u_xDim', DIM_INDEX[ps.x.dimension]);
    this.uniforms.set1i(program, 'u_yDim', DIM_INDEX[ps.y.dimension]);
  }

  reset(): void {
    this.readIndex = 0;
    this.frameCount = 0;
    this.isDivergenceComplete = false;
    const gl = this.gl;
    const res = this.config.resolution;
    const rIdx = this.readIndex;
    const wIdx: 0 | 1 = 1;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

    if (this.modeKey === 'distance') {
      this.initDistanceState(rIdx, wIdx, res);
      this.initDistanceData(rIdx, wIdx, res);
    } else {
      this.initDivergenceState(rIdx, wIdx, res);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  private initDistanceState(rIdx: 0 | 1, _wIdx: 0 | 1, res: number): void {
    const gl = this.gl;
    const prog = this.getProg('init');

    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    this.setPhaseSpaceUniforms(prog.program);

    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.stateAPair[rIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, this.stateBPair![rIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    } else {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.stateAPair[rIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    }

    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private initDistanceData(rIdx: 0 | 1, wIdx: 0 | 1, res: number): void {
    const gl = this.gl;
    const prog = this.getProg('accumulate');

    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);

    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.textures.bindTexture(0, this.stateAPair[rIdx]);
      this.textures.bindTexture(1, this.stateBPair![rIdx]);
      this.uniforms.set1i(prog.program, 'u_stateTextureA', 0);
      this.uniforms.set1i(prog.program, 'u_stateTextureB', 1);
    } else {
      this.textures.bindTexture(0, this.stateAPair[rIdx]);
      this.uniforms.set1i(prog.program, 'u_stateTexture', 0);
    }

    this.textures.bindTexture(this.systemKey === 'elastic' || this.systemKey === 'nonlinear' ? 2 : 1, this.dataPair[rIdx]);
    this.uniforms.set1i(prog.program, 'u_distanceTexture', this.systemKey === 'elastic' || this.systemKey === 'nonlinear' ? 2 : 1);
    this.uniforms.set1b(prog.program, 'u_reset', true);

    this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.dataPair[wIdx]);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    [this.dataPair[0], this.dataPair[1]] = [this.dataPair[1], this.dataPair[0]];
  }

  private initDivergenceState(rIdx: 0 | 1, _wIdx: 0 | 1, res: number): void {
    const gl = this.gl;
    const prog = this.getProg('init');

    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    this.setPhaseSpaceUniforms(prog.program);
    this.uniforms.set1f(prog.program, 'u_perturb', this.config.perturb);
    this.uniforms.set1f(prog.program, 'u_seed', this.config.seed);

    const attachments: number[] = [];

    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.stateAPair[rIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, this.stateBPair![rIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT2, this.perturbedAPair![rIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT3, this.perturbedBPair![rIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT4, this.dataPair[rIdx]);
      attachments.push(gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3, gl.COLOR_ATTACHMENT4);
    } else {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.stateAPair[rIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, this.perturbedAPair![rIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT2, this.dataPair[rIdx]);
      attachments.push(gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2);
    }

    gl.drawBuffers(attachments);
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  stepDistance(): void {
    const gl = this.gl;
    const res = this.config.resolution;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

    for (let i = 0; i < this.config.iterationsPerFrame; i++) {
      const rIdx = this.readIndex;
      const wIdx = (1 - this.readIndex) as 0 | 1;

      this.stepPhysics(rIdx, wIdx, res);
      this.stepAccumulate(wIdx, rIdx, wIdx, res);

      this.readIndex = wIdx;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
    this.frameCount += this.config.iterationsPerFrame;
  }

  private stepPhysics(rIdx: 0 | 1, wIdx: 0 | 1, res: number): void {
    const gl = this.gl;
    const prog = this.getProg('physics');

    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);

    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.textures.bindTexture(0, this.stateAPair[rIdx]);
      this.textures.bindTexture(1, this.stateBPair![rIdx]);
      this.uniforms.set1i(prog.program, 'u_stateTextureA', 0);
      this.uniforms.set1i(prog.program, 'u_stateTextureB', 1);
      this.uniforms.set1f(prog.program, 'u_k1', this.config.k1);
      this.uniforms.set1f(prog.program, 'u_k2', this.config.k2);
      this.uniforms.set1f(prog.program, 'u_m1', this.config.m1);
      this.uniforms.set1f(prog.program, 'u_m2', this.config.m2);
      this.uniforms.set1f(prog.program, 'u_L1', this.config.L1);
      this.uniforms.set1f(prog.program, 'u_L2', this.config.L2);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);

      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.stateAPair[wIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, this.stateBPair![wIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    } else {
      this.textures.bindTexture(0, this.stateAPair[rIdx]);
      this.uniforms.set1i(prog.program, 'u_stateTexture', 0);
      this.uniforms.set1f(prog.program, 'u_m1', this.config.m1);
      this.uniforms.set1f(prog.program, 'u_m2', this.config.m2);
      this.uniforms.set1f(prog.program, 'u_L1', this.config.L1);
      this.uniforms.set1f(prog.program, 'u_L2', this.config.L2);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);

      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.stateAPair[wIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    }

    this.uniforms.set1f(prog.program, 'u_dt', this.config.dt);
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private stepAccumulate(stateIdx: 0 | 1, dataReadIdx: 0 | 1, dataWriteIdx: 0 | 1, res: number): void {
    const gl = this.gl;
    const prog = this.getProg('accumulate');

    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);

    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.textures.bindTexture(0, this.stateAPair[stateIdx]);
      this.textures.bindTexture(1, this.stateBPair![stateIdx]);
      this.textures.bindTexture(2, this.dataPair[dataReadIdx]);
      this.uniforms.set1i(prog.program, 'u_stateTextureA', 0);
      this.uniforms.set1i(prog.program, 'u_stateTextureB', 1);
      this.uniforms.set1i(prog.program, 'u_distanceTexture', 2);
    } else {
      this.textures.bindTexture(0, this.stateAPair[stateIdx]);
      this.textures.bindTexture(1, this.dataPair[dataReadIdx]);
      this.uniforms.set1i(prog.program, 'u_stateTexture', 0);
      this.uniforms.set1i(prog.program, 'u_distanceTexture', 1);
    }

    this.uniforms.set1b(prog.program, 'u_reset', false);

    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, null, 0);
    }
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);

    this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.dataPair[dataWriteIdx]);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  startDivergence(onRender: () => void): void {
    this.stopDivergence();
    this.onDivergenceRender = onRender;
    this.reset();

    this.intervalId = window.setInterval(() => {
      if (this.frameCount >= this.config.maxIter) {
        this.isDivergenceComplete = true;
        this.stopDivergence();
        return;
      }
      this.stepDivergenceBatch();
    }, 20);

    this.renderIntervalId = window.setInterval(() => {
      if (this.onDivergenceRender) this.onDivergenceRender();
    }, 500);
  }

  stopDivergence(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.renderIntervalId !== null) {
      clearInterval(this.renderIntervalId);
      this.renderIntervalId = null;
    }
  }

  private stepDivergenceBatch(): void {
    const gl = this.gl;
    const res = this.config.resolution;
    const batchSize = 20;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

    for (let i = 0; i < batchSize; i++) {
      if (this.frameCount >= this.config.maxIter) break;
      this.frameCount++;

      const rIdx = this.readIndex;
      const wIdx = (1 - this.readIndex) as 0 | 1;

      this.stepDivergeOnce(rIdx, wIdx, res);
      this.readIndex = wIdx;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  private stepDivergeOnce(rIdx: 0 | 1, wIdx: 0 | 1, res: number): void {
    const gl = this.gl;
    const prog = this.getProg('divergeStep');

    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);

    if (this.systemKey === 'elastic' || this.systemKey === 'nonlinear') {
      this.textures.bindTexture(0, this.stateAPair[rIdx]);
      this.textures.bindTexture(1, this.stateBPair![rIdx]);
      this.textures.bindTexture(2, this.perturbedAPair![rIdx]);
      this.textures.bindTexture(3, this.perturbedBPair![rIdx]);
      this.textures.bindTexture(4, this.dataPair[rIdx]);

      this.uniforms.set1i(prog.program, 'u_baseTextureA', 0);
      this.uniforms.set1i(prog.program, 'u_baseTextureB', 1);
      this.uniforms.set1i(prog.program, 'u_pertTextureA', 2);
      this.uniforms.set1i(prog.program, 'u_pertTextureB', 3);
      this.uniforms.set1i(prog.program, 'u_divergenceTexture', 4);

      this.uniforms.set1f(prog.program, 'u_k1', this.config.k1);
      this.uniforms.set1f(prog.program, 'u_k2', this.config.k2);
      this.uniforms.set1f(prog.program, 'u_m1', this.config.m1);
      this.uniforms.set1f(prog.program, 'u_m2', this.config.m2);
      this.uniforms.set1f(prog.program, 'u_L1', this.config.L1);
      this.uniforms.set1f(prog.program, 'u_L2', this.config.L2);

      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.stateAPair[wIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, this.stateBPair![wIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT2, this.perturbedAPair![wIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT3, this.perturbedBPair![wIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT4, this.dataPair[wIdx]);
      gl.drawBuffers([
        gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1,
        gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3, gl.COLOR_ATTACHMENT4,
      ]);
    } else {
      this.textures.bindTexture(0, this.stateAPair[rIdx]);
      this.textures.bindTexture(1, this.perturbedAPair![rIdx]);
      this.textures.bindTexture(2, this.dataPair[rIdx]);

      this.uniforms.set1i(prog.program, 'u_stateTexture', 0);
      this.uniforms.set1i(prog.program, 'u_perturbedTexture', 1);
      this.uniforms.set1i(prog.program, 'u_divergenceTexture', 2);
      this.uniforms.set1f(prog.program, 'u_m1', this.config.m1);
      this.uniforms.set1f(prog.program, 'u_m2', this.config.m2);
      this.uniforms.set1f(prog.program, 'u_L1', this.config.L1);
      this.uniforms.set1f(prog.program, 'u_L2', this.config.L2);

      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.stateAPair[wIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, this.perturbedAPair![wIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT2, this.dataPair[wIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    }

    this.uniforms.set1f(prog.program, 'u_dt', this.config.dt);
    this.uniforms.set1i(prog.program, 'u_currentIter', this.frameCount);

    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  getDataTexture(): WebGLTexture {
    return this.dataPair[this.readIndex];
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  isComplete(): boolean {
    return this.isDivergenceComplete;
  }

  dispose(): void {
    this.stopDivergence();
    const gl = this.gl;

    for (const [, prog] of this.programs) {
      gl.deleteProgram(prog.program);
      gl.deleteVertexArray(prog.vao);
    }
    this.programs.clear();

    gl.deleteFramebuffer(this.framebuffer);

    const allTextures = [this.stateAPair, this.dataPair];
    if (this.stateBPair) allTextures.push(this.stateBPair);
    if (this.perturbedAPair) allTextures.push(this.perturbedAPair);
    if (this.perturbedBPair) allTextures.push(this.perturbedBPair);

    for (const pair of allTextures) {
      gl.deleteTexture(pair[0]);
      gl.deleteTexture(pair[1]);
    }
  }
}
