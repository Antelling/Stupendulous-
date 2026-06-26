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

export interface PhaseSpaceConfig {
  x: PhaseSpaceAxis;
  y: PhaseSpaceAxis;
  initialValues: Record<PhaseSpaceDimension, number>;
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
