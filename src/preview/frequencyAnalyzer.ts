export interface FrequencyAnalysis {
  isPeriodic: boolean;
  period: number | null;
  confidence: number;
  dominantFreq: number | null;
}

interface Complex {
  re: number;
  im: number;
}

function fft(input: Float64Array): Complex[] {
  const n = input.length;
  if (n <= 1) return [{ re: input[0] || 0, im: 0 }];
  if (n % 2 !== 0) throw new Error('FFT length must be power of 2');

  const even = new Float64Array(n / 2);
  const odd = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    even[i] = input[2 * i];
    odd[i] = input[2 * i + 1];
  }

  const yEven = fft(even);
  const yOdd = fft(odd);
  const result: Complex[] = new Array(n);

  for (let k = 0; k < n / 2; k++) {
    const angle = (-2 * Math.PI * k) / n;
    const t = {
      re: Math.cos(angle) * yOdd[k].re - Math.sin(angle) * yOdd[k].im,
      im: Math.cos(angle) * yOdd[k].im + Math.sin(angle) * yOdd[k].re,
    };
    result[k] = {
      re: yEven[k].re + t.re,
      im: yEven[k].im + t.im,
    };
    result[k + n / 2] = {
      re: yEven[k].re - t.re,
      im: yEven[k].im - t.im,
    };
  }

  return result;
}

function magnitudeSpectrum(fftResult: Complex[]): Float64Array {
  const n = fftResult.length;
  const half = Math.floor(n / 2) + 1;
  const mag = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    mag[i] = Math.sqrt(fftResult[i].re * fftResult[i].re + fftResult[i].im * fftResult[i].im);
  }
  return mag;
}

function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

function padToPowerOf2(arr: Float64Array): Float64Array {
  const n = nextPowerOf2(arr.length);
  if (n === arr.length) return arr;
  const padded = new Float64Array(n);
  padded.set(arr);
  return padded;
}

function applyHannWindow(arr: Float64Array): Float64Array {
  const n = arr.length;
  const result = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    result[i] = arr[i] * w;
  }
  return result;
}

export class FrequencyAnalyzer {
  private t1History: Float64Array;
  private w1History: Float64Array;
  private t2History: Float64Array;
  private w2History: Float64Array;
  private writeIdx = 0;
  private filled = false;
  private readonly sampleRate: number;

  constructor(
    private readonly maxSamples: number,
    dt: number,
    stepsPerFrame: number,
  ) {
    this.t1History = new Float64Array(maxSamples);
    this.w1History = new Float64Array(maxSamples);
    this.t2History = new Float64Array(maxSamples);
    this.w2History = new Float64Array(maxSamples);
    this.sampleRate = 1 / (dt * stepsPerFrame);
  }

  reset(): void {
    this.writeIdx = 0;
    this.filled = false;
  }

  addSample(theta1: number, omega1: number, theta2: number, omega2: number): void {
    this.t1History[this.writeIdx] = theta1;
    this.w1History[this.writeIdx] = omega1;
    this.t2History[this.writeIdx] = theta2;
    this.w2History[this.writeIdx] = omega2;
    this.writeIdx++;
    if (this.writeIdx >= this.maxSamples) {
      this.writeIdx = 0;
      this.filled = true;
    }
  }

  analyze(): FrequencyAnalysis {
    const n = this.filled ? this.maxSamples : this.writeIdx;
    if (n < 256) {
      return { isPeriodic: false, period: null, confidence: 0, dominantFreq: null };
    }

    const t1 = this.filled ? this.t1History : this.t1History.subarray(0, n);
    const w1 = this.filled ? this.w1History : this.w1History.subarray(0, n);
    const t2 = this.filled ? this.t2History : this.t2History.subarray(0, n);
    const w2 = this.filled ? this.w2History : this.w2History.subarray(0, n);

    // Analyze each phase space dimension separately and combine results
    const analyses = [
      this.analyzeDimension(t1, 'theta1'),
      this.analyzeDimension(w1, 'omega1'),
      this.analyzeDimension(t2, 'theta2'),
      this.analyzeDimension(w2, 'omega2'),
    ];

    // Find the dimension with the strongest periodic signal
    const best = analyses.reduce((a, b) => (a.confidence > b.confidence ? a : b));

    // Also check if multiple dimensions agree on periodicity
    const periodicCount = analyses.filter((a) => a.isPeriodic).length;
    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;

    // Require at least 2 dimensions to show periodicity for high confidence
    const isPeriodic = best.confidence > 0.3 && (periodicCount >= 2 || best.confidence > 0.6);
    const confidence = Math.min(1, best.confidence * 0.7 + avgConfidence * 0.3);

    return {
      isPeriodic,
      period: isPeriodic ? best.period : null,
      confidence,
      dominantFreq: isPeriodic ? best.dominantFreq : null,
    };
  }

  private analyzeDimension(
    data: Float64Array,
    _name: string,
  ): { isPeriodic: boolean; period: number | null; confidence: number; dominantFreq: number | null } {
    // Center the data
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const centered = new Float64Array(data.length);
    for (let i = 0; i < data.length; i++) {
      centered[i] = data[i] - mean;
    }

    // Apply window and pad to power of 2
    const windowed = applyHannWindow(centered);
    const padded = padToPowerOf2(windowed);

    // Compute FFT
    const spectrum = magnitudeSpectrum(fft(padded));
    const halfLen = spectrum.length;

    // Find peaks in the spectrum (excluding DC component)
    const peaks = this.findSpectrumPeaks(spectrum, halfLen);

    if (peaks.length === 0) {
      return { isPeriodic: false, period: null, confidence: 0, dominantFreq: null };
    }

    const dominantPeak = peaks[0];
    const freqResolution = this.sampleRate / padded.length;
    const dominantFreq = dominantPeak.bin * freqResolution;
    const period = dominantFreq > 0 ? 1 / dominantFreq : null;

    // Calculate signal-to-noise ratio as confidence
    const totalPower = spectrum.reduce((sum, val) => sum + val * val, 0);
    const signalPower = dominantPeak.height * dominantPeak.height;
    const snr = totalPower > 0 ? signalPower / totalPower : 0;

    // Confidence based on SNR and peak prominence
    const confidence = Math.min(1, snr * 3 + dominantPeak.prominence * 0.5);
    const isPeriodic = confidence > 0.25 && dominantPeak.prominence > 0.3;

    return {
      isPeriodic,
      period,
      confidence,
      dominantFreq,
    };
  }

  private findSpectrumPeaks(
    spectrum: Float64Array,
    halfLen: number,
  ): Array<{ bin: number; height: number; prominence: number }> {
    const peaks: Array<{ bin: number; height: number; prominence: number }> = [];

    // Skip DC bin (0) and very low frequencies
    const minBin = 2;
    const maxBin = halfLen - 1;

    for (let i = minBin; i < maxBin; i++) {
      if (spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i + 1]) {
        // Calculate prominence relative to local background
        const localWindow = 5;
        const leftBg = Math.min(
          ...Array.from({ length: localWindow }, (_, j) => spectrum[Math.max(0, i - j - 1)]),
        );
        const rightBg = Math.min(
          ...Array.from({ length: localWindow }, (_, j) => spectrum[Math.min(halfLen - 1, i + j + 1)]),
        );
        const background = Math.max(leftBg, rightBg);
        const prominence = spectrum[i] - background;

        if (prominence > 0) {
          peaks.push({ bin: i, height: spectrum[i], prominence: prominence / spectrum[i] });
        }
      }
    }

    peaks.sort((a, b) => b.height - a.height);
    return peaks.slice(0, 3);
  }
}
