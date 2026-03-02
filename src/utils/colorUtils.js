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

export const getComplementary = (color) => {
  const c = toOklch(color);
  return [
    c,
    { ...c, h: (c.h + 180) % 360 }
  ];
};

export const getSplitComplementary = (color) => {
  const c = toOklch(color);
  return [
    c,
    { ...c, h: (c.h + 150) % 360 },
    { ...c, h: (c.h + 210) % 360 }
  ];
};

export const getTriadic = (color) => {
  const c = toOklch(color);
  return [
    c,
    { ...c, h: (c.h + 120) % 360 },
    { ...c, h: (c.h + 240) % 360 }
  ];
};

export const getTetradic = (color) => {
  const c = toOklch(color);
  return [
    c,
    { ...c, h: (c.h + 90) % 360 },
    { ...c, h: (c.h + 180) % 360 },
    { ...c, h: (c.h + 270) % 360 }
  ];
};

export const getAnalogous = (color, count = 5, slice = 30) => {
  const c = toOklch(color);
  return Array.from({ length: count }, (_, i) => {
    // Distribute colors evenly across the full slice range
    // For count=5, slice=30: positions are -15, -7.5, 0, 7.5, 15
    const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * slice;
    return {
      ...c,
      h: ((c.h + offset) % 360 + 360) % 360
    };
  });
};

export const getMonochromatic = (color, count = 5) => {
  const c = toOklch(color);
  return Array.from({ length: count }, (_, i) => ({
    ...c,
    l: Math.max(0, Math.min(1, c.l - 0.4 + (i * 0.8 / (count - 1))))
  }));
};

export { wcagContrast };
