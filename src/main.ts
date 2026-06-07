import { ChaosApp } from './app.ts';
import { DEFAULT_CONFIG } from './types/config.ts';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

new ChaosApp(canvas, DEFAULT_CONFIG);
