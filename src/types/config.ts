export type SystemType = 'rigid' | 'elastic1' | 'elastic2' | 'elastic12';
export type VizMode = 'distance' | 'divergence';
export type Colormap = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type ToneMapping = 0 | 1 | 2 | 3;
export type Resolution = 256 | 512 | 1024;

export interface Range {
  min: number;
  max: number;
}

export interface SimulationConfig {
  system: SystemType;
  vizMode: VizMode;
  resolution: Resolution;
  theta1Range: Range;
  theta2Range: Range;
  omega1: number;
  omega2: number;
  dt: number;
  iterationsPerFrame: number;
  maxIter: number;
  threshold: number;
  perturb: number;
  k1: number;
  k2: number;
  colormap: Colormap;
  toneMapping: ToneMapping;
  seed: number;
}

export interface ZoomState {
  history: Array<{ theta1: Range; theta2: Range }>;
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

export const DEFAULT_CONFIG: SimulationConfig = {
  system: 'rigid',
  vizMode: 'distance',
  resolution: 512,
  theta1Range: { min: -3.14, max: 3.14 },
  theta2Range: { min: -3.14, max: 3.14 },
  omega1: 0,
  omega2: 0,
  dt: 0.002,
  iterationsPerFrame: 10,
  maxIter: 5000,
  threshold: 0.05,
  perturb: 0.00001,
  k1: 50,
  k2: 50,
  colormap: 6,
  toneMapping: 0,
  seed: Math.random() * 1000,
};

export const SYSTEM_NAMES: Record<SystemType, string> = {
  rigid: 'Rigid',
  elastic1: 'Elastic Arm 1',
  elastic2: 'Elastic Arm 2',
  elastic12: 'Both Elastic',
};

export const MODE_NAMES: Record<VizMode, string> = {
  distance: 'Bob2 Distance',
  divergence: 'Divergence Time',
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
