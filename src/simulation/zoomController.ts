import type { SimulationConfig, PhaseSpaceAxis } from '../types/config.ts';

export class ZoomController {
  private zoomHistory: Array<{
    x: PhaseSpaceAxis;
    y: PhaseSpaceAxis;
  }> = [];

  private homeX: { min: number; max: number };
  private homeY: { min: number; max: number };

  constructor(
    private config: SimulationConfig,
    private onZoomChange: () => void
  ) {
    this.homeX = { min: config.phaseSpace.x.min, max: config.phaseSpace.x.max };
    this.homeY = { min: config.phaseSpace.y.min, max: config.phaseSpace.y.max };
  }

  get level(): number {
    return this.zoomHistory.length + 1;
  }

  applyRectangle(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const nx1 = Math.max(0, Math.min(1, Math.min(startX, endX) / canvasWidth));
    const nx2 = Math.max(0, Math.min(1, Math.max(startX, endX) / canvasWidth));
    const ny1 = Math.max(0, Math.min(1, 1 - Math.max(startY, endY) / canvasHeight));
    const ny2 = Math.max(0, Math.min(1, 1 - Math.min(startY, endY) / canvasHeight));

    const dataX1 = this.config.phaseSpace.x.min + nx1 * (this.config.phaseSpace.x.max - this.config.phaseSpace.x.min);
    const dataX2 = this.config.phaseSpace.x.min + nx2 * (this.config.phaseSpace.x.max - this.config.phaseSpace.x.min);
    const dataY1 = this.config.phaseSpace.y.min + ny1 * (this.config.phaseSpace.y.max - this.config.phaseSpace.y.min);
    const dataY2 = this.config.phaseSpace.y.min + ny2 * (this.config.phaseSpace.y.max - this.config.phaseSpace.y.min);

    this.zoomHistory.push({
      x: { ...this.config.phaseSpace.x },
      y: { ...this.config.phaseSpace.y },
    });

    this.config.phaseSpace.x = {
      dimension: this.config.phaseSpace.x.dimension,
      min: Math.min(dataX1, dataX2),
      max: Math.max(dataX1, dataX2),
    };
    this.config.phaseSpace.y = {
      dimension: this.config.phaseSpace.y.dimension,
      min: Math.min(dataY1, dataY2),
      max: Math.max(dataY1, dataY2),
    };

    this.onZoomChange();
  }

  zoomOut(): void {
    if (this.zoomHistory.length > 0) {
      const prev = this.zoomHistory.pop()!;
      this.config.phaseSpace.x = prev.x;
      this.config.phaseSpace.y = prev.y;
    } else {
      this.config.phaseSpace.x.min = this.homeX.min;
      this.config.phaseSpace.x.max = this.homeX.max;
      this.config.phaseSpace.y.min = this.homeY.min;
      this.config.phaseSpace.y.max = this.homeY.max;
    }
    this.onZoomChange();
  }

  reset(): void {
    this.zoomHistory = [];
    this.config.phaseSpace.x.min = this.homeX.min;
    this.config.phaseSpace.x.max = this.homeX.max;
    this.config.phaseSpace.y.min = this.homeY.min;
    this.config.phaseSpace.y.max = this.homeY.max;
    this.onZoomChange();
  }
}
