export class UniformSetter {
  constructor(private readonly gl: WebGL2RenderingContext) {}

  private getLocation(program: WebGLProgram, name: string): WebGLUniformLocation {
    const loc = this.gl.getUniformLocation(program, name);
    if (!loc) throw new Error(`Uniform not found: ${name}`);
    return loc;
  }

  set1f(program: WebGLProgram, name: string, value: number): void {
    this.gl.uniform1f(this.getLocation(program, name), value);
  }

  set1i(program: WebGLProgram, name: string, value: number): void {
    this.gl.uniform1i(this.getLocation(program, name), value);
  }

  set2f(program: WebGLProgram, name: string, x: number, y: number): void {
    this.gl.uniform2f(this.getLocation(program, name), x, y);
  }

  set1b(program: WebGLProgram, name: string, value: boolean): void {
    this.gl.uniform1i(this.getLocation(program, name), value ? 1 : 0);
  }
}
