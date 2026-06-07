import type { ShaderProgram, ShaderName } from '../types/shaders.ts';

export class VertexArrayManager {
  private vaos = new Map<ShaderName, WebGLVertexArrayObject>();

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly quadBuffer: WebGLBuffer
  ) {}

  createVAOForProgram(program: ShaderProgram): WebGLVertexArrayObject {
    const vao = this.gl.createVertexArray();
    if (!vao) throw new Error('Failed to create VAO');

    this.gl.bindVertexArray(vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);

    const posLoc = this.gl.getAttribLocation(program.program, 'a_position');
    if (posLoc >= 0) {
      this.gl.enableVertexAttribArray(posLoc);
      this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0);
    }

    this.gl.bindVertexArray(null);
    this.vaos.set(program.name, vao);
    return vao;
  }

  get(name: ShaderName): WebGLVertexArrayObject | undefined {
    return this.vaos.get(name);
  }

  bind(name: ShaderName): void {
    const vao = this.vaos.get(name);
    if (vao) this.gl.bindVertexArray(vao);
  }

  unbind(): void {
    this.gl.bindVertexArray(null);
  }
}
