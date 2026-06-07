import type { SimulationConfig } from '../types/config.ts';
import { TextureManager } from '../webgl/textureManager.ts';
import { FramebufferManager } from '../webgl/framebufferManager.ts';
import { UniformSetter } from '../webgl/uniformSetter.ts';
import type { ShaderProgram } from '../types/shaders.ts';

export class ElasticDivergenceSimulator {
  private stateATextures: [WebGLTexture, WebGLTexture];
  private stateBTextures: [WebGLTexture, WebGLTexture];
  private perturbedATextures: [WebGLTexture, WebGLTexture];
  private perturbedBTextures: [WebGLTexture, WebGLTexture];
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
    this.stateATextures = textures.createTexturePair(config.resolution);
    this.stateBTextures = textures.createTexturePair(config.resolution);
    this.perturbedATextures = textures.createTexturePair(config.resolution);
    this.perturbedBTextures = textures.createTexturePair(config.resolution);
    this.dataTextures = textures.createTexturePair(config.resolution);
  }

  private getElasticMode(): number {
    switch (this.config.system) {
      case 'elastic1': return 0;
      case 'elastic2': return 1;
      case 'elastic12': return 2;
      default: return 0;
    }
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
    const mode = this.getElasticMode();

    gl.useProgram(this.programs.initElasticDivergence.program);
    gl.bindVertexArray(this.programs.initElasticDivergence.vao);
    this.uniforms.set2f(this.programs.initElasticDivergence.program, 'u_theta1Range', this.config.theta1Range.min, this.config.theta1Range.max);
    this.uniforms.set2f(this.programs.initElasticDivergence.program, 'u_theta2Range', this.config.theta2Range.min, this.config.theta2Range.max);
    this.uniforms.set1f(this.programs.initElasticDivergence.program, 'u_omega1', this.config.omega1);
    this.uniforms.set1f(this.programs.initElasticDivergence.program, 'u_omega2', this.config.omega2);
    this.uniforms.set1i(this.programs.initElasticDivergence.program, 'u_elasticMode', mode);
    this.uniforms.set1f(this.programs.initElasticDivergence.program, 'u_perturb', this.config.perturb);
    this.uniforms.set1f(this.programs.initElasticDivergence.program, 'u_seed', this.config.seed);

    const fb = this.framebuffers.create();
    this.framebuffers.bind(fb);
    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.stateATextures[0]);
    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT1, this.stateBTextures[0]);
    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT2, this.perturbedATextures[0]);
    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT3, this.perturbedBTextures[0]);
    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT4, this.dataTextures[0]);
    gl.drawBuffers([
      gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2,
      gl.COLOR_ATTACHMENT3, gl.COLOR_ATTACHMENT4,
    ]);
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.framebuffers.bind(null);
    gl.bindVertexArray(null);
  }

  private stepBatch(): void {
    const gl = this.gl;
    const res = this.config.resolution;
    const batchSize = 20;
    const mode = this.getElasticMode();

    for (let i = 0; i < batchSize; i++) {
      if (this.frameCount >= this.config.maxIter) break;
      this.frameCount++;

      const readIdx = this.readIndex;
      const writeIdx = 1 - this.readIndex as 0 | 1;

      gl.useProgram(this.programs.divergenceElastic.program);
      gl.bindVertexArray(this.programs.divergenceElastic.vao);
      this.textures.bindTexture(0, this.stateATextures[readIdx]);
      this.textures.bindTexture(1, this.stateBTextures[readIdx]);
      this.textures.bindTexture(2, this.perturbedATextures[readIdx]);
      this.textures.bindTexture(3, this.perturbedBTextures[readIdx]);
      this.textures.bindTexture(4, this.dataTextures[readIdx]);
      this.uniforms.set1i(this.programs.divergenceElastic.program, 'u_baseTextureA', 0);
      this.uniforms.set1i(this.programs.divergenceElastic.program, 'u_baseTextureB', 1);
      this.uniforms.set1i(this.programs.divergenceElastic.program, 'u_pertTextureA', 2);
      this.uniforms.set1i(this.programs.divergenceElastic.program, 'u_pertTextureB', 3);
      this.uniforms.set1i(this.programs.divergenceElastic.program, 'u_divergenceTexture', 4);
      this.uniforms.set1f(this.programs.divergenceElastic.program, 'u_dt', this.config.dt);
      this.uniforms.set1f(this.programs.divergenceElastic.program, 'u_threshold', this.config.threshold);
      this.uniforms.set1i(this.programs.divergenceElastic.program, 'u_currentIter', this.frameCount);
      this.uniforms.set1i(this.programs.divergenceElastic.program, 'u_elasticMode', mode);
      this.uniforms.set1f(this.programs.divergenceElastic.program, 'u_k1', this.config.k1);
      this.uniforms.set1f(this.programs.divergenceElastic.program, 'u_k2', this.config.k2);

      const fb = this.framebuffers.create();
      this.framebuffers.bind(fb);
      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.stateATextures[writeIdx]);
      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT1, this.stateBTextures[writeIdx]);
      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT2, this.perturbedATextures[writeIdx]);
      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT3, this.perturbedBTextures[writeIdx]);
      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT4, this.dataTextures[writeIdx]);
      gl.drawBuffers([
        gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2,
        gl.COLOR_ATTACHMENT3, gl.COLOR_ATTACHMENT4,
      ]);
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
