// Grayscale -> 1-bit conversion with threshold and error-diffusion dithering.

// Each kernel: [dx, dy, weight] entries plus the divisor.
const KERNELS = {
  floyd: { div: 16, k: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
  jarvis: {
    div: 48,
    k: [[1, 0, 7], [2, 0, 5],
      [-2, 1, 3], [-1, 1, 5], [0, 1, 7], [1, 1, 5], [2, 1, 3],
      [-2, 2, 1], [-1, 2, 3], [0, 2, 5], [1, 2, 3], [2, 2, 1]],
  },
  stucki: {
    div: 42,
    k: [[1, 0, 8], [2, 0, 4],
      [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2],
      [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]],
  },
  atkinson: { div: 8, k: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
  burkes: { div: 32, k: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2]] },
  sierra: {
    div: 32,
    k: [[1, 0, 5], [2, 0, 3],
      [-2, 1, 2], [-1, 1, 4], [0, 1, 5], [1, 1, 4], [2, 1, 2],
      [-1, 2, 2], [0, 2, 3], [1, 2, 2]],
  },
  sierra2: { div: 16, k: [[1, 0, 4], [2, 0, 3], [-2, 1, 1], [-1, 1, 2], [0, 1, 3], [1, 1, 2], [2, 1, 1]] },
  sierraLite: { div: 4, k: [[1, 0, 2], [-1, 1, 1], [0, 1, 1]] },
};

export const DITHER_OPTIONS = [
  ['binary', 'Binary (threshold only)'],
  ['floyd', 'Floyd-Steinberg'],
  ['jarvis', 'Jarvis-Judice-Ninke'],
  ['stucki', 'Stucki'],
  ['atkinson', 'Atkinson'],
  ['burkes', 'Burkes'],
  ['sierra', 'Sierra'],
  ['sierra2', 'Sierra Two Row'],
  ['sierraLite', 'Sierra Lite'],
];

/**
 * RGBA pixels -> 1-bit array (1 = white).
 * opts: { threshold 0..255, invert, hsl, method, brightness -100..100, contrast -100..100, alphaBg 0|1 }
 */
export function toMono(rgba, w, h, opts = {}) {
  const threshold = opts.threshold ?? 128;
  const bright = (opts.brightness ?? 0) * 2.55;
  const c = (opts.contrast ?? 0) * 2.55;
  const contrast = (259 * (c + 255)) / (255 * (259 - c));
  const bgLevel = opts.alphaBg ? 255 : 0;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3] / 255;
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    // HSL lightness (what System.Drawing's GetBrightness returns) or plain RGB average.
    let v = opts.hsl ? (Math.max(r, g, b) + Math.min(r, g, b)) / 2 : (r + g + b) / 3;
    v = v * a + bgLevel * (1 - a);
    v = contrast * (v - 128) + 128 + bright;
    gray[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }

  const out = new Uint8Array(w * h);
  const kernel = KERNELS[opts.method];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = gray[i];
      const white = old >= threshold;
      out[i] = white !== !!opts.invert ? 1 : 0;
      if (!kernel) continue;
      const err = old - (white ? 255 : 0);
      for (const [dx, dy, wgt] of kernel.k) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny >= h) continue;
        gray[ny * w + nx] += (err * wgt) / kernel.div;
      }
    }
  }
  return out;
}
