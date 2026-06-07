import type { SimulationConfig } from '../types/config.ts';

export class ZoomController {
  private zoomHistory: Array<{
    theta1: { min: number; max: number };
    theta2: { min: number; max: number };
  }> = [];

  constructor(
    private config: SimulationConfig,
    private onZoomChange: () => void
  ) {}

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

    const dataX1 = this.config.theta1Range.min + nx1 * (this.config.theta1Range.max - this.config.theta1Range.min);
    const dataX2 = this.config.theta1Range.min + nx2 * (this.config.theta1Range.max - this.config.theta1Range.min);
    const dataY1 = this.config.theta2Range.min + ny1 * (this.config.theta2Range.max - this.config.theta2Range.min);
    const dataY2 = this.config.theta2Range.min + ny2 * (this.config.theta2Range.max - this.config.theta2Range.min);

    this.zoomHistory.push({
      theta1: { ...this.config.theta1Range },
      theta2: { ...this.config.theta2Range },
    });

    this.config.theta1Range = {
      min: Math.min(dataX1, dataX2),
      max: Math.max(dataX1, dataX2),
    };
    this.config.theta2Range = {
      min: Math.min(dataY1, dataY2),
      max: Math.max(dataY1, dataY2),
    };

    this.onZoomChange();
  }

  zoomOut(): void {
    if (this.zoomHistory.length > 0) {
      const prev = this.zoomHistory.pop()!;
      this.config.theta1Range = prev.theta1;
      this.config.theta2Range = prev.theta2;
    } else {
      this.config.theta1Range = { min: -3.14, max: 3.14 };
      this.config.theta2Range = { min: -3.14, max: 3.14 };
    }
    this.onZoomChange();
  }

  reset(): void {
    this.zoomHistory = [];
    this.config.theta1Range = { min: -3.14, max: 3.14 };
    this.config.theta2Range = { min: -3.14, max: 3.14 };
    this.onZoomChange();
  }
}
