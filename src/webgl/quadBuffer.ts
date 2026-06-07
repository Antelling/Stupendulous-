export class QuadBuffer {
  readonly buffer: WebGLBuffer;

  constructor(private readonly gl: WebGL2RenderingContext) {
    const buf = gl.createBuffer();
    if (!buf) throw new Error('Failed to create buffer');
    this.buffer = buf;

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  }

  bind(): void {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
  }

  draw(): void {
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}
