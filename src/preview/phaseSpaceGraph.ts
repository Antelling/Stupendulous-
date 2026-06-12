export interface GraphData {
  theta1: number[];
  omega1: number[];
  theta2: number[];
  omega2: number[];
  kineticEnergy: number[];
  potentialEnergy: number[];
  elasticEnergy: number[];
}

interface ScaleRange {
  min: number;
  max: number;
}

interface PoincarePoint {
  x: number;
  y: number;
}

export class PhaseSpaceGraph {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private poincareCanvas: HTMLCanvasElement;
  private poincareCtx: CanvasRenderingContext2D;
  private data: GraphData;
  private maxPoints: number;
  private width: number;
  private height: number;

  // Poincaré section data
  private phaseSpaceHistory: number[][] = [];  // 4D points [theta1, omega1, theta2, omega2]
  private poincarePoints: PoincarePoint[] = [];
  private kineticEnergyHistory: number[] = [];
  private keThreshold: number | null = null;
  private lastKeState: 'above' | 'below' | null = null;
  private framesSinceReset = 0;
  private readonly ANALYSIS_FRAMES = 300; // ~5 seconds at 60fps
  private hasAnalyzed = false;

  // Colors for each line
  private colors = {
    theta1: 'rgba(100, 200, 255, 0.85)',
    theta2: 'rgba(255, 150, 100, 0.85)',
    omega1: 'rgba(150, 255, 150, 0.85)',
    omega2: 'rgba(255, 255, 100, 0.85)',
    kineticEnergy: 'rgba(255, 100, 100, 0.85)',
    potentialEnergy: 'rgba(100, 100, 255, 0.85)',
    elasticEnergy: 'rgba(255, 200, 100, 0.85)',
  };

  private labels = {
    theta1: 'θ₁',
    theta2: 'θ₂',
    omega1: 'ω₁',
    omega2: 'ω₂',
    kineticEnergy: 'KE',
    potentialEnergy: 'PE',
    elasticEnergy: 'EE',
  };

  constructor(canvas: HTMLCanvasElement, poincareCanvas: HTMLCanvasElement, maxPoints: number = 1000) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.poincareCanvas = poincareCanvas;
    this.poincareCtx = poincareCanvas.getContext('2d')!;
    this.maxPoints = maxPoints;
    this.width = canvas.width;
    this.height = canvas.height;
    this.data = {
      theta1: [],
      omega1: [],
      theta2: [],
      omega2: [],
      kineticEnergy: [],
      potentialEnergy: [],
      elasticEnergy: [],
    };
  }

  reset(): void {
    this.data = {
      theta1: [],
      omega1: [],
      theta2: [],
      omega2: [],
      kineticEnergy: [],
      potentialEnergy: [],
      elasticEnergy: [],
    };
    this.phaseSpaceHistory = [];
    this.poincarePoints = [];
    this.kineticEnergyHistory = [];
    this.keThreshold = null;
    this.lastKeState = null;
    this.framesSinceReset = 0;
    this.hasAnalyzed = false;
  }

  addPoint(
    theta1: number,
    omega1: number,
    theta2: number,
    omega2: number,
    kineticEnergy: number,
    potentialEnergy: number,
    elasticEnergy: number,
  ): void {
    this.data.theta1.push(theta1);
    this.data.omega1.push(omega1);
    this.data.theta2.push(theta2);
    this.data.omega2.push(omega2);
    this.data.kineticEnergy.push(kineticEnergy);
    this.data.potentialEnergy.push(potentialEnergy);
    this.data.elasticEnergy.push(elasticEnergy);

    // Store 4D phase space point
    this.phaseSpaceHistory.push([theta1, omega1, theta2, omega2]);
    this.kineticEnergyHistory.push(kineticEnergy);

    // Keep only last maxPoints for line graph
    if (this.data.theta1.length > this.maxPoints) {
      this.data.theta1.shift();
      this.data.omega1.shift();
      this.data.theta2.shift();
      this.data.omega2.shift();
      this.data.kineticEnergy.shift();
      this.data.potentialEnergy.shift();
      this.data.elasticEnergy.shift();
    }

    // Keep all phase space history for Poincaré (no deletion)
    // But limit to prevent memory issues
    if (this.phaseSpaceHistory.length > 10000) {
      this.phaseSpaceHistory.shift();
      this.kineticEnergyHistory.shift();
    }

    // Analyze KE after 5 seconds to set threshold
    this.framesSinceReset++;
    if (!this.hasAnalyzed && this.framesSinceReset >= this.ANALYSIS_FRAMES) {
      this.analyzeKineticEnergy();
    }

    // Check for Poincaré section crossings
    if (this.keThreshold !== null) {
      this.checkPoincareCrossing();
    }
  }

  private analyzeKineticEnergy(): void {
    if (this.kineticEnergyHistory.length === 0) return;

    // Calculate average KE over the analysis period
    const recentKE = this.kineticEnergyHistory.slice(-this.ANALYSIS_FRAMES);
    const avgKE = recentKE.reduce((sum, ke) => sum + ke, 0) / recentKE.length;
    
    this.keThreshold = avgKE;
    this.hasAnalyzed = true;

    // Initialize state based on current KE
    const currentKE = this.kineticEnergyHistory[this.kineticEnergyHistory.length - 1];
    this.lastKeState = currentKE >= avgKE ? 'above' : 'below';

    // Retroactively find crossings from the beginning
    this.poincarePoints = [];
    for (let i = 1; i < this.kineticEnergyHistory.length; i++) {
      const prevKE = this.kineticEnergyHistory[i - 1];
      const currKE = this.kineticEnergyHistory[i];
      const prevState = prevKE >= avgKE ? 'above' : 'below';
      const currState = currKE >= avgKE ? 'above' : 'below';

      if (prevState !== currState) {
        // Found a crossing - interpolate
        const t = Math.abs(prevKE - avgKE) / Math.abs(currKE - prevKE);
        const prev = this.phaseSpaceHistory[i - 1];
        const curr = this.phaseSpaceHistory[i];
        
        // Linear interpolation of phase space coordinates
        const crossing = prev.map((p, j) => p + t * (curr[j] - p));
        
        // Project to 2D: use theta1 vs omega1 for the section
        this.poincarePoints.push({
          x: crossing[0],  // theta1
          y: crossing[1],  // omega1
        });
      }
    }
  }

  private checkPoincareCrossing(): void {
    if (this.keThreshold === null || this.kineticEnergyHistory.length < 2) return;

    const n = this.kineticEnergyHistory.length;
    const prevKE = this.kineticEnergyHistory[n - 2];
    const currKE = this.kineticEnergyHistory[n - 1];

    const prevState = prevKE >= this.keThreshold ? 'above' : 'below';
    const currState = currKE >= this.keThreshold ? 'above' : 'below';

    if (prevState !== currState) {
      // Found a crossing - interpolate
      const t = Math.abs(prevKE - this.keThreshold) / Math.abs(currKE - prevKE);
      const prev = this.phaseSpaceHistory[n - 2];
      const curr = this.phaseSpaceHistory[n - 1];
      
      // Linear interpolation of phase space coordinates
      const crossing = prev.map((p, j) => p + t * (curr[j] - p));
      
      // Project to 2D: use theta1 vs omega1 for the section
      this.poincarePoints.push({
        x: crossing[0],  // theta1
        y: crossing[1],  // omega1
      });
    }

    this.lastKeState = currState;
  }

  draw(showEnergy: boolean, currentFrame?: number, startFrame?: number | null, endFrame?: number | null, divergenceFrame?: number | null): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(8, 10, 16, 0.95)';
    ctx.fillRect(0, 0, w, h);

    const n = this.data.theta1.length;
    if (n < 2) return;

    const allArrays: number[][] = [
      this.data.theta1,
      this.data.omega1,
      this.data.theta2,
      this.data.omega2,
      this.data.kineticEnergy,
      this.data.potentialEnergy,
    ];
    const allColors = [
      this.colors.theta1,
      this.colors.omega1,
      this.colors.theta2,
      this.colors.omega2,
      this.colors.kineticEnergy,
      this.colors.potentialEnergy,
    ];
    const allLabels = [
      this.labels.theta1,
      this.labels.omega1,
      this.labels.theta2,
      this.labels.omega2,
      this.labels.kineticEnergy,
      this.labels.potentialEnergy,
    ];

    if (showEnergy) {
      allArrays.push(this.data.elasticEnergy);
      allColors.push(this.colors.elasticEnergy);
      allLabels.push(this.labels.elasticEnergy);
    }

    // Per-line scale ranges
    const perLineScales = allArrays.map(arr => this.getScaleRange([arr]));

    // Draw grid lines
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw each line on its own scale
    for (let i = 0; i < allArrays.length; i++) {
      this.drawSingleLine(allArrays[i], allColors[i], perLineScales[i], 0, h, n);
    }

    // Draw vertical markers
    if (startFrame !== undefined && startFrame !== null && startFrame < n) {
      this.drawVerticalMarker(startFrame, n, w, h, '#0d4', 'Start');
    }
    if (endFrame !== undefined && endFrame !== null && endFrame < n) {
      this.drawVerticalMarker(endFrame, n, w, h, '#e84', 'End');
    }
    if (divergenceFrame !== undefined && divergenceFrame !== null && divergenceFrame < n) {
      this.drawVerticalMarker(divergenceFrame, n, w, h, '#e8a030', 'Divergence');
    }
    if (currentFrame !== undefined && currentFrame < n) {
      this.drawVerticalMarker(currentFrame, n, w, h, 'rgba(255, 255, 255, 0.3)', '', true);
    }

    // Draw legend at the top
    ctx.font = '500 10px monospace';
    ctx.textAlign = 'left';
    let xPos = 4;
    const yPos = 12;
    
    for (let i = 0; i < allArrays.length; i++) {
      const color = allColors[i];
      const label = allLabels[i];
      const value = allArrays[i][n - 1];
      
      ctx.fillStyle = color;
      ctx.fillText(`${label} ${value?.toFixed(2) ?? ''}`, xPos, yPos);
      
      const textWidth = ctx.measureText(`${label} ${value?.toFixed(2) ?? ''}`).width;
      xPos += textWidth + 12;
    }

    // Draw Poincaré count
    if (this.poincarePoints.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(`Poincaré: ${this.poincarePoints.length}`, xPos, yPos);
    }
  }

  private drawVerticalMarker(frame: number, totalFrames: number, w: number, h: number, color: string, label: string, isCurrent = false): void {
    const ctx = this.ctx;
    const x = (frame / (totalFrames - 1)) * w;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = isCurrent ? 1 : 2;
    ctx.setLineDash(isCurrent ? [4, 4] : []);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.setLineDash([]);
    
    if (label && !isCurrent) {
      ctx.fillStyle = color;
      ctx.font = '500 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 4, 20);
    }
  }

  drawPoincare(): void {
    const ctx = this.poincareCtx;
    const w = this.poincareCanvas.width;
    const h = this.poincareCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(8, 10, 16, 0.95)';
    ctx.fillRect(0, 0, w, h);

    if (!this.hasAnalyzed) {
      ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
      ctx.font = '500 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Collecting data for Poincaré section...', w / 2, h / 2);
      return;
    }

    if (this.poincarePoints.length === 0) {
      ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
      ctx.font = '500 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No Poincaré crossings yet...', w / 2, h / 2);
      return;
    }

    // Calculate scale for Poincaré points
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const p of this.poincarePoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    // Add padding
    const padX = (maxX - minX) * 0.1 || 1;
    const padY = (maxY - minY) * 0.1 || 1;
    minX -= padX;
    maxX += padX;
    minY -= padY;
    maxY += padY;

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    if (rangeX === 0 || rangeY === 0) return;

    // Draw axes
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 0.5;
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Draw points
    for (const p of this.poincarePoints) {
      const px = ((p.x - minX) / rangeX) * w;
      const py = h - ((p.y - minY) / rangeY) * h;
      
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 200, 100, 0.8)';
      ctx.fill();
    }

    // Draw label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '500 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Poincaré Section: KE = ${this.keThreshold?.toFixed(2)} (${this.poincarePoints.length} points)`, 10, 20);
  }

  private getScaleRange(arrays: number[][]): ScaleRange {
    let min = Infinity;
    let max = -Infinity;
    for (const arr of arrays) {
      for (const val of arr) {
        if (!isNaN(val) && isFinite(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
    }
    // If no valid data, return default
    if (min === Infinity) {
      return { min: -1, max: 1 };
    }
    // Add padding (10%)
    const range = max - min;
    const padding = range === 0 ? 1 : range * 0.1;
    return {
      min: min - padding,
      max: max + padding,
    };
  }

  private drawSingleLine(
    data: number[],
    color: string,
    scale: ScaleRange,
    top: number,
    height: number,
    n: number,
  ): void {
    const ctx = this.ctx;
    const w = this.width;
    const range = scale.max - scale.min;
    if (range === 0 || !isFinite(range)) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    let hasValidPoint = false;
    for (let i = 0; i < n; i++) {
      const val = data[i];
      if (!isFinite(val)) continue;
      
      const x = (i / (n - 1)) * w;
      const normalized = (val - scale.min) / range;
      const y = top + height - normalized * height;

      if (!hasValidPoint) {
        ctx.moveTo(x, y);
        hasValidPoint = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    if (hasValidPoint) {
      ctx.stroke();
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
  }
}