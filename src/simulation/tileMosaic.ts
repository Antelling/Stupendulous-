import type { SimulationConfig } from '../types/config.ts';
import { computeCorners } from '../types/config.ts';
import { TextureManager } from '../webgl/textureManager.ts';
import { FramebufferManager } from '../webgl/framebufferManager.ts';
import { UniformSetter } from '../webgl/uniformSetter.ts';
import { ShaderCompiler } from '../webgl/shaderCompiler.ts';
import { ShaderBuilder } from '../webgl/shaderBuilder.ts';
import { Simulator } from './simulator.ts';
import { Renderer } from './renderer.ts';
import vertexSource from '../shaders/vertex.glsl?raw';

export class TileMosaic {
  private gl: WebGL2RenderingContext;
  private config: SimulationConfig;
  private tileConfig: SimulationConfig;
  private quadBuffer: WebGLBuffer;
  private textures: TextureManager;
  private fb: FramebufferManager;
  private uniforms: UniformSetter;
  private renderer: Renderer;

  private cols: number;
  private rows: number;
  private tileRes: number;
  private tileW: number;
  private tileH: number;

  private simulator: Simulator;
  private resultTextures: WebGLTexture[] = [];
  private tileDone: boolean[] = [];
  private currentTile = 0;
  private totalTiles: number;
  private complete = false;

  private framebuffer: WebGLFramebuffer;
  private blitProg: WebGLProgram;
  private blitVao: WebGLVertexArrayObject;

  constructor(
    gl: WebGL2RenderingContext,
    config: SimulationConfig,
    quadBuffer: WebGLBuffer,
    textures: TextureManager,
    uniforms: UniformSetter,
    renderer: Renderer,
  ) {
    this.gl = gl;
    this.config = config;
    this.quadBuffer = quadBuffer;
    this.textures = textures;
    this.uniforms = uniforms;
    this.renderer = renderer;

    const t = config.phaseSpace.tiling;
    this.cols = Math.max(1, t.cols);
    this.rows = Math.max(1, t.rows);
    this.totalTiles = this.cols * this.rows;

    const res = config.resolution;
    this.tileW = Math.floor(res / this.cols);
    this.tileH = Math.floor(res / this.rows);
    this.tileRes = Math.max(64, Math.min(512, Math.floor(Math.min(this.tileW, this.tileH))));

    this.tileConfig = {
      ...config,
      resolution: this.tileRes as SimulationConfig['resolution'],
      chunkSize: this.tileRes as SimulationConfig['chunkSize'],
      trials: 1,
    };

    this.fb = new FramebufferManager(gl);
    this.framebuffer = gl.createFramebuffer()!;

    const compiler = new ShaderCompiler(gl);
    const sp = compiler.linkProgram(vertexSource, ShaderBuilder.buildBlit(), 'tileBlit');
    this.blitProg = sp.program;
    this.blitVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.blitVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const posLoc = gl.getAttribLocation(sp.program, 'a_position');
    if (posLoc >= 0) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);

    for (let i = 0; i < this.totalTiles; i++) {
      this.resultTextures.push(this.textures.createFloatTexture(this.tileRes));
      this.tileDone.push(false);
    }

    this.simulator = new Simulator(gl, this.tileConfig, quadBuffer);
  }

  start(): void {
    this.currentTile = 0;
    this.complete = false;
    for (let i = 0; i < this.totalTiles; i++) this.tileDone[i] = false;
    this.beginTile(0);
  }

  private beginTile(idx: number): void {
    const col = idx % this.cols;
    const row = Math.floor(idx / this.cols);
    this.simulator.setCorners(computeCorners(this.config, col, row));
    const isDiv = this.tileConfig.vizMode === 'divergence' || this.tileConfig.vizMode === 'divergenceDistance';
    if (isDiv) {
      this.simulator.startDivergence(() => {});
    } else {
      this.simulator.reset();
    }
  }

  step(): void {
    if (this.complete) return;
    const isDiv = this.tileConfig.vizMode === 'divergence' || this.tileConfig.vizMode === 'divergenceDistance';

    if (this.simulator.isComplete()) {
      this.blitResult(this.currentTile, this.simulator.getDataTexture());
      this.tileDone[this.currentTile] = true;
      this.currentTile++;
      if (this.currentTile >= this.totalTiles) {
        this.complete = true;
        return;
      }
      this.beginTile(this.currentTile);
      return;
    }

    if (isDiv) {
      this.simulator.stepDivergence();
    } else {
      this.simulator.stepDistance();
      if (!this.simulator.isComplete()) {
        this.renderer.computeMaxValue(this.simulator.getDataTexture());
      }
    }
  }

  private blitResult(idx: number, src: WebGLTexture): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    for (let i = 0; i < 8; i++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, null, 0);
    }
    gl.useProgram(this.blitProg);
    gl.bindVertexArray(this.blitVao);
    this.textures.bindTexture(0, src);
    this.uniforms.set1i(this.blitProg, 'u_src', 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.resultTextures[idx], 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, this.tileRes, this.tileRes);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
  }

  private completedTextures(): WebGLTexture[] {
    const out: WebGLTexture[] = [];
    for (let i = 0; i < this.totalTiles; i++) {
      if (this.tileDone[i]) out.push(this.resultTextures[i]);
    }
    return out;
  }

  render(canvasW: number, canvasH: number): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvasW, canvasH);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const done = this.completedTextures();
    if (done.length > 0) {
      this.renderer.computeMaxValueFromChunks(done);
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        const x = c * this.tileW;
        const y = r * this.tileH;
        if (this.tileDone[idx]) {
          this.renderer.renderAt(this.resultTextures[idx], x, y, this.tileW, this.tileH);
        }
      }
    }

    if (!this.complete) {
      const col = this.currentTile % this.cols;
      const row = Math.floor(this.currentTile / this.cols);
      this.renderer.renderAt(this.simulator.getDataTexture(), col * this.tileW, row * this.tileH, this.tileW, this.tileH);
    }
  }

  getProgress(): { current: number; total: number } {
    return { current: Math.min(this.currentTile + 1, this.totalTiles), total: this.totalTiles };
  }

  isComplete(): boolean { return this.complete; }

  dispose(): void {
    const gl = this.gl;
    this.simulator.dispose();
    gl.deleteProgram(this.blitProg);
    gl.deleteVertexArray(this.blitVao);
    gl.deleteFramebuffer(this.framebuffer);
    for (const t of this.resultTextures) gl.deleteTexture(t);
    this.resultTextures = [];
  }
}
