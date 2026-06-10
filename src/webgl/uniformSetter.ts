export class UniformSetter {
  constructor(private readonly gl: WebGL2RenderingContext) {}

  private getLocation(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(program, name);
  }

  private setIfFound(program: WebGLProgram, name: string, setter: (loc: WebGLUniformLocation) => void): void {
    const loc = this.getLocation(program, name);
    if (loc !== null) setter(loc);
  }

  set1f(program: WebGLProgram, name: string, value: number): void {
    this.setIfFound(program, name, (loc) => this.gl.uniform1f(loc, value));
  }

  set1i(program: WebGLProgram, name: string, value: number): void {
    this.setIfFound(program, name, (loc) => this.gl.uniform1i(loc, value));
  }

  set2f(program: WebGLProgram, name: string, x: number, y: number): void {
    this.setIfFound(program, name, (loc) => this.gl.uniform2f(loc, x, y));
  }

  set4f(program: WebGLProgram, name: string, x: number, y: number, z: number, w: number): void {
    this.setIfFound(program, name, (loc) => this.gl.uniform4f(loc, x, y, z, w));
  }

  set1b(program: WebGLProgram, name: string, value: boolean): void {
    this.setIfFound(program, name, (loc) => this.gl.uniform1i(loc, value ? 1 : 0));
  }
}
