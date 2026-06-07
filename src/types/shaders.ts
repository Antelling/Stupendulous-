export type ShaderName =
  | 'init'
  | 'physics'
  | 'distance'
  | 'initDivergence'
  | 'divergence'
  | 'render'
  | 'initElastic'
  | 'physicsElastic'
  | 'distanceElastic'
  | 'initElasticDivergence'
  | 'divergenceElastic';

export interface ShaderProgram {
  program: WebGLProgram;
  name: ShaderName;
  vao: WebGLVertexArrayObject;
}

export interface ShaderSources {
  vertex: string;
  fragment: string;
}
