// gradientEngine.js — Vibe-Aware Gradient Intelligence
// ============================================================================
// This engine solves the core problems with naive gradient generation:
// 1. Chroma valley (muddy midpoints)
// 2. Hue path control (warm vs cool arc)
// 3. Lightness arcing (perceptually pleasing curves)
// 4. Vibe awareness (colors optimized for gradient behavior, not just harmony)
// ============================================================================

import { analyzeColorMood } from './vibeHarmony';

// ============================================================================
// 1. CORE INTERPOLATION — The foundation
// ============================================================================

/**
 * Interpolate hue with path control.
 * @param {number} h1 - Start hue (0-360)
 * @param {number} h2 - End hue (0-360)
 * @param {number} t - Interpolation factor (0-1)
 * @param {string} path - 'short' | 'long' | 'warm' | 'cool'
 * @returns {number} Interpolated hue
 */
export function interpolateHue(h1, h2, t, path = 'short') {
  // Normalize both hues to 0-360
  h1 = ((h1 % 360) + 360) % 360;
  h2 = ((h2 % 360) + 360) % 360;

  let diff = h2 - h1;

  switch (path) {
    case 'short':
      // Shortest arc (default CSS behavior)
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      break;

    case 'long':
      // Longest arc (goes the "wrong way" around the wheel)
      if (diff > 0 && diff < 180) diff -= 360;
      if (diff < 0 && diff > -180) diff += 360;
      break;

    case 'warm':
      // Arc through warm hues (red-orange-yellow zone: 0-60)
      // If the shortest path goes through cool, force it through warm
      {
        const shortDiff = diff > 180 ? diff - 360 : (diff < -180 ? diff + 360 : diff);
        const midpoint = normalizeHue(h1 + shortDiff / 2);

        // Check if midpoint is in cool zone (170-280)
        if (midpoint > 170 && midpoint < 280) {
          // Force through warm by going the long way
          if (diff > 0 && diff < 180) diff -= 360;
          if (diff < 0 && diff > -180) diff += 360;
        }
      }
      break;

    case 'cool':
      // Arc through cool hues (blue-violet zone: 210-280)
      {
        const shortDiff = diff > 180 ? diff - 360 : (diff < -180 ? diff + 360 : diff);
        const midpoint = normalizeHue(h1 + shortDiff / 2);

        // Check if midpoint is in warm zone (330-60)
        const inWarm = midpoint > 330 || midpoint < 60;
        if (inWarm) {
          // Force through cool by going the long way
          if (diff > 0 && diff < 180) diff -= 360;
          if (diff < 0 && diff > -180) diff += 360;
        }
      }
      break;
  }

  return normalizeHue(h1 + diff * t);
}

/**
 * Interpolate between two OKLCH colors with full control.
 * @param {Object} colorA - Start color { l, c, h, mode: 'oklch' }
 * @param {Object} colorB - End color { l, c, h, mode: 'oklch' }
 * @param {number} steps - Number of intermediate stops
 * @param {Object} options - { huePath, lightnessEase, chromaBoost }
 * @returns {Array} Array of OKLCH color objects
 */
export function interpolateOKLCH(colorA, colorB, steps = 3, options = {}) {
  const {
    huePath = 'short',
    lightnessEase = 'linear', // 'linear' | 'ease' | 'easeIn' | 'easeOut'
    chromaBoost = false
  } = options;

  const result = [];

  for (let i = 0; i <= steps + 1; i++) {
    const t = i / (steps + 1);

    // Apply easing to t for lightness
    const easedT = applyEasing(t, lightnessEase);

    const l = lerp(colorA.l ?? 0.5, colorB.l ?? 0.5, easedT);
    const h = interpolateHue(colorA.h ?? 0, colorB.h ?? 0, t, huePath);

    // Chroma: optionally boost at midpoint to prevent muddy valley
    let c;
    if (chromaBoost && t > 0.2 && t < 0.8) {
      // Parabolic boost centered at t=0.5
      const boostFactor = 1 + 0.2 * Math.sin(t * Math.PI);
      c = lerp(colorA.c ?? 0.1, colorB.c ?? 0.1, t) * boostFactor;
    } else {
      c = lerp(colorA.c ?? 0.1, colorB.c ?? 0.1, t);
    }

    result.push({
      mode: 'oklch',
      l: clamp(l, 0, 1),
      c: clamp(c, 0, 0.4),
      h: h
    });
  }

  return result;
}


// ============================================================================
// 2. GRADIENT OPTIMIZATION — Fix existing color arrays for gradient use
// ============================================================================

/**
 * Optimize an existing array of OKLCH colors for gradient use.
 * - Adds chroma boost stops at midpoints to prevent mud
 * - Generates intermediate hue stops along the chosen path
 *
 * @param {Array} colors - Array of OKLCH color objects
 * @param {Object} options - { huePath, boostChroma }
 * @returns {Array} Expanded array of OKLCH stops
 */
export function optimizeForGradient(colors, options = {}) {
  const {
    huePath = 'short',
    boostChroma = true,
    insertMidpoints = true
  } = options;

  if (colors.length < 2) return colors;

  const expanded = [];

  for (let i = 0; i < colors.length - 1; i++) {
    const a = colors[i];
    const b = colors[i + 1];

    expanded.push(a);

    if (!insertMidpoints) continue;

    // Calculate hue distance to determine if we need intermediate stops
    const hueDist = getHueDistance(a.h ?? 0, b.h ?? 0, huePath);
    const chromaA = a.c ?? 0;
    const chromaB = b.c ?? 0;

    // Collect intermediate stops and sort by position before adding
    const intermediateStops = [];

    // Add midpoint stop with chroma boost if both endpoints have chroma
    if (boostChroma && chromaA > 0.03 && chromaB > 0.03) {
      const midL = (a.l + b.l) / 2;
      // Boost chroma above both endpoints to prevent valley
      const midC = Math.max(chromaA, chromaB) * 1.15;
      const midH = interpolateHue(a.h ?? 0, b.h ?? 0, 0.5, huePath);

      intermediateStops.push({
        position: 0.5,
        color: {
          mode: 'oklch',
          l: midL,
          c: clamp(midC, 0, 0.35),
          h: midH
        }
      });
    }

    // For large hue jumps (>90°), add extra intermediate stops
    if (hueDist > 90) {
      const quarterH = interpolateHue(a.h ?? 0, b.h ?? 0, 0.25, huePath);
      const threeQuarterH = interpolateHue(a.h ?? 0, b.h ?? 0, 0.75, huePath);

      intermediateStops.push({
        position: 0.25,
        color: {
          mode: 'oklch',
          l: lerp(a.l, b.l, 0.25),
          c: lerp(chromaA, chromaB, 0.25) * (boostChroma ? 1.1 : 1),
          h: quarterH
        }
      });
      intermediateStops.push({
        position: 0.75,
        color: {
          mode: 'oklch',
          l: lerp(a.l, b.l, 0.75),
          c: lerp(chromaA, chromaB, 0.75) * (boostChroma ? 1.1 : 1),
          h: threeQuarterH
        }
      });
    }

    // Sort by position and add to expanded array in correct order
    intermediateStops.sort((x, y) => x.position - y.position);
    intermediateStops.forEach(stop => expanded.push(stop.color));
  }

  expanded.push(colors[colors.length - 1]);
  return expanded;
}


// ============================================================================
// 3. VIBE GRADIENT GENERATION — The main event
// ============================================================================

/**
 * Generate a vibe-matched gradient from a single base color.
 * This GENERATES colors specifically optimized for gradient behavior.
 *
 * @param {Object} baseColor - OKLCH color { l, c, h, mode: 'oklch' }
 * @param {Object} options - Generation options
 * @returns {Object} Gradient result with stops, style, mood info
 */
export function generateVibeGradient(baseColor, options = {}) {
  const {
    style = 'auto',
    stops = 3,
    huePath = 'auto'
  } = options;

  // Analyze the base color's mood
  const mood = analyzeColorMood(baseColor);

  // Determine gradient style if 'auto'
  const resolvedStyle = style === 'auto'
    ? mapMoodToGradientStyle(mood)
    : style;

  // Determine hue path if 'auto'
  const resolvedHuePath = huePath === 'auto'
    ? determineHuePath(baseColor, resolvedStyle)
    : huePath;

  // Generate the key stops based on style
  const keyStops = generateKeyStops(baseColor, mood, resolvedStyle, stops);

  // Expand stops to include midpoint chroma boosts
  const expandedStops = optimizeForGradient(keyStops, {
    huePath: resolvedHuePath,
    boostChroma: resolvedStyle !== 'atmospheric' && resolvedStyle !== 'noir'
  });

  return {
    stops: expandedStops,
    keyStops,
    style: resolvedStyle,
    mood: mood.mood,
    energy: mood.energy,
    temperature: mood.temperature,
    huePath: resolvedHuePath,
    description: getGradientDescription(resolvedStyle, mood)
  };
}

/**
 * Map a color's mood to the most appropriate gradient style.
 */
function mapMoodToGradientStyle(mood) {
  const moodToStyle = {
    moody: 'atmospheric',
    dreamy: 'dreamy',
    jewel: 'jewel',
    pop: 'pop',
    earthy: 'earthy',
    serene: 'atmospheric',
    ethereal: 'dreamy',
    noir: 'noir',
    botanical: 'botanical',
    balanced: 'chromatic-arc'  // Our signature style for versatile colors
  };

  return moodToStyle[mood.mood] || 'chromatic-arc';
}

/**
 * Determine the best hue path for a given style.
 */
function determineHuePath(baseColor, style) {
  const h = baseColor.h ?? 0;

  switch (style) {
    case 'earthy':
    case 'botanical':
      return 'warm';
    case 'dreamy':
    case 'serene':
      return 'cool';
    case 'chromatic-arc':
      // Choose path that creates most interesting journey
      return h > 180 ? 'warm' : 'cool';
    default:
      return 'short';
  }
}

/**
 * Generate key color stops for a gradient based on style.
 * This is where each style's unique character is defined.
 */
function generateKeyStops(baseColor, mood, style, stopCount) {
  const l = baseColor.l ?? 0.5;
  // Ensure minimum chroma for visible color gradients
  const c = Math.max(0.12, baseColor.c ?? 0.1);
  const h = baseColor.h ?? 0;

  const generators = {
    // ATMOSPHERIC: Base → desaturated midpoint → complementary at lower lightness
    // Feels like a sky at dusk
    atmospheric: () => {
      const stops = [{
        mode: 'oklch',
        l: Math.max(0.4, l),
        c: Math.max(0.1, c),
        h
      }];

      // Midpoint: slightly desaturated, shifted
      stops.push({
        mode: 'oklch',
        l: Math.max(0.35, l * 0.85),
        c: Math.max(0.06, c * 0.5),
        h: normalizeHue(h + 30)
      });

      // End: near-complement, darker
      stops.push({
        mode: 'oklch',
        l: Math.max(0.2, l - 0.2),
        c: Math.max(0.08, c * 0.7),
        h: normalizeHue(h + 150)
      });

      return stops;
    },

    // JEWEL: Deep, rich colors throughout. Velvet-like.
    jewel: () => {
      const stops = [
        { ...baseColor, l: Math.min(0.45, l), c: Math.max(0.15, c) }
      ];

      // Near-analogous with higher chroma
      stops.push({
        mode: 'oklch',
        l: Math.min(0.4, l - 0.05),
        c: Math.min(0.28, c * 1.3),
        h: normalizeHue(h + 35)
      });

      // Complement at same depth
      stops.push({
        mode: 'oklch',
        l: Math.min(0.42, l),
        c: Math.max(0.14, c * 0.9),
        h: normalizeHue(h + 180)
      });

      return stops;
    },

    // EARTHY: Warm analogous shifts, natural pigment feel
    earthy: () => {
      // Force hue toward warm earth tones (30-60 range)
      const warmBase = normalizeHue(30 + (h % 60));
      const stops = [
        { mode: 'oklch', l: Math.max(0.45, l), c: Math.max(0.1, Math.min(c, 0.18)), h: warmBase }
      ];

      // Warm shift (toward ochre/sienna zone)
      stops.push({
        mode: 'oklch',
        l: Math.min(0.65, l + 0.1),
        c: Math.max(0.08, c * 0.9),
        h: normalizeHue(warmBase + 20)
      });

      // Deeper earth tone
      stops.push({
        mode: 'oklch',
        l: Math.max(0.3, l - 0.15),
        c: Math.max(0.06, c * 0.6),
        h: normalizeHue(warmBase - 15)
      });

      return stops;
    },

    // DREAMY: Ethereal, light-to-lighter progression
    dreamy: () => {
      // Shift toward dreamy pastels (lavender/pink zone)
      const dreamHue = normalizeHue(280 + (h % 80));
      const stops = [{
        mode: 'oklch',
        l: Math.max(0.55, l),
        c: Math.max(0.08, c * 0.8),
        h: dreamHue
      }];

      // Shift toward lighter, softer
      stops.push({
        mode: 'oklch',
        l: Math.min(0.8, l + 0.2),
        c: Math.max(0.06, c * 0.6),
        h: normalizeHue(dreamHue + 40)
      });

      // Very light pastel
      stops.push({
        mode: 'oklch',
        l: 0.9,
        c: Math.max(0.04, c * 0.3),
        h: normalizeHue(dreamHue + 60)
      });

      return stops;
    },

    // POP: High energy, high chroma throughout
    pop: () => {
      const stops = [
        { ...baseColor, c: Math.max(0.18, c) }
      ];

      // Complement at equal chroma
      stops.push({
        mode: 'oklch',
        l: l + 0.05,
        c: Math.max(0.16, c * 0.95),
        h: normalizeHue(h + 180)
      });

      // Rotation away from complement
      stops.push({
        mode: 'oklch',
        l: l - 0.05,
        c: Math.max(0.15, c * 0.9),
        h: normalizeHue(h + 220)
      });

      return stops;
    },

    // NOIR: Dark, minimal, dramatic - but with visible color
    noir: () => {
      const stops = [{
        mode: 'oklch',
        l: 0.35,
        c: Math.max(0.06, Math.min(0.12, c)),
        h
      }];

      // Deep dark with subtle color
      stops.push({
        mode: 'oklch',
        l: 0.15,
        c: Math.max(0.03, c * 0.4),
        h: normalizeHue(h + 20)
      });

      // Dark complement accent
      stops.push({
        mode: 'oklch',
        l: 0.25,
        c: Math.max(0.05, c * 0.5),
        h: normalizeHue(h + 180)
      });

      return stops;
    },

    // BOTANICAL: Green-yellow arc, organic feel
    botanical: () => {
      // Force into green zone (100-140)
      const greenBase = normalizeHue(100 + (h % 50));

      const stops = [{
        mode: 'oklch',
        l: Math.max(0.45, l),
        c: Math.max(0.1, Math.min(c, 0.2)),
        h: greenBase
      }];

      // Yellow-green shift
      stops.push({
        mode: 'oklch',
        l: Math.min(0.65, l + 0.15),
        c: Math.max(0.12, c),
        h: normalizeHue(greenBase - 25)
      });

      // Deep forest anchor
      stops.push({
        mode: 'oklch',
        l: Math.max(0.3, l - 0.15),
        c: Math.max(0.08, c * 0.7),
        h: normalizeHue(greenBase + 20)
      });

      return stops;
    },

    // CHROMATIC-ARC: Signature feature — perceptually consistent hue journey
    // Arcs through 3-4 distinct hues while keeping chroma and lightness stable
    'chromatic-arc': () => {
      const arcLength = stopCount >= 4 ? 120 : 90;
      const stops = [];

      for (let i = 0; i < stopCount; i++) {
        const t = i / (stopCount - 1);

        // Hue arcs smoothly across a range
        const hueOffset = arcLength * t - arcLength / 2;
        const targetHue = normalizeHue(h + hueOffset);

        // Lightness stays consistent with gentle wave
        const lightWave = Math.sin(t * Math.PI) * 0.05;
        const targetL = clamp(Math.max(0.45, l) + lightWave, 0.3, 0.75);

        // Ensure visible chroma throughout
        const chromaWave = 1 + Math.abs(t - 0.5) * 0.2;
        const targetC = Math.max(0.12, clamp(c * chromaWave, 0.1, 0.28));

        stops.push({
          mode: 'oklch',
          l: targetL,
          c: targetC,
          h: targetHue
        });
      }

      return stops;
    }
  };

  const generator = generators[style] || generators['chromatic-arc'];
  return generator();
}

/**
 * Get human-readable description of the gradient style.
 */
function getGradientDescription(style, mood) {
  const descriptions = {
    atmospheric: 'A moody gradient that fades from vivid to muted, like a sky at dusk',
    jewel: 'Rich, deep colors that maintain luxurious intensity throughout',
    earthy: 'Natural warm tones with organic pigment-like transitions',
    dreamy: 'Ethereal progression from color to light, like morning mist',
    pop: 'High-energy colors that maintain vibrancy across the spectrum',
    noir: 'Dramatic dark tones with subtle hue undertones',
    botanical: 'Organic greens and natural earth tones',
    'chromatic-arc': 'A signature gradient that travels through hue space while keeping depth and energy consistent — the kind of gradient you don\'t see elsewhere'
  };

  return descriptions[style] || descriptions['chromatic-arc'];
}


// ============================================================================
// 4. GRADIENT PRESETS — Quick access to common styles
// ============================================================================

/**
 * Get all available gradient styles with preview info.
 */
export function getGradientStyles() {
  return [
    {
      id: 'chromatic-arc',
      name: 'Chromatic Arc',
      description: 'Signature hue journey',
      isSignature: true
    },
    { id: 'atmospheric', name: 'Atmospheric', description: 'Dusk-like fade' },
    { id: 'jewel', name: 'Jewel', description: 'Deep luxurious' },
    { id: 'dreamy', name: 'Dreamy', description: 'Ethereal mist' },
    { id: 'earthy', name: 'Earthy', description: 'Natural pigment' },
    { id: 'pop', name: 'Pop', description: 'High energy' },
    { id: 'noir', name: 'Noir', description: 'Dark dramatic' },
    { id: 'botanical', name: 'Botanical', description: 'Organic greens' }
  ];
}

/**
 * Generate a preview gradient for a style option.
 * Returns a CSS gradient string for quick display.
 */
export function generateStylePreview(baseColor, style) {
  const result = generateVibeGradient(baseColor, { style, stops: 3 });
  return stopsToCSS(result.stops, 90, 'linear');
}


// ============================================================================
// 5. CSS OUTPUT — Convert stops to usable CSS
// ============================================================================

/**
 * Convert OKLCH stops to CSS gradient string.
 * Includes both oklch() for modern browsers and hex fallback.
 */
export function stopsToCSS(stops, angle = 90, type = 'linear') {
  // Generate oklch stops
  const oklchStops = stops.map((stop, i) => {
    const percent = (i / (stops.length - 1)) * 100;
    const l = (stop.l ?? 0.5).toFixed(3);
    const c = (stop.c ?? 0.1).toFixed(3);
    const h = Math.round(stop.h ?? 0);
    return `oklch(${l} ${c} ${h}) ${percent.toFixed(0)}%`;
  }).join(', ');

  if (type === 'linear') {
    return `linear-gradient(${angle}deg in oklch, ${oklchStops})`;
  } else if (type === 'radial') {
    return `radial-gradient(circle in oklch, ${oklchStops})`;
  } else {
    return `conic-gradient(from ${angle}deg in oklch, ${oklchStops})`;
  }
}

/**
 * Convert OKLCH stops to hex fallback CSS.
 */
export function stopsToHexCSS(stops, angle = 90, type = 'linear', oklchToHex) {
  const hexStops = stops.map((stop, i) => {
    const percent = (i / (stops.length - 1)) * 100;
    const hex = oklchToHex(stop);
    return `${hex} ${percent.toFixed(0)}%`;
  }).join(', ');

  if (type === 'linear') {
    return `linear-gradient(${angle}deg, ${hexStops})`;
  } else if (type === 'radial') {
    return `radial-gradient(circle, ${hexStops})`;
  } else {
    return `conic-gradient(from ${angle}deg, ${hexStops})`;
  }
}

/**
 * Generate full CSS output with comments and fallback.
 */
export function generateFullCSS(stops, angle, type, oklchToHex) {
  const hexCSS = stopsToHexCSS(stops, angle, type, oklchToHex);
  const oklchCSS = stopsToCSS(stops, angle, type);

  return `/* hex fallback */
background: ${hexCSS};
/* oklch — better color interpolation in modern browsers */
background: ${oklchCSS};`;
}


// ============================================================================
// 6. HELPER FUNCTIONS
// ============================================================================

function normalizeHue(hue) {
  return ((hue % 360) + 360) % 360;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function applyEasing(t, easing) {
  switch (easing) {
    case 'ease':
      // Slight S-curve
      return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'easeIn':
      return t * t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    default:
      return t;
  }
}

function getHueDistance(h1, h2, path) {
  h1 = normalizeHue(h1);
  h2 = normalizeHue(h2);

  let diff = Math.abs(h2 - h1);
  if (diff > 180) diff = 360 - diff;

  if (path === 'long') {
    return 360 - diff;
  }
  return diff;
}

/**
 * Bias a hue toward a target range.
 */
function biasTowardRange(hue, [rangeMin, rangeMax], strength) {
  const normalized = normalizeHue(hue);
  const rangeMid = (rangeMin + rangeMax) / 2;

  let diff = rangeMid - normalized;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return normalizeHue(normalized + diff * strength);
}
