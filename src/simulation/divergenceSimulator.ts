import type { SimulationConfig } from '../types/config.ts';
import { TextureManager } from '../webgl/textureManager.ts';
import { FramebufferManager } from '../webgl/framebufferManager.ts';
import { UniformSetter } from '../webgl/uniformSetter.ts';
import type { ShaderProgram } from '../types/shaders.ts';

export class DivergenceSimulator {
  private stateTextures: [WebGLTexture, WebGLTexture];
  private perturbedTextures: [WebGLTexture, WebGLTexture];
  private dataTextures: [WebGLTexture, WebGLTexture];
  private readIndex: 0 | 1 = 0;
  private frameCount = 0;
  private intervalId: number | null = null;
  private renderIntervalId: number | null = null;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly config: SimulationConfig,
    private readonly textures: TextureManager,
    private readonly framebuffers: FramebufferManager,
    private readonly uniforms: UniformSetter,
    private readonly programs: Record<string, ShaderProgram>,
    private readonly onComplete: () => void,
  ) {
    this.stateTextures = textures.createTexturePair(config.resolution);
    this.perturbedTextures = textures.createTexturePair(config.resolution);
    this.dataTextures = textures.createTexturePair(config.resolution);
  }

  start(): void {
    this.stop();
    this.frameCount = 0;
    this.readIndex = 0;
    this.reset();

    this.intervalId = window.setInterval(() => {
      if (this.frameCount >= this.config.maxIter) {
        this.stop();
        this.onComplete();
        return;
      }
      this.stepBatch();
    }, 20);

    this.renderIntervalId = window.setInterval(() => this.onComplete(), 500);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.renderIntervalId !== null) {
      clearInterval(this.renderIntervalId);
      this.renderIntervalId = null;
    }
  }

  private reset(): void {
    const gl = this.gl;
    const res = this.config.resolution;

    gl.useProgram(this.programs.initDivergence.program);
    gl.bindVertexArray(this.programs.initDivergence.vao);
    this.uniforms.set2f(this.programs.initDivergence.program, 'u_theta1Range', this.config.theta1Range.min, this.config.theta1Range.max);
    this.uniforms.set2f(this.programs.initDivergence.program, 'u_theta2Range', this.config.theta2Range.min, this.config.theta2Range.max);
    this.uniforms.set1f(this.programs.initDivergence.program, 'u_omega1', this.config.omega1);
    this.uniforms.set1f(this.programs.initDivergence.program, 'u_omega2', this.config.omega2);
    this.uniforms.set1f(this.programs.initDivergence.program, 'u_perturb', this.config.perturb);
    this.uniforms.set1f(this.programs.initDivergence.program, 'u_seed', this.config.seed);

    const fb = this.framebuffers.create();
    this.framebuffers.bind(fb);
    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.stateTextures[0]);
    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT1, this.perturbedTextures[0]);
    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT2, this.dataTextures[0]);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffers.bind(null);
    gl.bindVertexArray(null);
  }

  private stepBatch(): void {
    const gl = this.gl;
    const res = this.config.resolution;
    const batchSize = 20;

    for (let i = 0; i < batchSize; i++) {
      if (this.frameCount >= this.config.maxIter) break;
      this.frameCount++;

      const readIdx = this.readIndex;
      const writeIdx = 1 - this.readIndex as 0 | 1;

      gl.useProgram(this.programs.divergence.program);
      gl.bindVertexArray(this.programs.divergence.vao);
      this.textures.bindTexture(0, this.stateTextures[readIdx]);
      this.textures.bindTexture(1, this.perturbedTextures[readIdx]);
      this.textures.bindTexture(2, this.dataTextures[readIdx]);
      this.uniforms.set1i(this.programs.divergence.program, 'u_stateTexture', 0);
      this.uniforms.set1i(this.programs.divergence.program, 'u_perturbedTexture', 1);
      this.uniforms.set1i(this.programs.divergence.program, 'u_divergenceTexture', 2);
      this.uniforms.set1f(this.programs.divergence.program, 'u_dt', this.config.dt);
      this.uniforms.set1f(this.programs.divergence.program, 'u_threshold', this.config.threshold);
      this.uniforms.set1i(this.programs.divergence.program, 'u_currentIter', this.frameCount);

      const fb = this.framebuffers.create();
      this.framebuffers.bind(fb);
      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.stateTextures[writeIdx]);
      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT1, this.perturbedTextures[writeIdx]);
      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT2, this.dataTextures[writeIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
      gl.viewport(0, 0, res, res);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      this.readIndex = writeIdx;
    }
  }

  getCurrentDataTexture(): WebGLTexture {
    return this.dataTextures[this.readIndex];
  }

  getFrameCount(): number {
    return this.frameCount;
  }
}
