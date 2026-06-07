import type { SimulationConfig } from '../types/config.ts';

export class StatsTracker {
  private lastTime = performance.now();
  private fps = 0;

  update(config: SimulationConfig, _frameCount: number, _maxValue: number, isComplete: boolean): void {
    const now = performance.now();
    if (config.vizMode === 'divergence' && isComplete) {
      this.fps = 0;
    } else {
      this.fps = Math.round(1000 / (now - this.lastTime));
    }
    this.lastTime = now;
  }

  getFps(): number {
    return this.fps;
  }
}
