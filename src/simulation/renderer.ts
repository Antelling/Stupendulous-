import type { SimulationConfig } from '../types/config.ts';
import { TextureManager } from '../webgl/textureManager.ts';
import { UniformSetter } from '../webgl/uniformSetter.ts';
import { ShaderCompiler } from '../webgl/shaderCompiler.ts';

import vertexSource from '../shaders/vertex.glsl?raw';
import renderSource from '../shaders/render.glsl?raw';

export class Renderer {
  private maxValue = 0;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly config: SimulationConfig,
    private readonly textures: TextureManager,
    private readonly uniforms: UniformSetter,
    quadBuffer: WebGLBuffer,
  ) {
    const compiler = new ShaderCompiler(gl);
    const sp = compiler.linkProgram(vertexSource, renderSource, 'render');

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const posLoc = gl.getAttribLocation(sp.program, 'a_position');
    if (posLoc >= 0) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);

    this.program = sp.program;
  }

  render(dataTexture: WebGLTexture): void {
    this.renderAt(dataTexture, 0, 0, this.config.resolution, this.config.resolution);
  }

  renderAt(dataTexture: WebGLTexture, x: number, y: number, w: number, h: number): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(x, y, w, h);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    this.textures.bindTexture(0, dataTexture);
    this.uniforms.set1i(this.program, 'u_dataTexture', 0);
    this.uniforms.set1i(this.program, 'u_colormap', this.config.colormap);
    this.uniforms.set1i(this.program, 'u_toneMapping', this.config.toneMapping);
    this.uniforms.set1f(this.program, 'u_maxValue', this.maxValue || 1);
    this.uniforms.set1b(this.program, 'u_isDivergenceMode', this.config.vizMode === 'divergence');

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  computeMaxValue(dataTexture: WebGLTexture): void {
    const isDivergence = this.config.vizMode === 'divergence';
    const channel = isDivergence ? 0 : 2;
    let maxVal = 0;

    const gl = this.gl;
    const tempFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tempFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dataTexture, 0);

    const res = isDivergence ? 128 : 128;
    const pixels = new Float32Array(res * res * 4);
    gl.viewport(0, 0, res, res);
    gl.readPixels(0, 0, res, res, gl.RGBA, gl.FLOAT, pixels);

    for (let i = 0; i < pixels.length; i += 4) {
      const val = pixels[i + channel];
      if (val > maxVal && isFinite(val)) maxVal = val;
    }

    gl.deleteFramebuffer(tempFb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.maxValue = maxVal;
  }

  computeMaxValueFromChunks(chunkTextures: WebGLTexture[]): void {
    const isDivergence = this.config.vizMode === 'divergence';
    const channel = isDivergence ? 0 : 2;
    let maxVal = 0;

    const gl = this.gl;
    const tempFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tempFb);
    const sampleSize = 128;
    const pixels = new Float32Array(sampleSize * sampleSize * 4);

    for (const tex of chunkTextures) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, sampleSize, sampleSize);
      gl.readPixels(0, 0, sampleSize, sampleSize, gl.RGBA, gl.FLOAT, pixels);
      for (let i = 0; i < pixels.length; i += 4) {
        const val = pixels[i + channel];
        if (val > maxVal && isFinite(val)) maxVal = val;
      }
    }

    gl.deleteFramebuffer(tempFb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.maxValue = maxVal;
  }

  getMaxValue(): number {
    return this.maxValue;
  }
}
