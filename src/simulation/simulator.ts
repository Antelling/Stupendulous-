import type { SimulationConfig, PhaseSpaceDimension } from '../types/config.ts';
import { TextureManager } from '../webgl/textureManager.ts';
import { FramebufferManager } from '../webgl/framebufferManager.ts';
import { UniformSetter } from '../webgl/uniformSetter.ts';
import { ShaderCompiler } from '../webgl/shaderCompiler.ts';
import { ShaderBuilder } from '../webgl/shaderBuilder.ts';

import vertexSource from '../shaders/vertex.glsl?raw';

type SystemKey = 'rigid' | 'elastic' | 'nonlinear';
type ModeKey = 'distance' | 'divergence' | 'divergenceDistance';

interface CompiledProgram {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
}

const DIM_INDEX: Record<PhaseSpaceDimension, number> = {
  angle1: 0, velocity1: 1, stretch1: 2, stretchRate1: 3,
  angle2: 4, velocity2: 5, stretch2: 6, stretchRate2: 7,
};

export class Simulator {
  private gl: WebGL2RenderingContext;
  private config: SimulationConfig;
  private textures: TextureManager;
  private fb: FramebufferManager;
  private uniforms: UniformSetter;
  private systemKey: SystemKey;
  private modeKey: ModeKey;
  private isElastic: boolean;

  private stateAPair: [WebGLTexture, WebGLTexture] | null = null;
  private stateBPair: [WebGLTexture, WebGLTexture] | null = null;
  private perturbedAPair: [WebGLTexture, WebGLTexture] | null = null;
  private perturbedBPair: [WebGLTexture, WebGLTexture] | null = null;
  private dataPair: [WebGLTexture, WebGLTexture] | null = null;

  private readIndex: 0 | 1 = 0;
  private frameCount = 0;
  private complete = false;

  private framebuffer: WebGLFramebuffer;
  private programs: Map<string, CompiledProgram> = new Map();
  private onDivergenceRender: (() => void) | null = null;

  private chunking = false;
  private chunksPerSide = 1;
  private currentChunkX = 0;
  private currentChunkY = 0;
  private chunkReadIndex: 0 | 1 = 0;
  private chunkFrameCount = 0;

  private chunkStateAPair: [WebGLTexture, WebGLTexture] | null = null;
  private chunkStateBPair: [WebGLTexture, WebGLTexture] | null = null;
  private chunkPerturbedAPair: [WebGLTexture, WebGLTexture] | null = null;
  private chunkPerturbedBPair: [WebGLTexture, WebGLTexture] | null = null;
  private chunkDataPair: [WebGLTexture, WebGLTexture] | null = null;
  private chunkResults: WebGLTexture[] = [];
  private chunkDone: boolean[] = [];
  private animatingFirstChunk = false;

  constructor(gl: WebGL2RenderingContext, config: SimulationConfig, private quadBuffer: WebGLBuffer) {
    this.gl = gl;
    this.config = config;
    this.textures = new TextureManager(gl);
    this.fb = new FramebufferManager(gl);
    this.uniforms = new UniformSetter(gl);

    this.systemKey = config.system === 'elastic12' ? 'elastic' : config.system;
    this.modeKey = config.vizMode;
    this.isElastic = this.systemKey === 'elastic' || this.systemKey === 'nonlinear';

    const res = config.resolution;
    const chunkSize = config.chunkSize;
    this.chunking = chunkSize < res;

    if (this.chunking) {
      this.chunksPerSide = res / chunkSize;
      const total = this.chunksPerSide * this.chunksPerSide;

      this.chunkStateAPair = this.textures.createTexturePair(chunkSize);
      if (this.isElastic) this.chunkStateBPair = this.textures.createTexturePair(chunkSize);
      if (this.modeKey !== 'distance') {
        this.chunkPerturbedAPair = this.textures.createTexturePair(chunkSize);
        if (this.isElastic) this.chunkPerturbedBPair = this.textures.createTexturePair(chunkSize);
      }
      this.chunkDataPair = this.textures.createTexturePair(chunkSize);

      for (let i = 0; i < total; i++) {
        this.chunkResults.push(this.textures.createFloatTexture(chunkSize));
        this.chunkDone.push(false);
      }
    } else {
      this.stateAPair = this.textures.createTexturePair(res);
      if (this.isElastic) this.stateBPair = this.textures.createTexturePair(res);
      if (this.modeKey !== 'distance') {
        this.perturbedAPair = this.textures.createTexturePair(res);
        if (this.isElastic) this.perturbedBPair = this.textures.createTexturePair(res);
      }
      this.dataPair = this.textures.createTexturePair(res);
    }

    this.framebuffer = gl.createFramebuffer()!;
    this.compilePrograms();
  }

  private compilePrograms(): void {
    const compiler = new ShaderCompiler(this.gl);
    this.compileAndStore(compiler, 'init', ShaderBuilder.buildInit(this.systemKey, this.modeKey));
    if (this.modeKey === 'distance') {
      this.compileAndStore(compiler, 'physics', ShaderBuilder.buildPhysics(this.systemKey));
      this.compileAndStore(compiler, 'accumulate', ShaderBuilder.buildAccumulate(this.systemKey));
    } else {
      this.compileAndStore(compiler, 'divergeStep', ShaderBuilder.buildDivergenceStep(this.systemKey, this.modeKey));
    }
    if (this.chunking) {
      this.compileAndStore(compiler, 'blit', ShaderBuilder.buildBlit());
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
      this.uniforms.set4f(program, 'u_initialState', iv.angle1, iv.velocity1, iv.angle2, iv.velocity2);
    } else {
      this.uniforms.set4f(program, 'u_initialA', iv.angle1, iv.velocity1, iv.stretch1, iv.stretchRate1);
      this.uniforms.set4f(program, 'u_initialB', iv.angle2, iv.velocity2, iv.stretch2, iv.stretchRate2);
    }
    this.uniforms.set2f(program, 'u_xRange', ps.x.min, ps.x.max);
    this.uniforms.set2f(program, 'u_yRange', ps.y.min, ps.y.max);
    this.uniforms.set1i(program, 'u_xDim', DIM_INDEX[ps.x.dimension]);
    this.uniforms.set1i(program, 'u_yDim', DIM_INDEX[ps.y.dimension]);
  }

  private detachAll(): void {
    const gl = this.gl;
    for (let i = 0; i < 8; i++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, null, 0);
    }
  }

  isChunkedMode(): boolean { return this.chunking; }
  getChunksPerSide(): number { return this.chunksPerSide; }

  getChunkResultTexture(cx: number, cy: number): WebGLTexture | null {
    if (this.chunkDone[cy * this.chunksPerSide + cx]) {
      return this.chunkResults[cy * this.chunksPerSide + cx];
    }
    return null;
  }

  getCurrentChunkInfo(): { cx: number; cy: number; texture: WebGLTexture } | null {
    if (!this.chunking || !this.animatingFirstChunk) return null;
    return { cx: this.currentChunkX, cy: this.currentChunkY, texture: this.chunkDataPair![this.chunkReadIndex] };
  }

  reset(): void {
    this.readIndex = 0;
    this.frameCount = 0;
    this.complete = false;
    this.currentChunkX = 0;
    this.currentChunkY = 0;
    this.chunkFrameCount = 0;
    this.chunkReadIndex = 0;
    this.animatingFirstChunk = false;
    for (let i = 0; i < this.chunkDone.length; i++) this.chunkDone[i] = false;

    const gl = this.gl;
    const res = this.config.resolution;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    this.detachAll();

    if (this.modeKey === 'distance') {
      if (this.chunking) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        this.detachAll();
        this.initDistanceChunk(0, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindVertexArray(null);
        this.animatingFirstChunk = true;
      } else {
        this.initDistanceStateFull(0, res);
        this.initDistanceDataFull(0, res);
      }
    } else if (!this.chunking) {
      this.initDivergenceFull(0, res);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  // ─── Distance mode ───

  stepDistance(): void {
    if (this.complete) return;

    if (this.chunking) {
      this.stepDistanceChunked();
    } else {
      this.stepDistanceFull();
    }
  }

  private stepDistanceFull(): void {
    if (!this.dataPair) return;
    const remaining = this.config.maxIter - this.frameCount;
    if (remaining <= 0) { this.complete = true; return; }

    const gl = this.gl;
    const res = this.config.resolution;
    const iters = Math.min(this.config.iterationsPerFrame, remaining);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    for (let i = 0; i < iters; i++) {
      const rIdx = this.readIndex;
      const wIdx = (1 - this.readIndex) as 0 | 1;
      this.stepPhysics(this.stateAPair!, this.stateBPair, rIdx, wIdx, res);
      this.stepAccumulate(this.stateAPair!, this.stateBPair, this.dataPair!, wIdx, rIdx, wIdx, res);
      this.readIndex = wIdx;
    }
    this.frameCount += iters;
    if (this.frameCount >= this.config.maxIter) this.complete = true;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  private stepDistanceChunked(): void {
    const batchSize = 20;
    const gl = this.gl;

    if (this.chunkFrameCount >= this.config.maxIter) {
      this.blitChunkToResult(this.currentChunkX, this.currentChunkY);
      this.advanceChunk();
      if (this.currentChunkY < this.chunksPerSide) {
        this.chunkFrameCount = 0;
        this.chunkReadIndex = 0;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        this.detachAll();
        this.initDistanceChunk(this.currentChunkX, this.currentChunkY);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindVertexArray(null);
        this.animatingFirstChunk = true;
      } else {
        this.animatingFirstChunk = false;
        this.complete = true;
      }
      return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    for (let i = 0; i < batchSize && this.chunkFrameCount < this.config.maxIter; i++) {
      this.chunkFrameCount++;
      const rIdx = this.chunkReadIndex;
      const wIdx = (1 - this.chunkReadIndex) as 0 | 1;
      this.stepPhysics(this.chunkStateAPair!, this.chunkStateBPair, rIdx, wIdx, this.config.chunkSize);
      this.stepAccumulate(this.chunkStateAPair!, this.chunkStateBPair, this.chunkDataPair!, wIdx, rIdx, wIdx, this.config.chunkSize);
      this.chunkReadIndex = wIdx;
    }
    this.frameCount += batchSize;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  private initDistanceChunk(cx: number, cy: number): void {
    const gl = this.gl;
    const chunkSize = this.config.chunkSize;

    const prog = this.getProg('init');
    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    this.setPhaseSpaceUniforms(prog.program);
    this.uniforms.set2f(prog.program, 'u_chunkOffset', cx / this.chunksPerSide, cy / this.chunksPerSide);
    this.uniforms.set1f(prog.program, 'u_chunkScale', 1.0 / this.chunksPerSide);

    if (this.isElastic) {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.chunkStateAPair![0]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, this.chunkStateBPair![0]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    } else {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.chunkStateAPair![0]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    }
    gl.viewport(0, 0, chunkSize, chunkSize);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (this.isElastic) {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.chunkStateAPair![1]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, this.chunkStateBPair![1]);
    } else {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.chunkStateAPair![1]);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const accProg = this.getProg('accumulate');
    gl.useProgram(accProg.program);
    gl.bindVertexArray(accProg.vao);
    if (this.isElastic) {
      this.textures.bindTexture(0, this.chunkStateAPair![0]);
      this.textures.bindTexture(1, this.chunkStateBPair![0]);
      this.uniforms.set1i(accProg.program, 'u_stateTextureA', 0);
      this.uniforms.set1i(accProg.program, 'u_stateTextureB', 1);
    } else {
      this.textures.bindTexture(0, this.chunkStateAPair![0]);
      this.uniforms.set1i(accProg.program, 'u_stateTexture', 0);
    }
    this.uniforms.set1b(accProg.program, 'u_reset', true);
    this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.chunkDataPair![0]);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, chunkSize, chunkSize);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private initDistanceStateFull(rIdx: 0 | 1, res: number): void {
    const gl = this.gl;
    const prog = this.getProg('init');
    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    this.setPhaseSpaceUniforms(prog.program);
    this.uniforms.set2f(prog.program, 'u_chunkOffset', 0, 0);
    this.uniforms.set1f(prog.program, 'u_chunkScale', 1.0);
    if (this.isElastic) {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.stateAPair![rIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, this.stateBPair![rIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    } else {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.stateAPair![rIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    }
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private initDistanceDataFull(rIdx: 0 | 1, res: number): void {
    const gl = this.gl;
    const prog = this.getProg('accumulate');
    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    if (this.isElastic) {
      this.textures.bindTexture(0, this.stateAPair![rIdx]);
      this.textures.bindTexture(1, this.stateBPair![rIdx]);
      this.uniforms.set1i(prog.program, 'u_stateTextureA', 0);
      this.uniforms.set1i(prog.program, 'u_stateTextureB', 1);
    } else {
      this.textures.bindTexture(0, this.stateAPair![rIdx]);
      this.uniforms.set1i(prog.program, 'u_stateTexture', 0);
    }
    this.uniforms.set1b(prog.program, 'u_reset', true);
    this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.dataPair![1]);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    [this.dataPair![0], this.dataPair![1]] = [this.dataPair![1], this.dataPair![0]];
  }

  private stepPhysics(
    sA: [WebGLTexture, WebGLTexture], sB: [WebGLTexture, WebGLTexture] | null,
    rIdx: 0 | 1, wIdx: 0 | 1, size: number,
  ): void {
    const gl = this.gl;
    const prog = this.getProg('physics');
    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    if (this.isElastic) {
      this.textures.bindTexture(0, sA[rIdx]);
      this.textures.bindTexture(1, sB![rIdx]);
      this.uniforms.set1i(prog.program, 'u_stateTextureA', 0);
      this.uniforms.set1i(prog.program, 'u_stateTextureB', 1);
      this.uniforms.set1f(prog.program, 'u_k1', this.config.k1);
      this.uniforms.set1f(prog.program, 'u_k2', this.config.k2);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, sA[wIdx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, sB![wIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    } else {
      this.textures.bindTexture(0, sA[rIdx]);
      this.uniforms.set1i(prog.program, 'u_stateTexture', 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, sA[wIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    }
    this.setPhysicsUniforms(prog.program);
    this.uniforms.set1f(prog.program, 'u_dt', this.config.dt);
    gl.viewport(0, 0, size, size);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private stepAccumulate(
    sA: [WebGLTexture, WebGLTexture], sB: [WebGLTexture, WebGLTexture] | null,
    dP: [WebGLTexture, WebGLTexture],
    stateIdx: 0 | 1, dataRead: 0 | 1, dataWrite: 0 | 1, size: number,
  ): void {
    const gl = this.gl;
    const prog = this.getProg('accumulate');
    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    if (this.isElastic) {
      this.textures.bindTexture(0, sA[stateIdx]);
      this.textures.bindTexture(1, sB![stateIdx]);
      this.textures.bindTexture(2, dP[dataRead]);
      this.uniforms.set1i(prog.program, 'u_stateTextureA', 0);
      this.uniforms.set1i(prog.program, 'u_stateTextureB', 1);
      this.uniforms.set1i(prog.program, 'u_distanceTexture', 2);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, null, 0);
    } else {
      this.textures.bindTexture(0, sA[stateIdx]);
      this.textures.bindTexture(1, dP[dataRead]);
      this.uniforms.set1i(prog.program, 'u_stateTexture', 0);
      this.uniforms.set1i(prog.program, 'u_distanceTexture', 1);
    }
    this.uniforms.set1b(prog.program, 'u_reset', false);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
    this.fb.attachColor(gl.COLOR_ATTACHMENT0, dP[dataWrite]);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, size, size);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ─── Divergence (non-chunked) ───

  private initDivergenceFull(rIdx: 0 | 1, res: number): void {
    const gl = this.gl;
    const prog = this.getProg('init');
    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    this.setPhaseSpaceUniforms(prog.program);
    if (this.modeKey === 'divergenceDistance') {
      this.setPhysicsUniforms(prog.program);
    }
    this.uniforms.set1f(prog.program, 'u_perturb', this.config.perturb);
    this.uniforms.set1f(prog.program, 'u_seed', this.config.seed);
    this.uniforms.set2f(prog.program, 'u_chunkOffset', 0, 0);
    this.uniforms.set1f(prog.program, 'u_chunkScale', 1.0);
    this.attachDivOutputs(rIdx, false);
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private stepDivergeFull(rIdx: 0 | 1, wIdx: 0 | 1, res: number): void {
    const gl = this.gl;
    const prog = this.getProg('divergeStep');
    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    this.bindDivInputs(rIdx, false);
    this.setDivUniforms(prog.program, this.frameCount);
    this.uniforms.set2f(prog.program, 'u_chunkOffset', 0, 0);
    this.uniforms.set1f(prog.program, 'u_chunkScale', 1.0);
    this.attachDivOutputs(wIdx, false);
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ─── Divergence (chunked) ───

  private initChunk(cx: number, cy: number): void {
    const gl = this.gl;
    const chunkSize = this.config.chunkSize;
    const prog = this.getProg('init');
    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    this.setPhaseSpaceUniforms(prog.program);
    if (this.modeKey === 'divergenceDistance') {
      this.setPhysicsUniforms(prog.program);
    }
    this.uniforms.set1f(prog.program, 'u_perturb', this.config.perturb);
    this.uniforms.set1f(prog.program, 'u_seed', this.config.seed);
    this.uniforms.set2f(prog.program, 'u_chunkOffset', cx / this.chunksPerSide, cy / this.chunksPerSide);
    this.uniforms.set1f(prog.program, 'u_chunkScale', 1.0 / this.chunksPerSide);
    this.attachDivOutputs(0, true);
    gl.viewport(0, 0, chunkSize, chunkSize);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.attachDivOutputs(1, true);
    gl.viewport(0, 0, chunkSize, chunkSize);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private stepDivergeChunk(rIdx: 0 | 1, wIdx: 0 | 1): void {
    const gl = this.gl;
    const chunkSize = this.config.chunkSize;
    const prog = this.getProg('divergeStep');
    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    this.bindDivInputs(rIdx, true);
    this.setDivUniforms(prog.program, this.chunkFrameCount);
    this.uniforms.set2f(prog.program, 'u_chunkOffset', 0, 0);
    this.uniforms.set1f(prog.program, 'u_chunkScale', 1.0);
    this.attachDivOutputs(wIdx, true);
    gl.viewport(0, 0, chunkSize, chunkSize);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private blitChunkToResult(cx: number, cy: number): void {
    const gl = this.gl;
    const chunkSize = this.config.chunkSize;
    const idx = cy * this.chunksPerSide + cx;
    const prog = this.getProg('blit');

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    this.detachAll();
    gl.useProgram(prog.program);
    gl.bindVertexArray(prog.vao);
    this.textures.bindTexture(0, this.chunkDataPair![this.chunkReadIndex]);
    this.uniforms.set1i(prog.program, 'u_src', 0);
    this.fb.attachColor(gl.COLOR_ATTACHMENT0, this.chunkResults[idx]);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, chunkSize, chunkSize);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.chunkDone[idx] = true;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  // ─── Shared divergence helpers ───

  private attachDivOutputs(idx: 0 | 1, chunk: boolean): void {
    const gl = this.gl;
    const sA = chunk ? this.chunkStateAPair! : this.stateAPair!;
    const sB = chunk ? this.chunkStateBPair : this.stateBPair;
    const pA = chunk ? this.chunkPerturbedAPair! : this.perturbedAPair!;
    const pB = chunk ? this.chunkPerturbedBPair : this.perturbedBPair;
    const dP = chunk ? this.chunkDataPair! : this.dataPair!;
    if (this.isElastic) {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, sA[idx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, sB![idx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT2, pA[idx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT3, pB![idx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT4, dP[idx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3, gl.COLOR_ATTACHMENT4]);
    } else {
      this.fb.attachColor(gl.COLOR_ATTACHMENT0, sA[idx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT1, pA[idx]);
      this.fb.attachColor(gl.COLOR_ATTACHMENT2, dP[idx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    }
  }

  private bindDivInputs(rIdx: 0 | 1, chunk: boolean): void {
    const gl = this.gl;
    const prog = this.getProg('divergeStep');
    const sA = chunk ? this.chunkStateAPair! : this.stateAPair!;
    const sB = chunk ? this.chunkStateBPair : this.stateBPair;
    const pA = chunk ? this.chunkPerturbedAPair! : this.perturbedAPair!;
    const pB = chunk ? this.chunkPerturbedBPair : this.perturbedBPair;
    const dP = chunk ? this.chunkDataPair! : this.dataPair!;
    if (this.isElastic) {
      this.textures.bindTexture(0, sA[rIdx]);
      this.textures.bindTexture(1, sB![rIdx]);
      this.textures.bindTexture(2, pA[rIdx]);
      this.textures.bindTexture(3, pB![rIdx]);
      this.textures.bindTexture(4, dP[rIdx]);
      this.uniforms.set1i(prog.program, 'u_baseTextureA', 0);
      this.uniforms.set1i(prog.program, 'u_baseTextureB', 1);
      this.uniforms.set1i(prog.program, 'u_pertTextureA', 2);
      this.uniforms.set1i(prog.program, 'u_pertTextureB', 3);
      this.uniforms.set1i(prog.program, 'u_divergenceTexture', 4);
    } else {
      this.textures.bindTexture(0, sA[rIdx]);
      this.textures.bindTexture(1, pA[rIdx]);
      this.textures.bindTexture(2, dP[rIdx]);
      this.uniforms.set1i(prog.program, 'u_stateTexture', 0);
      this.uniforms.set1i(prog.program, 'u_perturbedTexture', 1);
      this.uniforms.set1i(prog.program, 'u_divergenceTexture', 2);
    }
  }

  private setDivUniforms(program: WebGLProgram, iter: number): void {
    this.setPhysicsUniforms(program);
    this.uniforms.set1f(program, 'u_dt', this.config.dt);
    this.uniforms.set1i(program, 'u_currentIter', iter);
  }

  private setPhysicsUniforms(program: WebGLProgram): void {
    this.uniforms.set1f(program, 'u_m1', this.config.m1);
    this.uniforms.set1f(program, 'u_m2', this.config.m2);
    this.uniforms.set1f(program, 'u_L1', this.config.L1);
    this.uniforms.set1f(program, 'u_L2', this.config.L2);
    if (this.isElastic) {
      this.uniforms.set1f(program, 'u_k1', this.config.k1);
      this.uniforms.set1f(program, 'u_k2', this.config.k2);
    }
  }

  // ─── Divergence orchestration ───

  startDivergence(onRender: () => void): void {
    this.onDivergenceRender = onRender;
    this.reset();

    if (this.chunking) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
      this.detachAll();
      this.initChunk(0, 0);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.bindVertexArray(null);
      this.animatingFirstChunk = true;
    } else {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
      this.detachAll();
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.bindVertexArray(null);
    }
  }

  stepDivergence(): void {
    if (this.complete) return;

    const batchSize = 20;
    const gl = this.gl;

    if (this.chunking) {
      if (this.chunkFrameCount >= this.config.maxIter) {
        this.blitChunkToResult(this.currentChunkX, this.currentChunkY);
        this.advanceChunk();
        if (this.currentChunkY < this.chunksPerSide) {
          this.chunkFrameCount = 0;
          this.chunkReadIndex = 0;
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
          this.detachAll();
          this.initChunk(this.currentChunkX, this.currentChunkY);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.bindVertexArray(null);
          this.animatingFirstChunk = true;
        } else {
          this.animatingFirstChunk = false;
          this.complete = true;
        }
        return;
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      for (let i = 0; i < batchSize && this.chunkFrameCount < this.config.maxIter; i++) {
        this.chunkFrameCount++;
        const rIdx = this.chunkReadIndex;
        const wIdx = (1 - this.chunkReadIndex) as 0 | 1;
        this.stepDivergeChunk(rIdx, wIdx);
        this.chunkReadIndex = wIdx;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindVertexArray(null);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      for (let i = 0; i < batchSize && this.frameCount < this.config.maxIter; i++) {
        this.frameCount++;
        const rIdx = this.readIndex;
        const wIdx = (1 - this.readIndex) as 0 | 1;
        this.stepDivergeFull(rIdx, wIdx, this.config.resolution);
        this.readIndex = wIdx;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindVertexArray(null);
      if (this.frameCount >= this.config.maxIter) this.complete = true;
    }
  }

  private advanceChunk(): void {
    this.currentChunkX++;
    if (this.currentChunkX >= this.chunksPerSide) {
      this.currentChunkX = 0;
      this.currentChunkY++;
    }
  }

  // ─── Public getters ───

  getDataTexture(): WebGLTexture {
    return this.dataPair![this.readIndex];
  }

  getFrameCount(): number { return this.frameCount; }
  isComplete(): boolean { return this.complete; }

  dispose(): void {
    const gl = this.gl;
    for (const [, prog] of this.programs) {
      gl.deleteProgram(prog.program);
      gl.deleteVertexArray(prog.vao);
    }
    this.programs.clear();
    gl.deleteFramebuffer(this.framebuffer);

    const pairs: [WebGLTexture, WebGLTexture][] = [];
    if (this.stateAPair) pairs.push(this.stateAPair);
    if (this.stateBPair) pairs.push(this.stateBPair);
    if (this.perturbedAPair) pairs.push(this.perturbedAPair);
    if (this.perturbedBPair) pairs.push(this.perturbedBPair);
    if (this.dataPair) pairs.push(this.dataPair);
    if (this.chunkStateAPair) pairs.push(this.chunkStateAPair);
    if (this.chunkStateBPair) pairs.push(this.chunkStateBPair);
    if (this.chunkPerturbedAPair) pairs.push(this.chunkPerturbedAPair);
    if (this.chunkPerturbedBPair) pairs.push(this.chunkPerturbedBPair);
    if (this.chunkDataPair) pairs.push(this.chunkDataPair);
    for (const p of pairs) { gl.deleteTexture(p[0]); gl.deleteTexture(p[1]); }
    for (const t of this.chunkResults) gl.deleteTexture(t);
  }
}
