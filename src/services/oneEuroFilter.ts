/**
 * 1€ Filter (One Euro Filter)
 * Designed for real-time human-computer interaction, AR head tracking, and facial landmark smoothing.
 * Casiez, Roussel, Vogel (ACM CHI 2012).
 *
 * Characteristics:
 * - Low speed (holding still) -> High filtering -> Zero sensor micro-jitter.
 * - High speed (moving, turning head, speaking) -> High cutoff -> Zero lag (0ms delay).
 */
export class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  constructor(private alpha: number = 0.5) {}

  public filter(val: number, alpha?: number): number {
    if (alpha !== undefined) this.alpha = alpha;
    if (this.y === null || this.s === null) {
      this.s = val;
      this.y = val;
      return val;
    }
    this.s = this.alpha * val + (1.0 - this.alpha) * this.s;
    this.y = this.s;
    return this.y;
  }

  public last(): number {
    return this.y ?? 0;
  }

  public reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTime: number | null = null;

  constructor(
    private minCutoff: number = 1.0, // Minimum cutoff frequency in Hz (stability at rest)
    private beta: number = 0.007,    // Cutoff slope adaptation with velocity (responsiveness)
    private dCutoff: number = 1.0    // Derivative cutoff frequency in Hz
  ) {
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  private alpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  public filter(val: number, timestamp: number = performance.now()): number {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      return this.xFilter.filter(val);
    }

    const dt = Math.max(1e-3, (timestamp - this.lastTime) / 1000.0);
    this.lastTime = timestamp;
    const rate = 1.0 / dt;

    // Estimate derivative (velocity)
    const prevX = this.xFilter.last();
    const dx = (val - prevX) * rate;
    const edx = this.dxFilter.filter(dx, this.alpha(rate, this.dCutoff));

    // Dynamic cutoff frequency based on velocity
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(val, this.alpha(rate, cutoff));
  }

  public reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

export class OneEuroFilter3D {
  private xF: OneEuroFilter;
  private yF: OneEuroFilter;
  private zF: OneEuroFilter;

  constructor(minCutoff: number = 1.0, beta: number = 0.007, dCutoff: number = 1.0) {
    this.xF = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.yF = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.zF = new OneEuroFilter(minCutoff, beta, dCutoff);
  }

  public filter(
    x: number,
    y: number,
    z: number,
    timestamp: number = performance.now()
  ): { x: number; y: number; z: number } {
    return {
      x: this.xF.filter(x, timestamp),
      y: this.yF.filter(y, timestamp),
      z: this.zF.filter(z, timestamp),
    };
  }

  public reset(): void {
    this.xF.reset();
    this.yF.reset();
    this.zF.reset();
  }
}
