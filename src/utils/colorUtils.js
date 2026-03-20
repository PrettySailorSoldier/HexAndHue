import { 
  converter, 
  formatHex, 
  wcagContrast, 
  differenceEuclidean, 
  random, 
  displayable 
} from 'culori';

const oklch = converter('oklch');

export const toOklch = (color) => {
  const c = oklch(color);
  // Ensure values are numbers and handle undefined hues
  // Use ?? instead of || because 0 is valid for all channels
  return {
    mode: 'oklch',
    l: c.l ?? 0,
    c: c.c ?? 0,
    h: c.h ?? 0
  };
};

export const oklchToHex = (color) => {
  try {
    return formatHex(color);
  } catch (e) {
    return '#000000';
  }
};

export const generateMoodPalette = (mood, baseColor) => {
  const base = toOklch(baseColor);

  // Each mood defines: [{ hueOffset, lightnessAdjust, chromaMultiplier }, ...]
  // This creates truly distinct palettes, not just hue rotations
  const moodConfigs = {
    happy: [
      { h: 0, l: 0.05, c: 1.0 },      // Base, slightly brighter
      { h: 40, l: 0.1, c: 1.1 },      // Warm yellow-orange
      { h: 60, l: 0.15, c: 0.9 },     // Sunny yellow
      { h: 20, l: -0.05, c: 1.2 },    // Warm orange
      { h: 330, l: 0, c: 0.8 },       // Soft pink accent
    ],
    calm: [
      { h: 200, l: 0, c: 0.7 },       // Soft blue
      { h: 180, l: 0.1, c: 0.6 },     // Cyan-teal
      { h: 220, l: -0.05, c: 0.8 },   // Deeper blue
      { h: 160, l: 0.15, c: 0.5 },    // Soft seafoam
      { h: 240, l: -0.1, c: 0.6 },    // Muted violet
    ],
    energetic: [
      { h: 30, l: 0, c: 1.3 },        // Vibrant orange
      { h: 60, l: 0.05, c: 1.2 },     // Electric yellow
      { h: 0, l: -0.05, c: 1.4 },     // Punchy red
      { h: 150, l: 0.1, c: 1.1 },     // Bright green
      { h: 280, l: -0.1, c: 1.2 },    // Electric purple
    ],
    professional: [
      { h: 220, l: -0.1, c: 0.5 },    // Corporate blue
      { h: 210, l: 0.2, c: 0.3 },     // Light steel blue
      { h: 230, l: -0.2, c: 0.4 },    // Navy accent
      { h: 200, l: 0.3, c: 0.15 },    // Near-neutral light
      { h: 215, l: -0.3, c: 0.2 },    // Charcoal blue
    ],
    romantic: [
      { h: 350, l: 0.1, c: 0.8 },     // Soft rose
      { h: 330, l: 0.15, c: 0.6 },    // Blush pink
      { h: 20, l: 0.05, c: 0.7 },     // Warm peach
      { h: 280, l: 0, c: 0.5 },       // Dusty lavender
      { h: 0, l: -0.1, c: 0.9 },      // Deep rose
    ],
    playful: [
      { h: 300, l: 0.05, c: 1.2 },    // Bright magenta
      { h: 180, l: 0.1, c: 1.1 },     // Cyan pop
      { h: 60, l: 0.15, c: 1.0 },     // Sunny yellow
      { h: 120, l: 0, c: 1.2 },       // Lime green
      { h: 30, l: -0.05, c: 1.3 },    // Tangerine
    ],
    natural: [
      { h: 90, l: -0.1, c: 0.7 },     // Forest green
      { h: 60, l: 0.05, c: 0.5 },     // Olive
      { h: 30, l: -0.15, c: 0.6 },    // Warm brown
      { h: 120, l: 0.1, c: 0.6 },     // Fresh leaf
      { h: 45, l: 0.2, c: 0.4 },      // Sand/cream
    ],
    passionate: [
      { h: 0, l: -0.1, c: 1.4 },      // Deep red
      { h: 350, l: -0.15, c: 1.3 },   // Crimson
      { h: 20, l: 0, c: 1.2 },        // Fiery orange
      { h: 330, l: -0.2, c: 1.1 },    // Wine
      { h: 280, l: -0.15, c: 1.0 },   // Royal purple
    ],
  };

  const config = moodConfigs[mood] || moodConfigs.happy;

  return config.map(({ h, l, c }) => ({
    mode: 'oklch',
    l: Math.max(0.15, Math.min(0.95, base.l + l)),
    c: Math.max(0.02, Math.min(0.35, base.c * c)),
    h: ((base.h + h) % 360 + 360) % 360
  }));
};

export const generateRandomHarmony = ({ count = 5 }) => {
  const base = { mode: 'oklch', l: 0.6 + Math.random() * 0.2, c: 0.1 + Math.random() * 0.1, h: Math.random() * 360 };
  return getAnalogous(base, count, 30);
};

export const getComplementary = (color, options = {}) => {
  const { withLightnessSpread = false } = options;
  const c = toOklch(color);

  if (!withLightnessSpread) {
    return [
      c,
      { ...c, h: (c.h + 180) % 360 }
    ];
  }

  // N=1 companion: flip lightness
  const sourceL = c.l;
  let companionL = 1.0 - sourceL;
  if (Math.abs(companionL - sourceL) < 0.15) {
    companionL = Math.max(0.15, Math.min(0.90, companionL));
  }
  let companionC = c.c;
  if (companionL < 0.25) companionC *= 0.85;
  else if (companionL > 0.80) companionC *= 0.70;

  return [
    c,
    { ...c, h: (c.h + 180) % 360, l: companionL, c: companionC }
  ];
};

export const getSplitComplementary = (color, options = {}) => {
  const { withLightnessSpread = false } = options;
  const c = toOklch(color);

  if (!withLightnessSpread) {
    return [
      c,
      { ...c, h: (c.h + 150) % 360 },
      { ...c, h: (c.h + 210) % 360 }
    ];
  }

  const sourceL = c.l;
  const l0 = Math.max(0.12, Math.min(0.45, sourceL - 0.25));
  const l1 = Math.max(0.55, Math.min(0.90, sourceL + 0.25));
  const adjC = (l) => l < 0.25 ? c.c * 0.85 : l > 0.80 ? c.c * 0.70 : c.c;

  return [
    c,
    { ...c, h: (c.h + 150) % 360, l: l0, c: adjC(l0) },
    { ...c, h: (c.h + 210) % 360, l: l1, c: adjC(l1) }
  ];
};

export const getTriadic = (color, options = {}) => {
  const { withLightnessSpread = false } = options;
  const c = toOklch(color);

  if (!withLightnessSpread) {
    return [
      c,
      { ...c, h: (c.h + 120) % 360 },
      { ...c, h: (c.h + 240) % 360 }
    ];
  }

  const sourceL = c.l;
  const l0 = Math.max(0.12, Math.min(0.45, sourceL - 0.25));
  const l1 = Math.max(0.55, Math.min(0.90, sourceL + 0.25));
  const adjC = (l) => l < 0.25 ? c.c * 0.85 : l > 0.80 ? c.c * 0.70 : c.c;

  return [
    c,
    { ...c, h: (c.h + 120) % 360, l: l0, c: adjC(l0) },
    { ...c, h: (c.h + 240) % 360, l: l1, c: adjC(l1) }
  ];
};

export const getTetradic = (color, options = {}) => {
  const { withLightnessSpread = false } = options;
  const c = toOklch(color);

  if (!withLightnessSpread) {
    return [
      c,
      { ...c, h: (c.h + 90) % 360 },
      { ...c, h: (c.h + 180) % 360 },
      { ...c, h: (c.h + 270) % 360 }
    ];
  }

  const sourceL = c.l;
  const l0 = Math.max(0.10, Math.min(0.40, sourceL - 0.30));
  const l1 = sourceL;
  const l2 = Math.max(0.60, Math.min(0.92, sourceL + 0.30));
  const adjC = (l) => l < 0.25 ? c.c * 0.85 : l > 0.80 ? c.c * 0.70 : c.c;

  return [
    c,
    { ...c, h: (c.h + 90) % 360, l: l0, c: adjC(l0) },
    { ...c, h: (c.h + 180) % 360, l: l1, c: adjC(l1) },
    { ...c, h: (c.h + 270) % 360, l: l2, c: adjC(l2) }
  ];
};

export const getAnalogous = (color, count = 5, slice = 30, options = {}) => {
  const { withLightnessSpread = false } = options;
  const c = toOklch(color);

  // Generate base colors with hue offsets (same as before)
  const base = Array.from({ length: count }, (_, i) => {
    // Distribute colors evenly across the full slice range
    // For count=5, slice=30: positions are -15, -7.5, 0, 7.5, 15
    const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * slice;
    return {
      ...c,
      h: ((c.h + offset) % 360 + 360) % 360
    };
  });

  if (!withLightnessSpread) return base;

  // Source is at the middle index
  const sourceIdx = Math.floor((count - 1) / 2);
  const sourceL = c.l;
  const N = count - 1; // companion count

  // Distribute N lightness values evenly from (sourceL-0.30) to (sourceL+0.30)
  const lMin = Math.max(0.10, Math.min(0.92, sourceL - 0.30));
  const lMax = Math.max(0.10, Math.min(0.92, sourceL + 0.30));
  const companionLs = Array.from({ length: N }, (_, i) => {
    const t = N === 1 ? 0.5 : i / (N - 1);
    return lMin + t * (lMax - lMin);
  });

  const adjC = (l) => l < 0.25 ? c.c * 0.85 : l > 0.80 ? c.c * 0.70 : c.c;

  let companionIdx = 0;
  const withLightness = base.map((col, i) => {
    if (i === sourceIdx) return { ...col, l: sourceL };
    const l = companionLs[companionIdx++];
    return { ...col, l, c: adjC(l) };
  });

  // Sort by lightness ascending for display order
  return withLightness.sort((a, b) => a.l - b.l);
};

export const getMonochromatic = (color, count = 5, options = {}) => {
  const c = toOklch(color);
  // Monochromatic ignores withLightnessSpread — always varies lightness by definition
  const colors = Array.from({ length: count }, (_, i) => ({
    ...c,
    l: Math.max(0, Math.min(1, c.l - 0.4 + (i * 0.8 / (count - 1))))
  }));

  // Ensure span >= 0.60
  const lValues = colors.map(col => col.l);
  const span = Math.max(...lValues) - Math.min(...lValues);
  if (span < 0.60) {
    const from = Math.max(0.10, Math.min(0.90, c.l - 0.30));
    const to = Math.max(0.10, Math.min(0.90, c.l + 0.30));
    return Array.from({ length: count }, (_, i) => ({
      ...c,
      l: Math.max(0, Math.min(1, count === 1 ? from : from + (i * (to - from) / (count - 1))))
    }));
  }

  return colors;
};

export { wcagContrast };
