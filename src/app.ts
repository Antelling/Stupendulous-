import type { SimulationConfig } from './types/config.ts';
import { ShaderCompiler } from './webgl/shaderCompiler.ts';
import { TextureManager } from './webgl/textureManager.ts';
import { FramebufferManager } from './webgl/framebufferManager.ts';
import { VertexArrayManager } from './webgl/vertexArrayManager.ts';
import { QuadBuffer } from './webgl/quadBuffer.ts';
import { UniformSetter } from './webgl/uniformSetter.ts';
import { RigidSimulator } from './simulation/rigidSimulator.ts';
import { ElasticSimulator } from './simulation/elasticSimulator.ts';
import { DivergenceSimulator } from './simulation/divergenceSimulator.ts';
import { ElasticDivergenceSimulator } from './simulation/elasticDivergenceSimulator.ts';
import { Renderer } from './simulation/renderer.ts';
import { ZoomController } from './simulation/zoomController.ts';
import { UIController } from './ui/uiController.ts';
import { StatsTracker } from './ui/statsTracker.ts';
import { PendulumPreview } from './preview/pendulumPreview.ts';
import type { ShaderProgram, ShaderName } from './types/shaders.ts';

import vertexSource from './shaders/vertex.glsl?raw';
import initSource from './shaders/init.glsl?raw';
import physicsSource from './shaders/physics.glsl?raw';
import distanceSource from './shaders/distance.glsl?raw';
import renderSource from './shaders/render.glsl?raw';
import initDivergenceSource from './shaders/initDivergence.glsl?raw';
import divergenceSource from './shaders/divergence.glsl?raw';
import initElasticSource from './shaders/initElastic.glsl?raw';
import physicsElasticSource from './shaders/physicsElastic.glsl?raw';
import distanceElasticSource from './shaders/distanceElastic.glsl?raw';
import initElasticDivergenceSource from './shaders/initElasticDivergence.glsl?raw';
import divergenceElasticSource from './shaders/divergenceElastic.glsl?raw';

export class ChaosApp {
  private gl: WebGL2RenderingContext;
  private config: SimulationConfig;
  private programs: Record<string, ShaderProgram> = {};
  private quadBuffer: QuadBuffer;
  private textures: TextureManager;
  private framebuffers: FramebufferManager;
  private uniforms: UniformSetter;
  private vaos: VertexArrayManager;
  private rigidSim: RigidSimulator;
  private elasticSim: ElasticSimulator;
  private divergenceSim: DivergenceSimulator;
  private elasticDivergenceSim: ElasticDivergenceSimulator;
  private renderer: Renderer;
  private zoomController: ZoomController;
  private ui: UIController;
  private stats: StatsTracker;
  private _preview: PendulumPreview;
  private canvas: HTMLCanvasElement;
  private frameCount = 0;
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
    this.textures = new TextureManager(gl);
    this.framebuffers = new FramebufferManager(gl);
    this.uniforms = new UniformSetter(gl);

    this.vaos = new VertexArrayManager(gl, this.quadBuffer.buffer);
    this.createPrograms();
    for (const [_name, program] of Object.entries(this.programs)) {
      this.vaos.createVAOForProgram(program);
    }

    this.renderer = new Renderer(gl, this.config, this.textures, this.uniforms, this.programs);
    this.rigidSim = new RigidSimulator(gl, this.config, this.textures, this.framebuffers, this.uniforms, this.programs);
    this.elasticSim = new ElasticSimulator(gl, this.config, this.textures, this.framebuffers, this.uniforms, this.programs);
    this.divergenceSim = new DivergenceSimulator(gl, this.config, this.textures, this.framebuffers, this.uniforms, this.programs, () => this.onDivergenceComplete());
    this.elasticDivergenceSim = new ElasticDivergenceSimulator(gl, this.config, this.textures, this.framebuffers, this.uniforms, this.programs, () => this.onDivergenceComplete());

    this.zoomController = new ZoomController(this.config, () => this.onZoomChange());
    this.ui = new UIController();
    this.stats = new StatsTracker();
    this._preview = new PendulumPreview(document.getElementById('canvasWrapper')!, canvas, this.config);

    this.setupControls();
    this.setupZoomControls();
    this.reset();
    this.animate();
  }

  private createPrograms(): void {
    const compiler = new ShaderCompiler(this.gl);
    const shaders: Record<ShaderName, string> = {
      init: initSource,
      physics: physicsSource,
      distance: distanceSource,
      initDivergence: initDivergenceSource,
      divergence: divergenceSource,
      render: renderSource,
      initElastic: initElasticSource,
      physicsElastic: physicsElasticSource,
      distanceElastic: distanceElasticSource,
      initElasticDivergence: initElasticDivergenceSource,
      divergenceElastic: divergenceElasticSource,
    };

    for (const [_name, fragment] of Object.entries(shaders)) {
      const name = _name as ShaderName;
      const shaderProgram = compiler.linkProgram(vertexSource, fragment, name);
      const vao = this.vaos.createVAOForProgram(shaderProgram);
      this.programs[name] = { ...shaderProgram, vao };
    }
  }

  private setupControls(): void {
    this.ui.bindControl('systemType', (v) => {
      this.config.system = v as SimulationConfig['system'];
      this.ui.updateModeUI(this.config);
      this.reset();
    });

    this.ui.bindControl('vizMode', (v) => {
      this.config.vizMode = v as SimulationConfig['vizMode'];
      this.ui.updateModeUI(this.config);
      this.reset();
    });

    this.ui.bindControl('resolution', (v) => {
      this.config.resolution = parseInt(v) as SimulationConfig['resolution'];
      this.canvas.width = this.config.resolution;
      this.canvas.height = this.config.resolution;
      this.reset();
    }, 'change');

    ['theta1Min', 'theta1Max', 'theta2Min', 'theta2Max'].forEach(id => {
      this.ui.bindControl(id, (v) => {
        const val = parseFloat(v);
        if (id === 'theta1Min') this.config.theta1Range.min = val;
        else if (id === 'theta1Max') this.config.theta1Range.max = val;
        else if (id === 'theta2Min') this.config.theta2Range.min = val;
        else if (id === 'theta2Max') this.config.theta2Range.max = val;
        this.zoomController = new ZoomController(this.config, () => this.onZoomChange());
        this.reset();
      }, 'change');
    });

    this.ui.bindControl('omega1', (v) => {
      this.config.omega1 = parseFloat(v);
      this.ui.setTextContent('omega1Value', this.config.omega1.toFixed(1));
      this.reset();
    });

    this.ui.bindControl('omega2', (v) => {
      this.config.omega2 = parseFloat(v);
      this.ui.setTextContent('omega2Value', this.config.omega2.toFixed(1));
      this.reset();
    });

    this.ui.bindControl('dt', (v) => {
      this.config.dt = parseFloat(v);
      this.ui.setTextContent('dtValue', this.config.dt.toFixed(3));
    });

    this.ui.bindControl('iterations', (v) => {
      this.config.iterationsPerFrame = parseInt(v);
      this.ui.setTextContent('iterValue', String(this.config.iterationsPerFrame));
    });

    this.ui.bindControl('maxIter', (v) => {
      this.config.maxIter = parseInt(v);
      this.reset();
    }, 'change');

    this.ui.bindControl('dtDiv', (v) => {
      this.config.dt = parseFloat(v);
      this.ui.setTextContent('dtDivValue', this.config.dt.toFixed(3));
      this.reset();
    });

    this.ui.bindControl('threshold', (v) => {
      this.config.threshold = parseFloat(v);
      this.ui.setTextContent('thresholdValue', this.config.threshold.toFixed(2));
      this.reset();
    });

    this.ui.bindControl('perturb', (v) => {
      this.config.perturb = parseFloat(v);
      this.ui.setTextContent('perturbValue', this.config.perturb.toFixed(6));
      this.reset();
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
      this.ui.updateRangeInputs(this.config);
      this.reset();
    });

    this.ui.bindButton('downloadBtn', () => this.download());

    this.ui.bindControl('k1', (v) => {
      this.config.k1 = parseFloat(v);
      this.ui.setTextContent('k1Value', String(this.config.k1));
      this.reset();
    });

    this.ui.bindControl('k2', (v) => {
      this.config.k2 = parseFloat(v);
      this.ui.setTextContent('k2Value', String(this.config.k2));
      this.reset();
    });

    this.ui.updateModeUI(this.config);
    this.ui.updateLegend(this.config.colormap);
  }

  private setupZoomControls(): void {
    const overlay = document.getElementById('zoomOverlay')!;

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.isDragging = true;
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

    this.canvas.addEventListener('mouseup', (_e) => {
      if (!this.isDragging) return;
      const dragDist = Math.sqrt((this.dragCurrent!.x - this.dragStart!.x) ** 2 + (this.dragCurrent!.y - this.dragStart!.y) ** 2);
      if (dragDist > 5) {
        this.zoomController.applyRectangle(this.dragStart!.x, this.dragStart!.y, this.dragCurrent!.x, this.dragCurrent!.y, this.canvas.width, this.canvas.height);
      }
      this.isDragging = false;
      this.dragStart = null;
      this.dragCurrent = null;
      overlay.style.display = 'none';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
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

  private onZoomChange(): void {
    this.ui.updateRangeInputs(this.config);
    this.reset();
  }

  private onDivergenceComplete(): void {
    this.renderer.computeMaxValue(this.getCurrentDataTexture());
  }

  private getCurrentDataTexture(): WebGLTexture {
    if (this.config.vizMode === 'divergence') {
      return this.config.system === 'rigid'
        ? this.divergenceSim.getCurrentDataTexture()
        : this.elasticDivergenceSim.getCurrentDataTexture();
    }
    return this.config.system === 'rigid'
      ? this.rigidSim.getCurrentDataTexture()
      : this.elasticSim.getCurrentDataTexture();
  }

  private getCurrentFrameCount(): number {
    if (this.config.vizMode === 'divergence') {
      return this.config.system === 'rigid'
        ? this.divergenceSim.getFrameCount()
        : this.elasticDivergenceSim.getFrameCount();
    }
    return this.frameCount;
  }

  reset(): void {
    this.frameCount = 0;
    this.divergenceSim.stop();
    this.elasticDivergenceSim.stop();

    if (this.config.system === 'rigid' && this.config.vizMode === 'distance') {
      this.rigidSim.reset();
    } else if (this.config.system === 'rigid' && this.config.vizMode === 'divergence') {
      this.divergenceSim.start();
    } else if (this.config.system !== 'rigid' && this.config.vizMode === 'divergence') {
      this.elasticDivergenceSim.start();
    } else {
      this.elasticSim.reset();
    }
  }

  private step(): void {
    if (this.config.vizMode === 'divergence') return;

    if (this.config.system === 'rigid') {
      this.rigidSim.step();
    } else {
      this.elasticSim.step();
    }
    this.frameCount += this.config.iterationsPerFrame;
  }

  private render(): void {
    const dataTexture = this.getCurrentDataTexture();
    if (this.config.vizMode !== 'divergence') {
      this.renderer.computeMaxValue(dataTexture);
    }
    this.renderer.render(dataTexture);
  }

  private updateStats(): void {
    const isComplete = this.config.vizMode === 'divergence' && this.getCurrentFrameCount() >= this.config.maxIter;
    this.stats.update(this.config, this.getCurrentFrameCount(), this.renderer.getMaxValue(), isComplete);
    this.ui.updateStats(
      this.getCurrentFrameCount(),
      this.renderer.getMaxValue(),
      this.stats.getFps(),
      this.zoomController.level,
    );
  }

  private animate(): void {
    this.step();
    if (this.config.vizMode !== 'divergence' || this.getCurrentFrameCount() < this.config.maxIter) {
      this.render();
    }
    this.updateStats();
    requestAnimationFrame(() => this.animate());
  }

  private download(): void {
    const link = document.createElement('a');
    link.download = `chaos-${this.config.system}-${this.config.vizMode}-frame${this.frameCount}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}
