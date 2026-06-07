import type { SimulationConfig } from '../types/config.ts';
import { TextureManager } from '../webgl/textureManager.ts';
import { FramebufferManager } from '../webgl/framebufferManager.ts';
import { UniformSetter } from '../webgl/uniformSetter.ts';
import type { ShaderProgram } from '../types/shaders.ts';

export class RigidSimulator {
  private stateTextures: [WebGLTexture, WebGLTexture];
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
    this.stateTextures = textures.createTexturePair(config.resolution);
    this.dataTextures = textures.createTexturePair(config.resolution);
  }

  reset(): void {
    this.readIndex = 0;
    const res = this.config.resolution;
    const gl = this.gl;

    // Init state
    gl.useProgram(this.programs.init.program);
    gl.bindVertexArray(this.programs.init.vao);
    this.uniforms.set2f(this.programs.init.program, 'u_theta1Range', this.config.theta1Range.min, this.config.theta1Range.max);
    this.uniforms.set2f(this.programs.init.program, 'u_theta2Range', this.config.theta2Range.min, this.config.theta2Range.max);
    this.uniforms.set1f(this.programs.init.program, 'u_omega1', this.config.omega1);
    this.uniforms.set1f(this.programs.init.program, 'u_omega2', this.config.omega2);

    this.framebuffers.bind(this.framebuffers.create());
    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.stateTextures[0]);
    gl.viewport(0, 0, res, res);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Init distance
    gl.useProgram(this.programs.distance.program);
    gl.bindVertexArray(this.programs.distance.vao);
    this.textures.bindTexture(0, this.stateTextures[0]);
    this.textures.bindTexture(1, this.dataTextures[0]);
    this.uniforms.set1i(this.programs.distance.program, 'u_stateTexture', 0);
    this.uniforms.set1i(this.programs.distance.program, 'u_distanceTexture', 1);
    this.uniforms.set1b(this.programs.distance.program, 'u_reset', true);

    this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.dataTextures[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    [this.dataTextures[0], this.dataTextures[1]] = [this.dataTextures[1], this.dataTextures[0]];
    this.framebuffers.bind(null);
    gl.bindVertexArray(null);
  }

  step(): void {
    const gl = this.gl;
    const res = this.config.resolution;

    for (let i = 0; i < this.config.iterationsPerFrame; i++) {
      const readIdx = this.readIndex;
      const writeIdx = 1 - this.readIndex as 0 | 1;

      // Physics step
      gl.useProgram(this.programs.physics.program);
      gl.bindVertexArray(this.programs.physics.vao);
      this.textures.bindTexture(0, this.stateTextures[readIdx]);
      this.uniforms.set1i(this.programs.physics.program, 'u_stateTexture', 0);
      this.uniforms.set1f(this.programs.physics.program, 'u_dt', this.config.dt);

      this.framebuffers.bind(this.framebuffers.create());
      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.stateTextures[writeIdx]);
      gl.viewport(0, 0, res, res);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Distance step
      gl.useProgram(this.programs.distance.program);
      gl.bindVertexArray(this.programs.distance.vao);
      this.textures.bindTexture(0, this.stateTextures[writeIdx]);
      this.textures.bindTexture(1, this.dataTextures[readIdx]);
      this.uniforms.set1i(this.programs.distance.program, 'u_stateTexture', 0);
      this.uniforms.set1i(this.programs.distance.program, 'u_distanceTexture', 1);
      this.uniforms.set1b(this.programs.distance.program, 'u_reset', false);

      this.framebuffers.attachColor(gl.COLOR_ATTACHMENT0, this.dataTextures[writeIdx]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      this.readIndex = writeIdx;
    }
  }

  getCurrentDataTexture(): WebGLTexture {
    return this.dataTextures[this.readIndex];
  }
}
