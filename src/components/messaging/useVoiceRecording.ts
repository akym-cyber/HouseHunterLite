const VOICE_WAVE_POINT_COUNT = 50;
const WAVE_MIN = 15;
const WAVE_MAX = 85;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * ratio))
  );
  return sorted[index];
};

const smoothSeries = (values: number[], passes = 2): number[] => {
  let current = values;
  for (let pass = 0; pass < passes; pass += 1) {
    current = current.map((value, index) => {
      const prev = current[index - 1] ?? value;
      const next = current[index + 1] ?? value;
      return prev * 0.22 + value * 0.56 + next * 0.22;
    });
  }
  return current;
};

const normalizeSample = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  const source = value > 1 ? value / 100 : value;
  return clampNumber(source, 0, 1);
};

const resampleToWavePoints = (samples: number[], target: number): number[] => {
  if (samples.length === target) {
    return samples.slice();
  }

  if (samples.length < target) {
    return Array.from({ length: target }, (_, index) => {
      const position = (index / (target - 1)) * (samples.length - 1);
      const left = Math.floor(position);
      const right = Math.min(samples.length - 1, Math.ceil(position));
      const factor = position - left;
      const leftValue = samples[left] ?? 0;
      const rightValue = samples[right] ?? leftValue;
      return leftValue * (1 - factor) + rightValue * factor;
    });
  }

  const bucketSize = samples.length / target;
  return Array.from({ length: target }, (_, index) => {
    const start = Math.floor(index * bucketSize);
    const end = Math.max(start + 1, Math.floor((index + 1) * bucketSize));
    const bucket = samples.slice(start, end);
    if (bucket.length === 0) {
      return samples[Math.min(samples.length - 1, start)] ?? 0;
    }
    const peak = bucket.reduce((max, value) => Math.max(max, value), 0);
    const avg = bucket.reduce((sum, value) => sum + value, 0) / bucket.length;
    return peak * 0.62 + avg * 0.38;
  });
};

const buildDefaultSinePattern = (): number[] =>
  Array.from({ length: VOICE_WAVE_POINT_COUNT }, (_, index) => {
    const basePhase = (index / (VOICE_WAVE_POINT_COUNT - 1)) * Math.PI * 3.4;
    const harmonicPhase = basePhase * 1.7 + 0.6;
    const base = (Math.sin(basePhase) + 1) / 2;
    const harmonic = Math.sin(harmonicPhase) * 0.11;
    const amplitude = clampNumber(0.2 + base * 0.62 + harmonic, 0, 1);
    return Math.round(WAVE_MIN + amplitude * (WAVE_MAX - WAVE_MIN));
  });

export const buildVoiceWaveform = (samples: number[]): number[] => {
  if (samples.length === 0) {
    return buildDefaultSinePattern();
  }

  const normalizedSamples = samples.map(normalizeSample);
  const baseSeries = resampleToWavePoints(normalizedSamples, VOICE_WAVE_POINT_COUNT);

  const low = percentile(baseSeries, 0.1);
  const high = percentile(baseSeries, 0.95);
  const spread = Math.max(0.15, high - low);

  const normalizedSeries = baseSeries.map((value) =>
    clampNumber((value - low) / spread, 0, 1)
  );

  const accented = normalizedSeries.map((value, index) => {
    const prev = normalizedSeries[index - 1] ?? value;
    const next = normalizedSeries[index + 1] ?? value;
    const center = (prev + next) / 2;
    const transient = Math.abs(next - prev);
    const localContrast = (value - center) * 0.28;
    return clampNumber(value + localContrast + transient * 0.06, 0, 1);
  });

  const smoothed = smoothSeries(accented, 2);

  return smoothed.map((value) => {
    const shaped = Math.pow(clampNumber(value, 0, 1), 0.88);
    const height = WAVE_MIN + shaped * (WAVE_MAX - WAVE_MIN);
    return Math.round(clampNumber(height, WAVE_MIN, WAVE_MAX));
  });
};

