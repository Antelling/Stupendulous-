import type { SimulationConfig } from '../types/config.ts';
import { TextureManager } from '../webgl/textureManager.ts';
import { UniformSetter } from '../webgl/uniformSetter.ts';
import type { ShaderProgram } from '../types/shaders.ts';

export class Renderer {
  private maxValue = 0;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly config: SimulationConfig,
    private readonly textures: TextureManager,
    private readonly uniforms: UniformSetter,
    private readonly programs: Record<string, ShaderProgram>,
  ) {}

  render(dataTexture: WebGLTexture): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.config.resolution, this.config.resolution);

    gl.useProgram(this.programs.render.program);
    gl.bindVertexArray(this.programs.render.vao);
    this.textures.bindTexture(0, dataTexture);
    this.uniforms.set1i(this.programs.render.program, 'u_dataTexture', 0);
    this.uniforms.set1i(this.programs.render.program, 'u_colormap', this.config.colormap);
    this.uniforms.set1i(this.programs.render.program, 'u_toneMapping', this.config.toneMapping);
    this.uniforms.set1f(this.programs.render.program, 'u_maxValue', this.maxValue || 1);
    this.uniforms.set1b(this.programs.render.program, 'u_isDivergenceMode', this.config.vizMode === 'divergence');

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  computeMaxValue(dataTexture: WebGLTexture): void {
    const gl = this.gl;
    const res = this.config.resolution;
    const isDivergence = this.config.vizMode === 'divergence';
    const sampleSize = isDivergence ? res : Math.min(128, res);

    const tempFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tempFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dataTexture, 0);

    const pixels = new Float32Array(sampleSize * sampleSize * 4);
    gl.viewport(0, 0, sampleSize, sampleSize);
    gl.readPixels(0, 0, sampleSize, sampleSize, gl.RGBA, gl.FLOAT, pixels);

    let maxVal = 0;
    const channel = isDivergence ? 0 : 2;
    for (let i = 0; i < pixels.length; i += 4) {
      const val = pixels[i + channel];
      if (val > maxVal && isFinite(val)) maxVal = val;
    }

    this.maxValue = maxVal;
    gl.deleteFramebuffer(tempFb);
  }

  getMaxValue(): number {
    return this.maxValue;
  }
}
