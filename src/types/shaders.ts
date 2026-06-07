export type ShaderName = string;

export interface ShaderProgram {
  program: WebGLProgram;
  name: ShaderName;
}
