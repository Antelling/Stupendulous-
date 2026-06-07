export class FramebufferManager {
  constructor(private readonly gl: WebGL2RenderingContext) {}

  create(): WebGLFramebuffer {
    const fb = this.gl.createFramebuffer();
    if (!fb) throw new Error('Failed to create framebuffer');
    return fb;
  }

  attachColor(attachment: number, texture: WebGLTexture): void {
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      attachment,
      this.gl.TEXTURE_2D,
      texture,
      0
    );
  }

  checkStatus(): void {
    const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: ${status}`);
    }
  }

  bind(fb: WebGLFramebuffer | null): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
  }
}
