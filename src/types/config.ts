export type SystemType = 'rigid' | 'elastic12' | 'nonlinear';
export type VizMode = 'distance' | 'divergence' | 'divergenceDistance';
export type PerturbDistribution = 'uniform' | 'gaussian';
export type Colormap = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type ToneMapping = 0 | 1 | 2 | 3;
export type Resolution = 256 | 512 | 1024 | 2048 | 4096;

export type PhaseSpaceDimension =
  | 'angle1'
  | 'velocity1'
  | 'angle2'
  | 'velocity2'
  | 'stretch1'
  | 'stretchRate1'
  | 'stretch2'
  | 'stretchRate2';

export interface PhaseSpaceAxis {
  dimension: PhaseSpaceDimension;
  min: number;
  max: number;
}

export type PhaseSpaceMode = 'manual' | 'tiling';

export interface PhaseSpaceConfig {
  x: PhaseSpaceAxis;
  y: PhaseSpaceAxis;
  initialValues: Record<PhaseSpaceDimension, number>;
  mode: PhaseSpaceMode;
  tiling: TileConfig;
}

export interface TileConfig {
  cols: number;
  rows: number;
  toroidal: boolean;
  controlNet: number[][][];
}

export interface SimulationConfig {
  system: SystemType;
  vizMode: VizMode;
  resolution: Resolution;
  chunkSize: ChunkSize;
  phaseSpace: PhaseSpaceConfig;
  dt: number;
  iterationsPerFrame: number;
  maxIter: number;
  perturb: number;
  perturbDistribution: PerturbDistribution;
  trials: number;
  m1: number;
  m2: number;
  L1: number;
  L2: number;
  k1: number;
  k2: number;
  colormap: Colormap;
  toneMapping: ToneMapping;
  seed: number;
}

export interface ZoomState {
  history: Array<{ x: PhaseSpaceAxis; y: PhaseSpaceAxis }>;
}

export interface SimulationState {
  frameCount: number;
  maxValue: number;
  readIndex: 0 | 1;
  seed: number;
}

export interface DragState {
  isDragging: boolean;
  start: { x: number; y: number } | null;
  current: { x: number; y: number } | null;
}

export const RIGID_DIMENSIONS: PhaseSpaceDimension[] = [
  'angle1', 'velocity1', 'angle2', 'velocity2',
];

export const ELASTIC_DIMENSIONS: PhaseSpaceDimension[] = [
  'angle1', 'velocity1', 'stretch1', 'stretchRate1',
  'angle2', 'velocity2', 'stretch2', 'stretchRate2',
];

export const DIMENSION_LABELS: Record<PhaseSpaceDimension, string> = {
  angle1: 'First Angle θ₁',
  velocity1: 'First Angular Velocity ω₁',
  angle2: 'Second Angle θ₂',
  velocity2: 'Second Angular Velocity ω₂',
  stretch1: 'First Arm Stretch r₁',
  stretchRate1: 'First Stretch Rate ṙ₁',
  stretch2: 'Second Arm Stretch r₂',
  stretchRate2: 'Second Stretch Rate ṙ₂',
};

export const DIM_SYMBOLS: Record<PhaseSpaceDimension, string> = {
  angle1: 'θ₁',
  velocity1: 'ω₁',
  angle2: 'θ₂',
  velocity2: 'ω₂',
  stretch1: 'r₁',
  stretchRate1: 'ṙ₁',
  stretch2: 'r₂',
  stretchRate2: 'ṙ₂',
};

export const DIMENSION_DEFAULTS: Record<PhaseSpaceDimension, { min: number; max: number; initial: number }> = {
  angle1: { min: -Math.PI, max: Math.PI, initial: 0 },
  velocity1: { min: -5, max: 5, initial: 0 },
  angle2: { min: -Math.PI, max: Math.PI, initial: 0 },
  velocity2: { min: -5, max: 5, initial: 0 },
  stretch1: { min: -0.5, max: 0.5, initial: 0 },
  stretchRate1: { min: -5, max: 5, initial: 0 },
  stretch2: { min: -0.5, max: 0.5, initial: 0 },
  stretchRate2: { min: -5, max: 5, initial: 0 },
};

export type ChunkSize = 256 | 512 | 1024 | 2048;

export const DIM_ORDER: PhaseSpaceDimension[] = [
  'angle1', 'velocity1', 'stretch1', 'stretchRate1',
  'angle2', 'velocity2', 'stretch2', 'stretchRate2',
];

export const DIM_SCALE: Record<PhaseSpaceDimension, number> = {
  angle1: Math.PI,
  velocity1: 5,
  angle2: Math.PI,
  velocity2: 5,
  stretch1: 0.5,
  stretchRate1: 5,
  stretch2: 0.5,
  stretchRate2: 5,
};

export function basisVector(dim: PhaseSpaceDimension): number[] {
  const v = new Array(DIM_ORDER.length).fill(0);
  v[DIM_ORDER.indexOf(dim)] = 1;
  return v;
}

export function initialVector(config: SimulationConfig): number[] {
  const iv = config.phaseSpace.initialValues;
  return DIM_ORDER.map(d => iv[d]);
}

export function computeCorners(
  config: SimulationConfig,
  tileCol = 0,
  tileRow = 0,
): [number[], number[], number[], number[]] {
  const ps = config.phaseSpace;
  if (ps.mode === 'tiling') {
    const t = ps.tiling;
    const cols = t.cols;
    const rows = t.rows;
    const i0 = tileCol;
    const i1 = t.toroidal ? (tileCol + 1) % cols : Math.min(tileCol + 1, cols);
    const j0 = tileRow;
    const j1 = t.toroidal ? (tileRow + 1) % rows : Math.min(tileRow + 1, rows);
    const get = (col: number, row: number): number[] => t.controlNet[row][col];
    const c00 = get(i0, j0);
    const c10 = get(i1, j0);
    const c01 = get(i0, j1);
    const c11 = get(i1, j1);
    return [c00.slice(), c10.slice(), c01.slice(), c11.slice()];
  }
  const iv = initialVector(config);
  const xb = basisVector(ps.x.dimension);
  const yb = basisVector(ps.y.dimension);
  const add = (base: number[], sx: number, sy: number): number[] =>
    base.map((v, i) => v + sx * xb[i] + sy * yb[i]);
  return [
    add(iv, ps.x.min, ps.y.min),
    add(iv, ps.x.max, ps.y.min),
    add(iv, ps.x.min, ps.y.max),
    add(iv, ps.x.max, ps.y.max),
  ];
}

export function bilinearSample(
  corners: [number[], number[], number[], number[]],
  u: number,
  v: number,
): number[] {
  const [c00, c10, c01, c11] = corners;
  const out = new Array(c00.length);
  for (let i = 0; i < c00.length; i++) {
    out[i] = (1 - u) * (1 - v) * c00[i] + u * (1 - v) * c10[i]
      + (1 - u) * v * c01[i] + u * v * c11[i];
  }
  return out;
}

export function rigidPack(dir8: number[]): [number, number, number, number] {
  return [dir8[0], dir8[1], dir8[4], dir8[5]];
}

export function elasticPackA(dir8: number[]): [number, number, number, number] {
  return [dir8[0], dir8[1], dir8[2], dir8[3]];
}

export function elasticPackB(dir8: number[]): [number, number, number, number] {
  return [dir8[4], dir8[5], dir8[6], dir8[7]];
}

export function generateTiling(system: SystemType, cols: number, rows: number, center: number[]): TileConfig {
  const available = system === 'rigid' ? RIGID_DIMENSIONS : ELASTIC_DIMENSIONS;
  const availIdx = available.map(d => DIM_ORDER.indexOf(d));
  const net: number[][][] = [];
  for (let r = 0; r < rows; r++) {
    const rowPts: number[][] = [];
    for (let c = 0; c < cols; c++) {
      const pt = center.slice();
      for (const idx of availIdx) {
        const dim = DIM_ORDER[idx];
        pt[idx] = center[idx] + (Math.random() * 2 - 1) * DIM_SCALE[dim];
      }
      rowPts.push(pt);
    }
    net.push(rowPts);
  }
  return { cols, rows, toroidal: cols >= 2 && rows >= 2, controlNet: net };
}

export function describeTiling(t: TileConfig): string {
  return `${t.cols}×${t.rows}${t.toroidal ? ' torus' : ''}`;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  system: 'rigid',
  vizMode: 'distance',
  resolution: 512,
  chunkSize: 512,
  phaseSpace: {
    x: { dimension: 'angle1', min: -Math.PI, max: Math.PI },
    y: { dimension: 'angle2', min: -Math.PI, max: Math.PI },
    initialValues: {
      angle1: 0,
      velocity1: 0,
      angle2: 0,
      velocity2: 0,
      stretch1: 0,
      stretchRate1: 0,
      stretch2: 0,
      stretchRate2: 0,
    },
    mode: 'manual',
    tiling: generateTiling('rigid', 2, 2, [0, 0, 0, 0, 0, 0, 0, 0]),
  },
  dt: 0.002,
  iterationsPerFrame: 10,
  maxIter: 5000,
  perturb: 0.00001,
  perturbDistribution: 'uniform',
  trials: 1,
  m1: 1,
  m2: 1,
  L1: 1,
  L2: 1,
  k1: 50,
  k2: 50,
  colormap: 6,
  toneMapping: 0,
  seed: Math.random() * 1000,
};

export const SYSTEM_NAMES: Record<SystemType, string> = {
  rigid: 'Rigid',
  elastic12: 'Elastic Double Pendulum',
  nonlinear: 'Nonlinear Elastic Pendulum',
};

export const MODE_NAMES: Record<VizMode, string> = {
  distance: 'Bob2 Distance',
  divergence: 'Divergence Time',
  divergenceDistance: 'Divergence Distance',
};

export const COLORMAP_NAMES: Record<Colormap, string> = {
  0: 'Viridis',
  1: 'Magma',
  2: 'Plasma',
  3: 'Inferno',
  4: 'Turbo',
  5: 'Jet',
  6: 'Rainbow',
};

export const TONE_MAPPING_NAMES: Record<ToneMapping, string> = {
  0: 'Linear',
  1: 'Logarithmic',
  2: 'Square Root',
  3: 'S-Curve',
};
