// smartFill.js — Multi-Color Palette Completion Engine
// ============================================================================
// Takes a set of existing colors and generates artistically motivated fills.
// Unlike single-color harmony generators, this reads the WHOLE palette's story:
// its temperature bias, lightness spread, hue coverage, and energy character —
// then decides what's genuinely missing vs. what would be generic.
// ============================================================================

// ============================================================================
// 1. PALETTE CHARACTER ANALYSIS
// ============================================================================

/**
 * Analyze a multi-color palette holistically.
 * This is the intelligence that drives all fill decisions.
 *
 * @param {Object[]} colors - Array of OKLCH color objects { l, c, h, mode }
 * @returns {Object} Character analysis
 */
export function analyzePaletteCharacter(colors) {
  const valid = colors.filter(c => c && typeof c.l === 'number');
  if (!valid.length) return null;

  // Chromatic colors (non-neutral — significant enough hue to matter)
  const chromatic = valid.filter(c => (c.c ?? 0) > 0.04);

  // --- Hue center of gravity (circular mean) ---
  let hueCog = 0;
  if (chromatic.length > 0) {
    const sinSum = chromatic.reduce((a, c) => a + Math.sin((c.h ?? 0) * Math.PI / 180), 0);
    const cosSum = chromatic.reduce((a, c) => a + Math.cos((c.h ?? 0) * Math.PI / 180), 0);
    hueCog = norm360(Math.atan2(sinSum, cosSum) * 180 / Math.PI);
  }

  // --- Hue arc occupancy (12 arcs of 30° each) ---
  const hueArcs = Array(12).fill(0);
  chromatic.forEach(c => {
    const arc = Math.floor(norm360(c.h ?? 0) / 30) % 12;
    hueArcs[arc]++;
  });

  // --- Lightness stats ---
  const ls = valid.map(c => c.l ?? 0.5);
  const avgLightness = ls.reduce((a, b) => a + b, 0) / ls.length;
  const minLightness = Math.min(...ls);
  const maxLightness = Math.max(...ls);

  // --- Chroma stats ---
  const cs = valid.map(c => c.c ?? 0);
  const avgChroma = cs.reduce((a, b) => a + b, 0) / cs.length;
  const maxChroma = Math.max(...cs);

  // --- Temperature analysis ---
  const warmCount = chromatic.filter(c => {
    const h = norm360(c.h ?? 0);
    return h < 70 || h >= 330;
  }).length;
  const coolCount = chromatic.filter(c => {
    const h = norm360(c.h ?? 0);
    return h >= 170 && h < 280;
  }).length;
  const temperature =
    warmCount > coolCount * 1.5 ? 'warm' :
    coolCount > warmCount * 1.5 ? 'cool' : 'balanced';

  // --- Largest hue gap (where fills would bridge the most) ---
  const sortedHues = chromatic.map(c => norm360(c.h ?? 0)).sort((a, b) => a - b);
  let largestGap = { start: 0, end: 180, size: 360, mid: 180 };
  if (sortedHues.length >= 2) {
    let maxGapSize = 0;
    for (let i = 0; i < sortedHues.length; i++) {
      const isLast = i === sortedHues.length - 1;
      const nextHue = isLast ? sortedHues[0] : sortedHues[i + 1];
      const gapSize = isLast
        ? 360 - sortedHues[i] + sortedHues[0]
        : nextHue - sortedHues[i];
      if (gapSize > maxGapSize) {
        maxGapSize = gapSize;
        largestGap = {
          start: sortedHues[i],
          end: nextHue,
          size: gapSize,
          mid: norm360(sortedHues[i] + gapSize / 2),
        };
      }
    }
  }

  // --- Dominant hue (most represented arc) ---
  const dominantArcIdx = hueArcs.indexOf(Math.max(...hueArcs));
  const dominantHue = dominantArcIdx * 30 + 15; // center of that arc

  // --- Energy profile ---
  const energyProfile =
    avgChroma < 0.06 ? 'whisper' :
    avgChroma < 0.10 ? 'muted' :
    avgChroma < 0.15 ? 'moderate' :
    avgChroma < 0.20 ? 'vibrant' : 'electric';

  // --- Hue spread ---
  const occupiedArcs = hueArcs.filter(v => v > 0).length;
  const hueSpread =
    chromatic.length <= 1 ? 'mono' :
    largestGap.size > 200 ? 'tight' :
    largestGap.size > 100 ? 'moderate' : 'wide';

  return {
    hueArcs,
    hueCog,
    dominantHue,
    temperature,
    warmCount,
    coolCount,
    avgChroma,
    maxChroma,
    avgLightness,
    minLightness,
    maxLightness,
    lightnessRange: maxLightness - minLightness,
    hasAnchor: minLightness < 0.32,
    hasHighlight: maxLightness > 0.78,
    hasNeutral: cs.some(c => c < 0.04),
    hasPop: maxChroma > 0.18,
    energyProfile,
    hueSpread,
    largestGap,
    chromatic,
    all: valid,
    count: valid.length,
  };
}


// ============================================================================
// 2. STRATEGY SELECTION — What does this palette actually need?
// ============================================================================

/**
 * Select fill strategies based on palette character.
 * Priority order: structural gaps first, artistic distinction second.
 */
function selectStrategies(character, fillCount) {
  const {
    hasAnchor, hasHighlight, hasNeutral, hasPop,
    temperature, hueSpread, chromatic, energyProfile,
  } = character;

  const pool = [];

  // --- Tier 1: Structural fills ---
  // These prevent the palette from feeling incomplete
  if (!hasAnchor) pool.push('depth-anchor');
  if (!hasHighlight) pool.push('luminous-field');
  if (!hasNeutral) pool.push('tinted-neutral');

  // --- Tier 2: Artistic distinction ---
  // These are what separate a hand-crafted palette from a generic one

  // Temperature counterpoint: if warm-dominated, a cool accent (and vice versa)
  // This is intentionally restrained — not a clash, a counterpoint
  if (temperature === 'warm' && chromatic.length >= 2) {
    pool.push('cool-counterpoint');
  } else if (temperature === 'cool' && chromatic.length >= 2) {
    pool.push('warm-counterpoint');
  }

  // Off-complement: near-complement of the most saturated color
  // Using 150–170° offset, NOT 180° — more nuanced and less obvious
  if (chromatic.length >= 1 && hueSpread !== 'wide') {
    pool.push('off-complement');
  }

  // Gap bridge: find the largest hue gap and drop something inside it
  // at an artistically offset position (not the geometric midpoint)
  if (largestGapIsSignificant(character)) {
    pool.push('gap-bridge');
  }

  // --- Tier 3: Tonal depth ---
  // Takes existing color personality, shifts to different lightness
  if (chromatic.length >= 1) pool.push('tonal-echo');

  // --- Tier 4: Energy balance ---
  // If very muted, one pop. If very vibrant, one muted anchor.
  if (energyProfile === 'whisper' || energyProfile === 'muted') {
    pool.push('chroma-pop');
  } else if (energyProfile === 'electric') {
    pool.push('muted-anchor');
  }

  // --- Tier 5: Organic harmonics (always available as fallback) ---
  pool.push('organic-harmonic', 'organic-harmonic', 'organic-harmonic');

  // Remove duplicates, keep order, take only what we need
  const seen = new Set();
  const strategies = [];
  for (const s of pool) {
    if (!seen.has(s) || s === 'organic-harmonic') {
      seen.add(s);
      strategies.push(s);
    }
    if (strategies.length >= fillCount) break;
  }

  while (strategies.length < fillCount) {
    strategies.push('organic-harmonic');
  }

  return strategies;
}

function largestGapIsSignificant(character) {
  return character.hueSpread !== 'wide' && character.largestGap.size > 60;
}


// ============================================================================
// 3. STRATEGY EXECUTION — Generate the actual fill colors
// ============================================================================

function executeStrategy(strategy, character, existingColors, slotIndex, alreadyFilled) {
  const allUsed = [...existingColors, ...alreadyFilled];
  const usedHues = allUsed.filter(c => (c.c ?? 0) > 0.04).map(c => norm360(c.h ?? 0));

  switch (strategy) {

    case 'depth-anchor': {
      // Very dark color inheriting the palette's undertone.
      // Not just dark gray — a deep color with the right temperature.
      return {
        mode: 'oklch',
        l: clamp(0.13 + Math.random() * 0.10, 0.10, 0.28),
        c: clamp(character.avgChroma * (0.5 + Math.random() * 0.4), 0.01, 0.14),
        h: norm360(character.hueCog + (Math.random() - 0.5) * 25),
      };
    }

    case 'luminous-field': {
      // Very light, barely-tinted — a breath of air in the palette.
      // Slightly warm or cool depending on palette temperature.
      const hShift = character.temperature === 'cool' ? -10 : 15;
      return {
        mode: 'oklch',
        l: clamp(0.90 + Math.random() * 0.06, 0.88, 0.97),
        c: clamp(character.avgChroma * (0.10 + Math.random() * 0.10), 0.004, 0.035),
        h: norm360(character.hueCog + hShift + (Math.random() - 0.5) * 20),
      };
    }

    case 'tinted-neutral': {
      // A near-neutral that carries the palette's dominant undertone.
      // Light or dark based on what the palette is missing.
      const needsDark = character.avgLightness > 0.55;
      const baseLightness = needsDark
        ? 0.15 + Math.random() * 0.12
        : 0.82 + Math.random() * 0.10;
      return {
        mode: 'oklch',
        l: baseLightness,
        c: clamp(0.01 + Math.random() * 0.02, 0.008, 0.03),
        h: norm360(character.hueCog + (Math.random() - 0.5) * 30),
      };
    }

    case 'cool-counterpoint': {
      // A restrained cool accent in a warm palette.
      // The key: it's NOT a harsh complement — it's a cool note that adds life.
      // Blue-adjacent (200–260°) but matched to the palette's energy level.
      const targetH = avoidClumping(
        norm360(190 + Math.random() * 70),  // 190–260° range
        usedHues, 30
      );
      return {
        mode: 'oklch',
        l: clamp(character.avgLightness + (Math.random() - 0.5) * 0.25, 0.32, 0.78),
        c: clamp(character.avgChroma * (0.65 + Math.random() * 0.5), 0.06, 0.20),
        h: targetH,
      };
    }

    case 'warm-counterpoint': {
      // A warm note in a cool palette.
      // Orange-adjacent (20–55°) at the palette's energy level.
      const targetH = avoidClumping(
        norm360(20 + Math.random() * 40),  // 20–60° range
        usedHues, 30
      );
      return {
        mode: 'oklch',
        l: clamp(character.avgLightness + (Math.random() - 0.5) * 0.25, 0.32, 0.78),
        c: clamp(character.avgChroma * (0.65 + Math.random() * 0.5), 0.06, 0.20),
        h: targetH,
      };
    }

    case 'off-complement': {
      // Near-complement of the most saturated existing color.
      // Using 152–172° offset instead of 180° — less obvious, more interesting.
      const anchor = character.chromatic.reduce((a, b) =>
        ((b.c ?? 0) > (a.c ?? 0)) ? b : a
      );
      const offset = 152 + Math.random() * 22;
      const targetH = avoidClumping(
        norm360((anchor.h ?? 0) + offset + (Math.random() - 0.5) * 12),
        usedHues, 22
      );
      // Lightness shifts away from the anchor to create contrast
      const lShift = (anchor.l ?? 0.5) > 0.5
        ? -(0.15 + Math.random() * 0.18)
        : (0.15 + Math.random() * 0.18);
      return {
        mode: 'oklch',
        l: clamp((anchor.l ?? 0.5) + lShift, 0.22, 0.84),
        c: clamp((anchor.c ?? 0.1) * (0.75 + Math.random() * 0.55), 0.06, 0.24),
        h: targetH,
      };
    }

    case 'gap-bridge': {
      // Bridges the largest hue gap, but NOT at the exact midpoint.
      // Offset toward the more interesting edge (slight golden-ratio-ish nudge).
      const gap = character.largestGap;
      // Place slightly off-center (33–67% into the gap, not 50%)
      const gapPosition = 0.33 + Math.random() * 0.34;
      const rawHue = norm360(gap.start + gap.size * gapPosition);
      const targetH = avoidClumping(rawHue, usedHues, 20);
      return {
        mode: 'oklch',
        l: clamp(character.avgLightness + (Math.random() - 0.5) * 0.30, 0.28, 0.82),
        c: clamp(character.avgChroma * (0.75 + Math.random() * 0.65), 0.05, 0.24),
        h: targetH,
      };
    }

    case 'tonal-echo': {
      // Take one of the most distinctive existing colors and echo its
      // personality at a very different lightness level.
      // Same DNA, completely different visual weight.
      const sourceIdx = slotIndex % Math.max(1, character.chromatic.length);
      const source = character.chromatic[sourceIdx];
      const sourceL = source.l ?? 0.5;
      // Go to the opposite end of the lightness spectrum
      const targetL = sourceL > 0.5
        ? clamp(0.18 + Math.random() * 0.14, 0.15, 0.35) // Echo as a dark
        : clamp(0.72 + Math.random() * 0.16, 0.70, 0.90); // Echo as a light
      // Darks can hold more chroma than lights in OKLCH
      const chromaScale = targetL < 0.35 ? 0.80 : 0.55;
      return {
        mode: 'oklch',
        l: targetL,
        c: clamp((source.c ?? 0.1) * chromaScale, 0.02, 0.22),
        h: norm360((source.h ?? 0) + (Math.random() - 0.5) * 18),
      };
    }

    case 'chroma-pop': {
      // One saturated accent to lift a muted palette.
      // Uses a hue that's present in the palette but turned up.
      const source = character.chromatic[0] ?? { l: 0.5, c: 0.08, h: character.hueCog };
      const targetH = avoidClumping(
        norm360((source.h ?? character.hueCog) + (Math.random() - 0.5) * 40),
        usedHues, 25
      );
      return {
        mode: 'oklch',
        l: clamp(0.50 + (Math.random() - 0.5) * 0.20, 0.38, 0.70),
        c: clamp(Math.max(character.maxChroma * 1.4, 0.18), 0.15, 0.28),
        h: targetH,
      };
    }

    case 'muted-anchor': {
      // A soft, low-chroma color to ground a very vibrant palette.
      const targetH = norm360(character.hueCog + (Math.random() - 0.5) * 40);
      return {
        mode: 'oklch',
        l: clamp(character.avgLightness + (Math.random() - 0.5) * 0.25, 0.30, 0.78),
        c: clamp(character.avgChroma * (0.15 + Math.random() * 0.20), 0.01, 0.07),
        h: targetH,
      };
    }

    case 'organic-harmonic':
    default: {
      // Golden-angle distribution from the hue center of gravity.
      // Avoids the mechanical feel of fixed hue offsets.
      const goldenAngle = 137.508;
      const iteration = slotIndex + alreadyFilled.length + 1;
      const rawHue = norm360(character.hueCog + goldenAngle * iteration + (Math.random() - 0.5) * 22);
      const targetH = avoidClumping(rawHue, usedHues, 25);
      return {
        mode: 'oklch',
        l: clamp(character.avgLightness + (Math.random() - 0.5) * 0.32, 0.22, 0.88),
        c: clamp(character.avgChroma * (0.65 + Math.random() * 0.75), 0.04, 0.26),
        h: targetH,
      };
    }
  }
}


// ============================================================================
// 4. MAIN ENTRY POINT
// ============================================================================

/**
 * Fill a palette to the target size using artistically motivated strategies.
 *
 * @param {Object[]} existingColors - OKLCH colors already in the palette
 * @param {number} targetTotal - Desired total palette size
 * @param {Object} options
 * @param {boolean} options.preserveOrder - Return fills in strategy order (default: true)
 * @returns {{ fills: Object[], strategies: string[], character: Object }}
 */
export function smartFillPalette(existingColors, targetTotal, options = {}) {
  const fillCount = Math.max(0, targetTotal - existingColors.length);
  if (fillCount === 0) return { fills: [], strategies: [], character: null };

  const character = analyzePaletteCharacter(existingColors);
  if (!character) return { fills: [], strategies: [], character: null };

  const strategies = selectStrategies(character, fillCount);
  const fills = [];

  for (let i = 0; i < fillCount; i++) {
    const color = executeStrategy(strategies[i], character, existingColors, i, fills);
    fills.push({ ...color, mode: 'oklch' });
  }

  return { fills, strategies, character };
}

/**
 * Regenerate only the unlocked slots in a palette, using the locked
 * colors as the "existing" base for smart fill analysis.
 *
 * @param {Object[]} currentPalette - Full current palette (all colors)
 * @param {number[]} lockedIndices - Indices that should NOT be regenerated
 * @returns {Object[]} New full palette with locked slots preserved
 */
export function regenerateUnlocked(currentPalette, lockedIndices) {
  if (!currentPalette.length) return currentPalette;

  const lockedColors = lockedIndices
    .filter(i => i >= 0 && i < currentPalette.length)
    .map(i => currentPalette[i]);

  const unlockCount = currentPalette.length - lockedColors.length;
  if (unlockCount === 0) return currentPalette;

  const { fills } = smartFillPalette(lockedColors, currentPalette.length);

  // Merge: locked colors stay in place, fills go into unlocked slots
  const result = [...currentPalette];
  let fillIdx = 0;
  for (let i = 0; i < result.length; i++) {
    if (!lockedIndices.includes(i)) {
      result[i] = fills[fillIdx] ?? result[i];
      fillIdx++;
    }
  }
  return result;
}

/**
 * Human-readable label for a fill strategy.
 */
export function strategyLabel(strategy) {
  const labels = {
    'depth-anchor':      'Dark anchor',
    'luminous-field':    'Light field',
    'tinted-neutral':    'Tinted neutral',
    'cool-counterpoint': 'Cool counterpoint',
    'warm-counterpoint': 'Warm counterpoint',
    'off-complement':    'Off-complement',
    'gap-bridge':        'Gap bridge',
    'tonal-echo':        'Tonal echo',
    'chroma-pop':        'Chroma pop',
    'muted-anchor':      'Muted anchor',
    'organic-harmonic':  'Organic harmonic',
  };
  return labels[strategy] ?? strategy;
}


// ============================================================================
// 5. HELPERS
// ============================================================================

function norm360(hue) {
  return ((hue % 360) + 360) % 360;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function avoidClumping(hue, usedHues, minSep) {
  if (!usedHues.length) return hue;
  let adjusted = hue;
  for (let attempt = 0; attempt < 12; attempt++) {
    const tooClose = usedHues.some(used => {
      const diff = Math.abs(norm360(adjusted - used));
      return Math.min(diff, 360 - diff) < minSep;
    });
    if (!tooClose) break;
    adjusted = norm360(adjusted + minSep * (attempt % 2 === 0 ? 1 : -1));
  }
  return adjusted;
}
