export class TextureManager {
  constructor(private readonly gl: WebGL2RenderingContext) {}

  createFloatTexture(size: number): WebGLTexture {
    const tex = this.gl.createTexture();
    if (!tex) throw new Error('Failed to create texture');
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA32F,
      size, size, 0, this.gl.RGBA, this.gl.FLOAT, null
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    return tex;
  }

  createTexturePair(size: number): [WebGLTexture, WebGLTexture] {
    return [this.createFloatTexture(size), this.createFloatTexture(size)];
  }

  bindTexture(unit: number, texture: WebGLTexture): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  }
}
