import type { SimulationConfig, PhaseSpaceDimension } from './types/config.ts';
import { DEFAULT_CONFIG, ELASTIC_DIMENSIONS, RIGID_DIMENSIONS } from './types/config.ts';
import { QuadBuffer } from './webgl/quadBuffer.ts';
import { TextureManager } from './webgl/textureManager.ts';
import { UniformSetter } from './webgl/uniformSetter.ts';
import { Simulator } from './simulation/simulator.ts';
import { Renderer } from './simulation/renderer.ts';
import { ZoomController } from './simulation/zoomController.ts';
import { UIController } from './ui/uiController.ts';
import { StatsTracker } from './ui/statsTracker.ts';
import { PendulumPreview } from './preview/pendulumPreview.ts';

export class ChaosApp {
  private gl: WebGL2RenderingContext;
  private config: SimulationConfig;
  private quadBuffer: QuadBuffer;
  private sharedTextures: TextureManager;
  private sharedUniforms: UniformSetter;
  private simulator: Simulator | null = null;
  private renderer: Renderer;
  private zoomController: ZoomController;
  private ui: UIController;
  private stats: StatsTracker;
  private preview: PendulumPreview;
  private canvas: HTMLCanvasElement;
  private isDragging = false;
  private dragStart: { x: number; y: number } | null = null;
  private dragCurrent: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, config: SimulationConfig) {
    this.canvas = canvas;
    this.config = { ...config };

    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL 2.0 not supported');
    this.gl = gl;
    gl.getExtension('EXT_color_buffer_float');

    this.quadBuffer = new QuadBuffer(gl);
    this.sharedTextures = new TextureManager(gl);
    this.sharedUniforms = new UniformSetter(gl);
    this.renderer = new Renderer(gl, this.config, this.sharedTextures, this.sharedUniforms, this.quadBuffer.buffer);

    this.zoomController = new ZoomController(this.config, () => this.onZoomChange());
    this.ui = new UIController();
    this.stats = new StatsTracker();
    this.preview = new PendulumPreview(document.getElementById('canvasWrapper')!, canvas, this.gl, this.config);

    this.setupControls();
    this.setupZoomControls();
    this.rebuildSimulator();
    this.animate();
  }

  private rebuildSimulator(): void {
    if (this.simulator) {
      this.simulator.dispose();
    }
    this.simulator = new Simulator(this.gl, this.config, this.quadBuffer.buffer);
    this.preview.rebuildForConfig(this.config);

    if (this.config.vizMode === 'divergence') {
      this.simulator.startDivergence(() => this.onDivergenceRender());
    } else {
      this.simulator.reset();
    }
  }

  private onDivergenceRender(): void {
    if (this.simulator) {
      this.renderer.computeMaxValue(this.simulator.getDataTexture());
    }
  }

  private onZoomChange(): void {
    this.ui.updatePhaseSpaceInputs(this.config);
    this.rebuildSimulator();
  }

  private setupControls(): void {
    this.ui.bindControl('systemType', (v) => {
      this.config.system = v as SimulationConfig['system'];
      this.handleSystemChange();
      this.ui.updateModeUI(this.config);
      this.ui.updatePendulumParams(this.config);
      this.ui.updatePhaseSpaceInputs(this.config);
      this.rebuildSimulator();
    });

    this.ui.bindControl('vizMode', (v) => {
      this.config.vizMode = v as SimulationConfig['vizMode'];
      this.ui.updateModeUI(this.config);
      this.rebuildSimulator();
    });

    this.ui.bindControl('resolution', (v) => {
      this.config.resolution = parseInt(v) as SimulationConfig['resolution'];
      this.canvas.width = this.config.resolution;
      this.canvas.height = this.config.resolution;
      this.rebuildSimulator();
    }, 'change');

    this.ui.bindControl('xDimension', (v) => {
      this.config.phaseSpace.x.dimension = v as PhaseSpaceDimension;
      this.applyAxisDefaults('x');
      this.ui.updatePhaseSpaceInputs(this.config);
      this.ui.ensureDistinctDimensions(this.config.phaseSpace.x.dimension, this.config.phaseSpace.y.dimension);
      this.zoomController = new ZoomController(this.config, () => this.onZoomChange());
      this.rebuildSimulator();
    }, 'change');

    this.ui.bindControl('yDimension', (v) => {
      this.config.phaseSpace.y.dimension = v as PhaseSpaceDimension;
      this.applyAxisDefaults('y');
      this.ui.updatePhaseSpaceInputs(this.config);
      this.ui.ensureDistinctDimensions(this.config.phaseSpace.x.dimension, this.config.phaseSpace.y.dimension);
      this.zoomController = new ZoomController(this.config, () => this.onZoomChange());
      this.rebuildSimulator();
    }, 'change');

    ['xMin', 'xMax', 'yMin', 'yMax'].forEach(id => {
      this.ui.bindControl(id, (v) => {
        const val = parseFloat(v);
        if (id === 'xMin') this.config.phaseSpace.x.min = val;
        else if (id === 'xMax') this.config.phaseSpace.x.max = val;
        else if (id === 'yMin') this.config.phaseSpace.y.min = val;
        else if (id === 'yMax') this.config.phaseSpace.y.max = val;
        this.zoomController = new ZoomController(this.config, () => this.onZoomChange());
        this.rebuildSimulator();
      }, 'change');
    });

    const initialValueMap: Record<string, PhaseSpaceDimension> = {
      initAngle1: 'angle1',
      initVelocity1: 'velocity1',
      initAngle2: 'angle2',
      initVelocity2: 'velocity2',
      initStretch1: 'stretch1',
      initStretchRate1: 'stretchRate1',
      initStretch2: 'stretch2',
      initStretchRate2: 'stretchRate2',
    };

    Object.entries(initialValueMap).forEach(([id, dim]) => {
      this.ui.bindControl(id, (v) => {
        this.config.phaseSpace.initialValues[dim] = parseFloat(v);
        this.rebuildSimulator();
      }, 'change');
    });

    this.ui.bindControl('dt', (v) => {
      this.config.dt = parseFloat(v);
      this.ui.updateIntegrationInputs(this.config);
    }, 'change');

    this.ui.bindControl('iterations', (v) => {
      this.config.iterationsPerFrame = parseInt(v);
      this.ui.setTextContent('iterValue', String(this.config.iterationsPerFrame));
    });

    this.ui.bindControl('maxIter', (v) => {
      this.config.maxIter = parseInt(v);
      this.rebuildSimulator();
    }, 'change');

    this.ui.bindControl('perturb', (v) => {
      this.config.perturb = parseFloat(v);
      this.ui.setTextContent('perturbValue', this.config.perturb.toFixed(6));
      this.rebuildSimulator();
    });

    this.ui.bindControl('colormap', (v) => {
      this.config.colormap = parseInt(v) as SimulationConfig['colormap'];
      this.ui.updateLegend(this.config.colormap);
    }, 'change');

    this.ui.bindControl('toneMapping', (v) => {
      this.config.toneMapping = parseInt(v) as SimulationConfig['toneMapping'];
    }, 'change');

    this.ui.bindButton('resetBtn', () => {
      this.zoomController.reset();
      this.ui.updatePhaseSpaceInputs(this.config);
      this.rebuildSimulator();
    });

    this.ui.bindButton('downloadBtn', () => this.download());

    this.ui.bindControl('m1', (v) => {
      this.config.m1 = parseFloat(v);
      this.ui.setTextContent('m1Value', this.config.m1.toFixed(1));
      this.rebuildSimulator();
    });

    this.ui.bindControl('m2', (v) => {
      this.config.m2 = parseFloat(v);
      this.ui.setTextContent('m2Value', this.config.m2.toFixed(1));
      this.rebuildSimulator();
    });

    this.ui.bindControl('L1', (v) => {
      this.config.L1 = parseFloat(v);
      this.ui.setTextContent('L1Value', this.config.L1.toFixed(1));
      this.rebuildSimulator();
    });

    this.ui.bindControl('L2', (v) => {
      this.config.L2 = parseFloat(v);
      this.ui.setTextContent('L2Value', this.config.L2.toFixed(1));
      this.rebuildSimulator();
    });

    this.ui.bindControl('k1', (v) => {
      this.config.k1 = parseFloat(v);
      this.ui.setTextContent('k1Value', String(this.config.k1));
      this.rebuildSimulator();
    });

    this.ui.bindControl('k2', (v) => {
      this.config.k2 = parseFloat(v);
      this.ui.setTextContent('k2Value', String(this.config.k2));
      this.rebuildSimulator();
    });

    this.ui.updateModeUI(this.config);
    this.ui.updateLegend(this.config.colormap);
    this.ui.updatePendulumParams(this.config);
    this.ui.updatePhaseSpaceInputs(this.config);
    this.ui.updateIntegrationInputs(this.config);
    this.ui.ensureDistinctDimensions(this.config.phaseSpace.x.dimension, this.config.phaseSpace.y.dimension);
  }

  private handleSystemChange(): void {
    const isElastic = this.config.system !== 'rigid';
    const availableDims = isElastic ? ELASTIC_DIMENSIONS : RIGID_DIMENSIONS;

    if (!availableDims.includes(this.config.phaseSpace.x.dimension)) {
      this.config.phaseSpace.x.dimension = 'angle1';
      this.applyAxisDefaults('x');
    }
    if (!availableDims.includes(this.config.phaseSpace.y.dimension) || this.config.phaseSpace.y.dimension === this.config.phaseSpace.x.dimension) {
      this.config.phaseSpace.y.dimension = 'angle2';
      this.applyAxisDefaults('y');
    }
  }

  private applyAxisDefaults(axis: 'x' | 'y'): void {
    const dim = this.config.phaseSpace[axis].dimension;
    if (dim.startsWith('angle')) {
      this.config.phaseSpace[axis].min = -Math.PI;
      this.config.phaseSpace[axis].max = Math.PI;
    } else if (dim.startsWith('stretch') && !dim.includes('Rate')) {
      this.config.phaseSpace[axis].min = -0.5;
      this.config.phaseSpace[axis].max = 0.5;
    } else {
      this.config.phaseSpace[axis].min = -5;
      this.config.phaseSpace[axis].max = 5;
    }
  }

  private setupZoomControls(): void {
    const overlay = document.getElementById('zoomOverlay')!;

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.isDragging = true;
      this.preview.setDragging(true);
      this.dragStart = { x, y };
      this.dragCurrent = { x, y };
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      this.dragCurrent = {
        x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
        y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
      };
      this.updateZoomOverlay();
    });

    this.canvas.addEventListener('mouseup', () => {
      if (!this.isDragging) return;
      const dragDist = Math.sqrt((this.dragCurrent!.x - this.dragStart!.x) ** 2 + (this.dragCurrent!.y - this.dragStart!.y) ** 2);
      if (dragDist > 5) {
        this.zoomController.applyRectangle(this.dragStart!.x, this.dragStart!.y, this.dragCurrent!.x, this.dragCurrent!.y, this.canvas.width, this.canvas.height);
      }
      this.isDragging = false;
      this.preview.setDragging(false);
      this.dragStart = null;
      this.dragCurrent = null;
      overlay.style.display = 'none';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.preview.setDragging(false);
      this.dragStart = null;
      this.dragCurrent = null;
      overlay.style.display = 'none';
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.zoomController.zoomOut();
    });

    this.ui.bindButton('zoomOutBtn', () => this.zoomController.zoomOut());
  }

  private updateZoomOverlay(): void {
    const overlay = document.getElementById('zoomOverlay')!;
    const wrapper = document.getElementById('canvasWrapper')!;
    const canvasRect = this.canvas.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const scaleX = wrapperRect.width / this.canvas.width;
    const scaleY = wrapperRect.height / this.canvas.height;
    const x1 = Math.min(this.dragStart!.x, this.dragCurrent!.x) * scaleX;
    const y1 = Math.min(this.dragStart!.y, this.dragCurrent!.y) * scaleY;
    const x2 = Math.max(this.dragStart!.x, this.dragCurrent!.x) * scaleX;
    const y2 = Math.max(this.dragStart!.y, this.dragCurrent!.y) * scaleY;
    overlay.style.display = 'block';
    overlay.style.left = x1 + 'px';
    overlay.style.top = y1 + 'px';
    overlay.style.width = (x2 - x1) + 'px';
    overlay.style.height = (y2 - y1) + 'px';
  }

  private animate(): void {
    if (this.simulator) {
      const isDiv = this.config.vizMode === 'divergence';

      if (!isDiv) {
        this.simulator.stepDistance();
        this.renderer.computeMaxValue(this.simulator.getDataTexture());
      }

      if (!isDiv || !this.simulator.isComplete()) {
        this.renderer.render(this.simulator.getDataTexture());
      }

      const fc = this.simulator.getFrameCount();
      const isComplete = isDiv && this.simulator.isComplete();
      this.stats.update(this.config, fc, this.renderer.getMaxValue(), isComplete);
      this.ui.updateStats(fc, this.renderer.getMaxValue(), this.stats.getFps(), this.zoomController.level);
    }
    requestAnimationFrame(() => this.animate());
  }

  private download(): void {
    const link = document.createElement('a');
    link.download = `chaos-${this.config.system}-${this.config.vizMode}-frame${this.simulator?.getFrameCount() ?? 0}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}
