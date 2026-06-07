import type { ShaderProgram, ShaderName } from '../types/shaders.ts';

export class ShaderCompiler {
  constructor(private readonly gl: WebGL2RenderingContext) {}

  compile(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    
    this.gl.shaderSource(shader, source.trim());
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const log = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${log}`);
    }
    
    return shader;
  }

  linkProgram(vsSource: string, fsSource: string, name: ShaderName): ShaderProgram {
    const vs = this.compile(this.gl.VERTEX_SHADER, vsSource);
    const fs = this.compile(this.gl.FRAGMENT_SHADER, fsSource);
    
    const program = this.gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);
    
    this.gl.deleteShader(vs);
    this.gl.deleteShader(fs);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const log = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Program link error (${name}): ${log}`);
    }
    
    return { program, name };
  }
}
