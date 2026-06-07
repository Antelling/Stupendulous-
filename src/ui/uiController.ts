import type { SimulationConfig, VizMode, Colormap } from '../types/config.ts';
import { SYSTEM_NAMES, MODE_NAMES } from '../types/config.ts';

export class UIController {
  private elements: Record<string, HTMLElement> = {};

  constructor() {
    this.cacheElements();
  }

  private cacheElements(): void {
    const ids = [
      'systemType', 'vizMode', 'resolution', 'colormap', 'toneMapping',
      'theta1Min', 'theta1Max', 'theta2Min', 'theta2Max',
      'omega1', 'omega2', 'dt', 'iterations', 'maxIter', 'dtDiv',
      'threshold', 'perturb', 'k1', 'k2',
      'resetBtn', 'downloadBtn', 'zoomOutBtn',
      'modeIndicator', 'subtitle', 'legendGradient',
      'frameCount', 'maxDistance', 'fps', 'zoomLevel',
      'omega1Value', 'omega2Value', 'dtValue', 'iterValue',
      'dtDivValue', 'thresholdValue', 'perturbValue',
      'k1Value', 'k2Value',
      'distanceControls', 'elasticControls', 'divergenceControls',
      'frameRow', 'maxDistRow',
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

    this.setDisplay('distanceControls', isDistance ? 'block' : 'none');
    this.setDisplay('elasticControls', isElastic ? 'block' : 'none');
    this.setDisplay('divergenceControls', isDivergence ? 'block' : 'none');

    this.setTextContent('modeIndicator', `${SYSTEM_NAMES[config.system]} \u00b7 ${MODE_NAMES[config.vizMode]}`);

    const subtitles: Record<VizMode, string> = {
      distance: isElastic ? 'Total distance traveled by bob2 (elastic system)' : 'Total distance traveled by the second pendulum bob',
      divergence: 'Iterations until perturbed trajectory diverges',
    };
    this.setTextContent('subtitle', subtitles[config.vizMode]);

    this.setDisplay('frameRow', isDivergence ? 'none' : 'block');
    this.setDisplay('maxDistRow', isDivergence ? 'none' : 'block');
  }

  updateLegend(colormap: Colormap): void {
    const gradient = this.getElement('legendGradient');
    if (gradient) {
      gradient.className = 'legend-gradient ' + (colormap === 6 ? 'rainbow-gradient' : 'viridis-gradient');
    }
  }

  updateRangeInputs(config: SimulationConfig): void {
    this.setInputValue('theta1Min', config.theta1Range.min.toFixed(2));
    this.setInputValue('theta1Max', config.theta1Range.max.toFixed(2));
    this.setInputValue('theta2Min', config.theta2Range.min.toFixed(2));
    this.setInputValue('theta2Max', config.theta2Range.max.toFixed(2));
  }

  updateStats(frameCount: number, maxValue: number, fps: number, zoomLevel: number): void {
    this.setTextContent('frameCount', String(frameCount));
    this.setTextContent('maxDistance', maxValue.toFixed(2));
    this.setTextContent('fps', String(fps));
    this.setTextContent('zoomLevel', String(zoomLevel));
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
}
