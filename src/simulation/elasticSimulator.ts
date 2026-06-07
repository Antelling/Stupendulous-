import type { SimulationConfig } from '../types/config.ts';
import { TextureManager } from '../webgl/textureManager.ts';
import { FramebufferManager } from '../webgl/framebufferManager.ts';
import { UniformSetter } from '../webgl/uniformSetter.ts';
import type { ShaderProgram } from '../types/shaders.ts';

export class ElasticSimulator {
  private stateATextures: [WebGLTexture, WebGLTexture];
  private stateBTextures: [WebGLTexture, WebGLTexture];
  private dataTextures: [WebGLTexture, WebGLTexture];
  private readIndex: 0 | 1 = 0;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly config: SimulationConfig,
    private readonly textures: TextureManager,
    private readonly framebuffers: FramebufferManager,
    private readonly uniforms: UniformSetter,
    private readonly programs: Record<string, ShaderProgram>,
  ) {
    this.stateATextures = textures.createTexturePair(config.resolution);
    this.stateBTextures = textures.createTexturePair(config.resolution);
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

  reset(): void {
    this.readIndex = 0;
    const res = this.config.resolution;
    const gl = this.gl;
    const mode = this.getElasticMode();

    gl.useProgram(this.programs.initElastic.program);
    gl.bindVertexArray(this.programs.initElastic.vao);
    this.uniforms.set2f(this.programs.initElastic.program, 'u_theta1Range', this.config.theta1Range.min, this.config.theta1Range.max);
    this.uniforms.set2f(this.programs.initElastic.program, 'u_theta2Range', this.config.theta2Range.min, this.config.theta2Range.max);
    this.uniforms.set1f(this.programs.initElastic.program, 'u_omega1', this.config.omega1);
    this.uniforms.set1f(this.programs.initElastic.program, 'u_omega2', this.config.omega2);
    this.uniforms.set1i(this.programs.initElastic.program, 'u_elasticMode', mode);

    const fb = this.framebuffers.create();
    this.framebuffers.bind(fb);
    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.stateATextures[0]);
    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT1, this.stateBTextures[0]);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Init distance
    gl.useProgram(this.programs.distanceElastic.program);
    gl.bindVertexArray(this.programs.distanceElastic.vao);
    this.textures.bindTexture(0, this.stateATextures[0]);
    this.textures.bindTexture(1, this.stateBTextures[0]);
    this.textures.bindTexture(2, this.dataTextures[0]);
    this.uniforms.set1i(this.programs.distanceElastic.program, 'u_stateTextureA', 0);
    this.uniforms.set1i(this.programs.distanceElastic.program, 'u_stateTextureB', 1);
    this.uniforms.set1i(this.programs.distanceElastic.program, 'u_distanceTexture', 2);
    this.uniforms.set1b(this.programs.distanceElastic.program, 'u_reset', true);
    this.uniforms.set1i(this.programs.distanceElastic.program, 'u_elasticMode', mode);

    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.dataTextures[1]);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    [this.dataTextures[0], this.dataTextures[1]] = [this.dataTextures[1], this.dataTextures[0]];
    this.framebuffers.bind(null);
    gl.bindVertexArray(null);
  }

  step(): void {
    const gl = this.gl;
    const res = this.config.resolution;
    const mode = this.getElasticMode();

    for (let i = 0; i < this.config.iterationsPerFrame; i++) {
      const readIdx = this.readIndex;
      const writeIdx = 1 - this.readIndex as 0 | 1;

      // Physics step
      gl.useProgram(this.programs.physicsElastic.program);
      gl.bindVertexArray(this.programs.physicsElastic.vao);
      this.textures.bindTexture(0, this.stateATextures[readIdx]);
      this.textures.bindTexture(1, this.stateBTextures[readIdx]);
      this.uniforms.set1i(this.programs.physicsElastic.program, 'u_stateTextureA', 0);
      this.uniforms.set1i(this.programs.physicsElastic.program, 'u_stateTextureB', 1);
      this.uniforms.set1f(this.programs.physicsElastic.program, 'u_dt', this.config.dt);
      this.uniforms.set1i(this.programs.physicsElastic.program, 'u_elasticMode', mode);
      this.uniforms.set1f(this.programs.physicsElastic.program, 'u_k1', this.config.k1);
      this.uniforms.set1f(this.programs.physicsElastic.program, 'u_k2', this.config.k2);

      const fb = this.framebuffers.create();
      this.framebuffers.bind(fb);
      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.stateATextures[writeIdx]);
      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT1, this.stateBTextures[writeIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.viewport(0, 0, res, res);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Distance step
      gl.useProgram(this.programs.distanceElastic.program);
      gl.bindVertexArray(this.programs.distanceElastic.vao);
      this.textures.bindTexture(0, this.stateATextures[writeIdx]);
      this.textures.bindTexture(1, this.stateBTextures[writeIdx]);
      this.textures.bindTexture(2, this.dataTextures[readIdx]);
      this.uniforms.set1i(this.programs.distanceElastic.program, 'u_stateTextureA', 0);
      this.uniforms.set1i(this.programs.distanceElastic.program, 'u_stateTextureB', 1);
      this.uniforms.set1i(this.programs.distanceElastic.program, 'u_distanceTexture', 2);
      this.uniforms.set1b(this.programs.distanceElastic.program, 'u_reset', false);
      this.uniforms.set1i(this.programs.distanceElastic.program, 'u_elasticMode', mode);

      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.dataTextures[writeIdx]);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      this.readIndex = writeIdx;
    }
  }

  getCurrentDataTexture(): WebGLTexture {
    return this.dataTextures[this.readIndex];
  }
}
