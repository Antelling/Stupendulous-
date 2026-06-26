import type { SimulationConfig, Colormap, PhaseSpaceDimension } from '../types/config.ts';
import { SYSTEM_NAMES, MODE_NAMES, DIMENSION_LABELS, ELASTIC_DIMENSIONS, DIM_ORDER, DIM_SYMBOLS } from '../types/config.ts';

export class UIController {
  private elements: Record<string, HTMLElement> = {};

  constructor() {
    this.cacheElements();
  }

  private cacheElements(): void {
    const ids = [
      'systemType', 'vizMode', 'resolution', 'colormap', 'toneMapping',
      'xDimension', 'yDimension', 'xMin', 'xMax', 'yMin', 'yMax',
      'initAngle1', 'initVelocity1', 'initAngle2', 'initVelocity2',
      'initStretch1', 'initStretchRate1', 'initStretch2', 'initStretchRate2',
      'dt', 'iterations', 'maxIter', 'perturb',
      'resetBtn', 'downloadBtn', 'zoomOutBtn', 'playBtn',
      'obliqueBtn', 'obliqueIndicator',
      'modeIndicator', 'subtitle', 'legendGradient',
      'frameCount', 'maxDistance', 'fps', 'zoomLevel',
      'iterValue', 'perturbValue',
      'm1Value', 'm2Value', 'L1Value', 'L2Value',
      'k1Value', 'k2Value',
      'elasticControls', 'maxIterControl', 'perturbControl',
      'perturbModeControl', 'trialsControl',
      'frameRow', 'maxDistRow', 'trialRow', 'trialCount',
    ];

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) this.elements[id] = el;
    }
  }

  getElement(id: string): HTMLElement | null {
    return this.elements[id] ?? document.getElementById(id);
  }

  getInputValue(id: string): string {
    const el = this.getElement(id);
    return el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el.value : '';
  }

  setInputValue(id: string, value: string | number): void {
    const el = this.getElement(id);
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      el.value = String(value);
    }
  }

  setTextContent(id: string, text: string): void {
    const el = this.getElement(id);
    if (el) el.textContent = text;
  }

  setDisplay(id: string, display: string): void {
    const el = this.getElement(id);
    if (el) el.style.display = display;
  }

  updateModeUI(config: SimulationConfig): void {
    const isDistance = config.vizMode === 'distance';
    const isElastic = config.system !== 'rigid';
    const isDivergence = config.vizMode === 'divergence';
    const isDivDist = config.vizMode === 'divergenceDistance';
    const needsPerturb = isDivergence || isDivDist;

    this.setDisplay('perturbControl', needsPerturb ? 'block' : 'none');
    this.setDisplay('perturbModeControl', needsPerturb ? 'block' : 'none');
    this.setDisplay('trialsControl', needsPerturb ? 'block' : 'none');
    this.setDisplay('elasticControls', isElastic ? 'block' : 'none');

    const elasticOnly = document.querySelectorAll('.elastic-only');
    const elasticInitial = document.querySelectorAll('.elastic-initial');
    for (let i = 0; i < elasticOnly.length; i++) {
      (elasticOnly[i] as HTMLElement).style.display = isElastic ? 'block' : 'none';
    }
    for (let i = 0; i < elasticInitial.length; i++) {
      (elasticInitial[i] as HTMLElement).style.display = isElastic ? 'block' : 'none';
    }

    this.setTextContent('modeIndicator', `${SYSTEM_NAMES[config.system]} · ${MODE_NAMES[config.vizMode]}`);

    const subtitles: Record<typeof config.vizMode, string> = {
      distance: isElastic ? 'Total distance traveled by bob2 (elastic system)' : 'Total distance traveled by the second pendulum bob',
      divergence: 'Iterations until perturbed trajectory diverges',
      divergenceDistance: 'Distance traveled by bob2 when trajectories diverge',
    };
    this.setTextContent('subtitle', subtitles[config.vizMode]);

    this.setDisplay('frameRow', isDivergence ? 'none' : 'inline');
    this.setDisplay('maxDistRow', isDivergence ? 'none' : 'inline');

    this.ensureDistinctDimensions(config.phaseSpace.x.dimension, config.phaseSpace.y.dimension);
  }

  updateLegend(colormap: Colormap): void {
    const gradient = this.getElement('legendGradient') as HTMLElement | null;
    if (gradient) {
      gradient.style.background = colormap === 6
        ? 'linear-gradient(90deg, hsl(0,80%,50%), hsl(60,80%,50%), hsl(120,80%,50%), hsl(180,80%,50%), hsl(240,80%,50%), hsl(300,80%,50%))'
        : 'linear-gradient(90deg, rgb(68, 1, 84), rgb(33, 145, 140), rgb(253, 231, 37))';
    }
  }

  updateObliqueUI(config: SimulationConfig): void {
    const ind = this.getElement('obliqueIndicator') as HTMLElement | null;
    if (!ind) return;
    if (config.oblique.enabled) {
      ind.style.display = 'inline-block';
      const describe = (dir: number[]): string => {
        const parts: string[] = [];
        for (let i = 0; i < dir.length; i++) {
          if (Math.abs(dir[i]) > 1e-9) parts.push(DIM_SYMBOLS[DIM_ORDER[i]]);
        }
        return parts.length ? parts.join('+') : '∅';
      };
      ind.textContent = `⚡ Oblique  X:${describe(config.oblique.xDir)}  Y:${describe(config.oblique.yDir)}`;
    } else {
      ind.style.display = 'none';
    }
  }

  updatePhaseSpaceInputs(config: SimulationConfig): void {
    this.setInputValue('xDimension', config.phaseSpace.x.dimension);
    this.setInputValue('xMin', config.phaseSpace.x.min.toFixed(2));
    this.setInputValue('xMax', config.phaseSpace.x.max.toFixed(2));
    this.setInputValue('yDimension', config.phaseSpace.y.dimension);
    this.setInputValue('yMin', config.phaseSpace.y.min.toFixed(2));
    this.setInputValue('yMax', config.phaseSpace.y.max.toFixed(2));

    const iv = config.phaseSpace.initialValues;
    this.setInputValue('initAngle1', iv.angle1.toFixed(2));
    this.setInputValue('initVelocity1', iv.velocity1.toFixed(2));
    this.setInputValue('initAngle2', iv.angle2.toFixed(2));
    this.setInputValue('initVelocity2', iv.velocity2.toFixed(2));
    this.setInputValue('initStretch1', iv.stretch1.toFixed(2));
    this.setInputValue('initStretchRate1', iv.stretchRate1.toFixed(2));
    this.setInputValue('initStretch2', iv.stretch2.toFixed(2));
    this.setInputValue('initStretchRate2', iv.stretchRate2.toFixed(2));
  }

  updatePendulumParams(config: SimulationConfig): void {
    this.setInputValue('m1', config.m1);
    this.setTextContent('m1Value', config.m1.toFixed(1));
    this.setInputValue('m2', config.m2);
    this.setTextContent('m2Value', config.m2.toFixed(1));
    this.setInputValue('L1', config.L1);
    this.setTextContent('L1Value', config.L1.toFixed(1));
    this.setInputValue('L2', config.L2);
    this.setTextContent('L2Value', config.L2.toFixed(1));
    this.setInputValue('k1', config.k1);
    this.setTextContent('k1Value', String(config.k1));
    this.setInputValue('k2', config.k2);
    this.setTextContent('k2Value', String(config.k2));
  }

  updateIntegrationInputs(config: SimulationConfig): void {
    this.setInputValue('dt', config.dt.toFixed(4));
    this.setInputValue('iterations', config.iterationsPerFrame);
    this.setTextContent('iterValue', String(config.iterationsPerFrame));
    this.setInputValue('maxIter', config.maxIter);
    this.setInputValue('perturb', config.perturb);
    this.setTextContent('perturbValue', config.perturb.toFixed(6));
    this.setInputValue('perturbDistribution', config.perturbDistribution);
    this.setInputValue('trials', config.trials);
    this.setTextContent('trialsValue', String(config.trials));
  }

  updateTrialStats(visible: boolean, current: number, total: number): void {
    this.setDisplay('trialRow', visible ? 'inline' : 'none');
    if (visible) this.setTextContent('trialCount', `${current}/${total}`);
  }

  updateStats(frameCount: number, maxValue: number, fps: number, zoomLevel: number): void {
    this.setTextContent('frameCount', String(frameCount));
    this.setTextContent('maxDistance', maxValue.toFixed(2));
    this.setTextContent('fps', String(fps));
    this.setTextContent('zoomLevel', String(zoomLevel));
  }

  ensureDistinctDimensions(xDim: PhaseSpaceDimension, yDim: PhaseSpaceDimension): void {
    const xSelect = this.getElement('xDimension') as HTMLSelectElement | null;
    const ySelect = this.getElement('yDimension') as HTMLSelectElement | null;
    if (!xSelect || !ySelect) return;

    for (let i = 0; i < xSelect.options.length; i++) {
      const opt = xSelect.options[i];
      opt.disabled = opt.value === yDim;
    }
    for (let i = 0; i < ySelect.options.length; i++) {
      const opt = ySelect.options[i];
      opt.disabled = opt.value === xDim;
    }
  }

  bindControl(id: string, callback: (value: string) => void, eventType = 'input'): void {
    const el = this.getElement(id);
    if (!el) return;

    if (eventType === 'input' && (el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) {
      el.addEventListener('input', () => callback(el.value));
    } else {
      el.addEventListener('change', () => callback(this.getInputValue(id)));
    }
  }

  bindButton(id: string, callback: () => void): void {
    const el = this.getElement(id);
    if (el) el.addEventListener('click', callback);
  }

  updateChunkSizeOptions(resolution: number): void {
    const chunkSelect = this.getElement('chunkSize') as HTMLSelectElement | null;
    if (!chunkSelect) return;

    for (let i = 0; i < chunkSelect.options.length; i++) {
      const opt = chunkSelect.options[i];
      const val = parseInt(opt.value);
      opt.disabled = val > resolution;
    }

    const currentVal = parseInt(chunkSelect.value);
    if (currentVal > resolution) {
      const validOptions = Array.from(chunkSelect.options).filter(o => !o.disabled);
      if (validOptions.length > 0) {
        const largest = validOptions[validOptions.length - 1];
        chunkSelect.value = largest.value;
      }
    }
  }
}
