// vibeHarmony.js — Vibe-Aware Color Companion Engine
// ============================================================================
// Unlike geometric harmony (complementary, triadic, etc.), vibe harmony
// generates colors that FEEL like they belong together — matching the energy,
// mutedness, warmth, and mood of the input color.
//
// A muted dusty purple doesn't need screaming banana yellow.
// It needs a warm ochre, a dusty sage, a faded terracotta.
// Colors that breathe the same air.
// ============================================================================

// ============================================================================
// 1. COLOR MOOD ANALYSIS — "Read the room" of any color
// ============================================================================

/**
 * Analyze a color's mood/vibe based on its OKLCH properties.
 * Returns a rich descriptor object that drives companion generation.
 *
 * @param {Object} color - OKLCH color { l, c, h, mode: 'oklch' }
 * @returns {Object} Mood analysis with energy, temperature, depth, etc.
 */
export function analyzeColorMood(color) {
  const l = color.l ?? 0.5;
  const c = color.c ?? 0.1;
  const h = color.h ?? 0;

  // --- Energy level (from chroma) ---
  // How "loud" is this color?
  let energy;
  if (c < 0.04) energy = 'whisper';      // Nearly neutral
  else if (c < 0.08) energy = 'muted';    // Dusty, desaturated
  else if (c < 0.13) energy = 'moderate'; // Present but not screaming
  else if (c < 0.20) energy = 'vibrant';  // Rich and saturated
  else energy = 'electric';                // Maximum intensity

  // --- Depth (from lightness) ---
  let depth;
  if (l < 0.25) depth = 'abyss';         // Very dark, almost black
  else if (l < 0.40) depth = 'deep';      // Dark and rich
  else if (l < 0.55) depth = 'grounded';  // Mid-tone, substantial
  else if (l < 0.70) depth = 'airy';      // Light, open
  else if (l < 0.85) depth = 'soft';      // Pastel territory
  else depth = 'ethereal';                 // Very light, barely there

  // --- Temperature (from hue + chroma interaction) ---
  // Not just warm/cool — considers intensity
  const warmHues = (h >= 0 && h < 70) || h >= 330;   // Red-orange-yellow
  const coolHues = h >= 170 && h < 280;                // Cyan-blue-violet
  const neutralHues = (h >= 70 && h < 170) || (h >= 280 && h < 330);

  let temperature;
  if (c < 0.04) {
    temperature = 'neutral'; // Too desaturated to read temperature
  } else if (warmHues) {
    temperature = c > 0.15 ? 'hot' : 'warm';
  } else if (coolHues) {
    temperature = c > 0.15 ? 'icy' : 'cool';
  } else {
    // Green and magenta zones — contextual
    temperature = h >= 70 && h < 170 ? 'fresh' : 'complex';
  }

  // --- Mood classification ---
  // Combines all factors into a vibe category
  const mood = classifyMood(energy, depth, temperature, h);

  // --- Companion strategy ---
  // How should we generate colors that match this vibe?
  const strategy = determineCompanionStrategy(mood, { l, c, h });

  return {
    energy,
    depth,
    temperature,
    mood,
    strategy,
    raw: { l, c, h }
  };
}

/**
 * Classify the overall mood from energy + depth + temperature.
 * These are the "vibe families" that drive generation.
 */
function classifyMood(energy, depth, temperature, hue) {
  // Dusty/muted + mid-to-dark = moody
  if ((energy === 'muted' || energy === 'whisper') && (depth === 'deep' || depth === 'grounded')) {
    return 'moody';
  }

  // Muted + light = dreamy/nostalgic
  if ((energy === 'muted' || energy === 'whisper') && (depth === 'airy' || depth === 'soft')) {
    return 'dreamy';
  }

  // Vibrant/electric + dark = jewel-toned
  if ((energy === 'vibrant' || energy === 'electric') && (depth === 'deep' || depth === 'abyss')) {
    return 'jewel';
  }

  // Vibrant + light = playful/pop
  if ((energy === 'vibrant' || energy === 'electric') && (depth === 'airy' || depth === 'soft' || depth === 'ethereal')) {
    return 'pop';
  }

  // Moderate energy + warm = earthy
  if (energy === 'moderate' && (temperature === 'warm' || temperature === 'hot')) {
    return 'earthy';
  }

  // Moderate energy + cool = serene
  if (energy === 'moderate' && (temperature === 'cool' || temperature === 'icy')) {
    return 'serene';
  }

  // Very light + very low chroma = ethereal
  if (depth === 'ethereal' || (depth === 'soft' && energy === 'whisper')) {
    return 'ethereal';
  }

  // Very dark + low chroma = noir
  if ((depth === 'abyss' || depth === 'deep') && (energy === 'whisper' || energy === 'muted')) {
    return 'noir';
  }

  // Fresh greens
  if (temperature === 'fresh' && energy !== 'whisper') {
    return 'botanical';
  }

  // Default
  return 'balanced';
}


// ============================================================================
// 2. COMPANION STRATEGY — How to generate colors for each mood
// ============================================================================

/**
 * Determine the generation strategy for a given mood.
 * This controls how much chroma/lightness/hue variation is allowed.
 */
function determineCompanionStrategy(mood, { l, c, h }) {
  const strategies = {
    moody: {
      chromaRange: [Math.max(0.02, c * 0.4), c * 1.3],   // Stay muted, slight boost OK
      lightnessRange: [l - 0.15, l + 0.15],                // Tight lightness band
      hueSpread: 'wide',                                    // Explore hue space
      temperatureBias: 'preserve',                           // Keep the mood's temperature
      neutralChance: 0.3,                                    // 30% chance of a grounding neutral
      description: 'Dark, desaturated, atmospheric'
    },
    dreamy: {
      chromaRange: [c * 0.3, c * 1.2],
      lightnessRange: [l - 0.10, Math.min(0.90, l + 0.15)],
      hueSpread: 'gentle',                                   // Smaller hue shifts
      temperatureBias: 'soften',                              // Lean slightly warmer
      neutralChance: 0.2,
      description: 'Soft, nostalgic, whispery'
    },
    jewel: {
      chromaRange: [c * 0.6, c * 1.1],                       // Keep richness
      lightnessRange: [l - 0.10, l + 0.20],
      hueSpread: 'wide',
      temperatureBias: 'contrast',                            // Mix warm + cool for drama
      neutralChance: 0.15,
      description: 'Rich, deep, luxurious'
    },
    pop: {
      chromaRange: [c * 0.5, c * 1.2],
      lightnessRange: [l - 0.20, l + 0.15],
      hueSpread: 'wide',
      temperatureBias: 'complement',
      neutralChance: 0.1,
      description: 'Bright, energetic, playful'
    },
    earthy: {
      chromaRange: [c * 0.4, c * 1.15],
      lightnessRange: [l - 0.20, l + 0.20],
      hueSpread: 'organic',                                  // Natural hue clustering
      temperatureBias: 'warm',
      neutralChance: 0.35,
      description: 'Natural, grounded, warm'
    },
    serene: {
      chromaRange: [c * 0.5, c * 1.1],
      lightnessRange: [l - 0.10, l + 0.20],
      hueSpread: 'gentle',
      temperatureBias: 'cool',
      neutralChance: 0.25,
      description: 'Calm, balanced, peaceful'
    },
    ethereal: {
      chromaRange: [0.01, Math.max(0.06, c * 1.2)],
      lightnessRange: [0.70, 0.95],                           // Stay light
      hueSpread: 'gentle',
      temperatureBias: 'soften',
      neutralChance: 0.4,
      description: 'Barely-there, misty, translucent'
    },
    noir: {
      chromaRange: [0.01, Math.max(0.06, c * 1.5)],
      lightnessRange: [0.10, 0.40],                           // Stay dark
      hueSpread: 'minimal',
      temperatureBias: 'preserve',
      neutralChance: 0.5,
      description: 'Dark, minimal, dramatic'
    },
    botanical: {
      chromaRange: [c * 0.4, c * 1.2],
      lightnessRange: [l - 0.15, l + 0.20],
      hueSpread: 'organic',
      temperatureBias: 'fresh',
      neutralChance: 0.25,
      description: 'Natural, green-adjacent, organic'
    },
    balanced: {
      chromaRange: [c * 0.5, c * 1.2],
      lightnessRange: [l - 0.15, l + 0.15],
      hueSpread: 'moderate',
      temperatureBias: 'preserve',
      neutralChance: 0.2,
      description: 'Versatile, harmonious'
    }
  };

  return strategies[mood] || strategies.balanced;
}


// ============================================================================
// 3. VIBE-AWARE COMPANION GENERATION — The main event
// ============================================================================

/**
 * Generate vibe-matched color companions.
 * These aren't just geometric opposites — they FEEL like they belong together.
 *
 * @param {Object} inputColor - OKLCH color { l, c, h, mode: 'oklch' }
 * @param {Object} options - Generation options
 * @param {number} options.count - Number of companions (default: 5)
 * @param {string} options.purpose - 'palette' | 'accent' | 'background' | 'gradient'
 * @param {boolean} options.includeInput - Include the input color in results (default: true)
 * @returns {Object} Generated palette with metadata
 */
export function generateVibeCompanions(inputColor, options = {}) {
  const {
    count = 5,
    purpose = 'palette',
    includeInput = true
  } = options;

  // Step 1: Analyze the input color's mood
  const mood = analyzeColorMood(inputColor);

  // Step 2: Generate companions based on mood strategy
  const companions = [];
  const usedHues = [inputColor.h ?? 0]; // Track hues to avoid too-similar colors

  // Determine how many of each type to generate
  const targetCount = includeInput ? count - 1 : count;
  const neutralSlots = Math.round(targetCount * (mood.strategy.neutralChance ?? 0.2));
  const chromaSlots = targetCount - neutralSlots;

  // Generate chromatic companions
  for (let i = 0; i < chromaSlots; i++) {
    const companion = generateSingleCompanion(inputColor, mood, i, chromaSlots, usedHues);
    companions.push(companion);
    usedHues.push(companion.color.h);
  }

  // Generate grounding neutrals
  for (let i = 0; i < neutralSlots; i++) {
    companions.push(generateGroundingNeutral(inputColor, mood, i));
  }

  // Step 3: Sort by visual weight (light → dark) for pleasing display
  companions.sort((a, b) => (b.color.l ?? 0) - (a.color.l ?? 0));

  // Build final palette
  const palette = includeInput
    ? [{ color: { ...inputColor, mode: 'oklch' }, role: 'source', description: 'Your input color' }, ...companions]
    : companions;

  return {
    palette,
    mood: mood.mood,
    moodDescription: mood.strategy.description,
    energy: mood.energy,
    temperature: mood.temperature,
    depth: mood.depth,
    tips: generateVibeExplanation(mood)
  };
}

/**
 * Generate a single chromatic companion that matches the vibe.
 */
function generateSingleCompanion(input, mood, index, totalChromatic, usedHues) {
  const { l, c, h } = mood.raw;
  const strategy = mood.strategy;

  // --- Determine hue ---
  const targetHue = pickVibeHue(h, mood, index, totalChromatic, usedHues);

  // --- Determine chroma (saturation) ---
  // KEY INSIGHT: This is what makes vibe harmony different.
  // Instead of independent chroma, we DERIVE it from the input's energy.
  const [minC, maxC] = strategy.chromaRange;
  const chromaVariation = (Math.random() * 0.6 + 0.4); // 0.4–1.0 of range
  const targetChroma = clamp(
    minC + (maxC - minC) * chromaVariation,
    0.01,
    0.30
  );

  // --- Determine lightness ---
  // Keep in the mood's lightness band, with gentle variation
  const [minL, maxL] = strategy.lightnessRange;
  const lightnessStep = (index + 1) / (totalChromatic + 1); // Distribute evenly
  const targetLightness = clamp(
    minL + (maxL - minL) * lightnessStep + (Math.random() - 0.5) * 0.06,
    0.08,
    0.95
  );

  // --- Name the role ---
  const role = describeCompanionRole(input, { l: targetLightness, c: targetChroma, h: targetHue });

  return {
    color: {
      mode: 'oklch',
      l: targetLightness,
      c: targetChroma,
      h: normalizeHue(targetHue)
    },
    role,
    description: describeRelationship(input, { l: targetLightness, c: targetChroma, h: targetHue }, mood)
  };
}

/**
 * Pick a hue that fits the vibe — NOT just geometric.
 * This is the secret sauce.
 */
function pickVibeHue(baseHue, mood, index, total, usedHues) {
  const strategy = mood.strategy;

  // Hue spread determines how far we roam from the input
  const spreadConfig = {
    minimal: { offsets: [10, -15, 20, -25, 30], jitter: 5 },
    gentle: { offsets: [25, -30, 50, -55, 75], jitter: 10 },
    moderate: { offsets: [40, -45, 80, 160, -90], jitter: 15 },
    wide: { offsets: [60, 150, -80, 200, -120], jitter: 20 },
    organic: { offsets: [30, -25, 55, -50, 80], jitter: 12 }
  };

  const spread = spreadConfig[strategy.hueSpread] || spreadConfig.moderate;
  const baseOffset = spread.offsets[index % spread.offsets.length];
  const jitter = (Math.random() - 0.5) * spread.jitter * 2;

  let targetHue = baseHue + baseOffset + jitter;

  // Temperature bias adjustments
  switch (strategy.temperatureBias) {
    case 'warm':
      // Pull hues toward warm range (0-60, 330-360)
      targetHue = biasTowardRange(targetHue, [0, 60], 0.3);
      break;
    case 'cool':
      // Pull hues toward cool range (180-270)
      targetHue = biasTowardRange(targetHue, [190, 260], 0.3);
      break;
    case 'fresh':
      // Pull toward green-cyan (100-180)
      targetHue = biasTowardRange(targetHue, [100, 170], 0.25);
      break;
    case 'contrast':
      // Alternate warm and cool
      if (index % 2 === 0) {
        targetHue = biasTowardRange(targetHue, [0, 50], 0.2);
      } else {
        targetHue = biasTowardRange(targetHue, [200, 260], 0.2);
      }
      break;
    case 'soften':
      // Reduce extreme hue angles, keep things close
      targetHue = baseHue + (targetHue - baseHue) * 0.7;
      break;
    // 'preserve' and 'complement' — no bias
  }

  // Avoid hues too close to already-used ones (min 25° separation)
  targetHue = avoidClumping(normalizeHue(targetHue), usedHues, 25);

  return normalizeHue(targetHue);
}

/**
 * Generate a grounding neutral that inherits the input's undertone.
 * Not just gray — tinted gray that belongs in the same world.
 */
function generateGroundingNeutral(input, mood, index) {
  const { l, c, h } = mood.raw;

  // Neutrals inherit the hue of the input (warm neutral, cool neutral, etc.)
  // but with very low chroma
  const neutralChroma = 0.01 + Math.random() * 0.025; // 0.01–0.035

  // Lightness: provide contrast with the input
  let neutralLightness;
  if (l > 0.6) {
    // Input is light → neutral goes dark
    neutralLightness = 0.15 + Math.random() * 0.20;
  } else if (l < 0.4) {
    // Input is dark → neutral goes light
    neutralLightness = 0.75 + Math.random() * 0.15;
  } else {
    // Input is mid → alternate between light and dark neutrals
    neutralLightness = index % 2 === 0
      ? 0.85 + Math.random() * 0.08
      : 0.18 + Math.random() * 0.12;
  }

  // Hue: inherit from input, slight shift for depth
  const neutralHue = normalizeHue(h + (Math.random() - 0.5) * 20);

  return {
    color: {
      mode: 'oklch',
      l: neutralLightness,
      c: neutralChroma,
      h: neutralHue
    },
    role: neutralLightness > 0.6 ? 'light-ground' : 'dark-ground',
    description: `A tinted neutral that shares the ${mood.temperature} undertone of your input`
  };
}


// ============================================================================
// 4. SPECIFIC USE CASES — Accent finder, background finder, gradient seed
// ============================================================================

/**
 * Find the best accent color for a given color.
 * Not just the complement — an accent that ENHANCES without clashing.
 *
 * @param {Object} inputColor - OKLCH color
 * @param {Object} options
 * @param {string} options.intensity - 'subtle' | 'balanced' | 'bold'
 * @returns {Object} Accent color with explanation
 */
export function findVibeAccent(inputColor, options = {}) {
  const { intensity = 'balanced' } = options;
  const mood = analyzeColorMood(inputColor);
  const { l, c, h } = mood.raw;

  // Accent hue: offset from input, but NOT the exact opposite
  // Use golden angle offset (137.5°) instead of 180° — more aesthetically pleasing
  const hueOffsets = {
    subtle: 30 + Math.random() * 20,       // Analogous-adjacent
    balanced: 120 + Math.random() * 40,     // Triadic zone (more interesting than complement)
    bold: 150 + Math.random() * 60          // Near-complement but not exact
  };

  const accentHue = normalizeHue(h + hueOffsets[intensity]);

  // Accent chroma: should be noticeable but matched to the input's energy
  const chromaMultipliers = {
    subtle: 1.0,
    balanced: 1.2,
    bold: 1.5
  };
  const accentChroma = clamp(c * chromaMultipliers[intensity], 0.06, 0.25);

  // Accent lightness: needs contrast with input
  let accentLightness;
  if (l > 0.55) {
    accentLightness = l - 0.15 - Math.random() * 0.10;
  } else {
    accentLightness = l + 0.15 + Math.random() * 0.10;
  }
  accentLightness = clamp(accentLightness, 0.25, 0.80);

  return {
    accent: {
      mode: 'oklch',
      l: accentLightness,
      c: accentChroma,
      h: accentHue
    },
    mood: mood.mood,
    explanation: `This ${intensity} accent uses a ${Math.round(hueOffsets[intensity])}° offset instead of a direct complement, ` +
      `with chroma matched to your ${mood.energy} input. It enhances without competing.`,
    alternatives: [
      // Provide 2 alternatives at different angles
      {
        mode: 'oklch',
        l: accentLightness + 0.05,
        c: accentChroma * 0.85,
        h: normalizeHue(h + hueOffsets[intensity] - 20)
      },
      {
        mode: 'oklch',
        l: accentLightness - 0.05,
        c: accentChroma * 1.1,
        h: normalizeHue(h + hueOffsets[intensity] + 25)
      }
    ]
  };
}

/**
 * Find background colors that let the input color shine.
 * Considers the input's mood to choose appropriate backgrounds.
 */
export function findVibeBackgrounds(inputColor) {
  const mood = analyzeColorMood(inputColor);
  const { l, c, h } = mood.raw;

  const backgrounds = [];

  // Light background — tinted with the input's hue
  backgrounds.push({
    color: {
      mode: 'oklch',
      l: 0.96 + Math.random() * 0.03,
      c: 0.005 + Math.random() * 0.01,
      h: h
    },
    label: 'Light & Clean',
    description: 'Tinted white that subtly echoes your color'
  });

  // Dark background — deep with a hint of the input's hue
  backgrounds.push({
    color: {
      mode: 'oklch',
      l: 0.10 + Math.random() * 0.05,
      c: 0.005 + Math.random() * 0.015,
      h: h
    },
    label: 'Deep & Moody',
    description: 'Almost-black that creates a rich stage'
  });

  // Warm neutral background
  backgrounds.push({
    color: {
      mode: 'oklch',
      l: mood.depth === 'deep' || mood.depth === 'abyss' ? 0.92 : 0.15,
      c: 0.015,
      h: normalizeHue(h + 30)  // Slightly warmer
    },
    label: mood.depth === 'deep' ? 'Warm Paper' : 'Warm Dark',
    description: 'A warm neutral that provides gentle contrast'
  });

  // Complement-tinted background (very desaturated)
  backgrounds.push({
    color: {
      mode: 'oklch',
      l: l > 0.5 ? 0.12 : 0.93,
      c: 0.02,
      h: normalizeHue(h + 180)
    },
    label: 'Complement Wash',
    description: 'Opposite hue at near-zero chroma — creates subtle tension'
  });

  return {
    backgrounds,
    mood: mood.mood,
    recommendation: l > 0.6
      ? 'Your color is light — darker backgrounds will make it pop'
      : 'Your color is rich/dark — lighter or very dark backgrounds both work well'
  };
}


// ============================================================================
// 5. EXPLANATION ENGINE — Help users understand WHY these colors work
// ============================================================================

/**
 * Generate human-readable explanation of why the vibe palette works.
 */
function generateVibeExplanation(mood) {
  const tips = {
    moody: [
      'Muted colors create cohesion through shared desaturation — they "whisper" together',
      'The tight lightness range keeps everything feeling intimate and atmospheric',
      'Tinted neutrals carry your color\'s undertone through the whole palette'
    ],
    dreamy: [
      'Soft chromas and light values create that washed, nostalgic quality',
      'Gentle hue shifts keep things ethereal without becoming muddy',
      'These colors feel like they\'ve been seen through frosted glass'
    ],
    jewel: [
      'Deep, saturated colors get their richness from low lightness + high chroma',
      'Mixing warm and cool deep tones creates drama without chaos',
      'These are the colors you\'d find in stained glass or gemstones'
    ],
    pop: [
      'Bright, high-chroma colors need careful hue spacing to avoid clashing',
      'The lightness variation gives the palette visual rhythm',
      'These colors want to be seen — use them with generous white space'
    ],
    earthy: [
      'Earth tones cluster in the warm hue range with moderate chroma',
      'The warmth comes from hue bias, not just saturation',
      'Grounding neutrals anchor the palette — like soil under wildflowers'
    ],
    serene: [
      'Cool tones + moderate chroma create calm without feeling cold',
      'The gentle lightness range feels like open sky',
      'These colors don\'t compete — they coexist'
    ],
    ethereal: [
      'Near-zero chroma makes these colors feel like they\'re barely there',
      'Light values create space and openness',
      'Think fog, mist, early morning light'
    ],
    noir: [
      'Deep values with minimal color create sophisticated tension',
      'The barely-visible hue tints are what separate this from just "dark"',
      'Less color, more mood'
    ],
    botanical: [
      'Green-adjacent hues with organic variation mimic nature\'s palette',
      'Nature doesn\'t do perfect complementary — it does close neighbors with accent surprises',
      'The chroma variation mirrors how leaves differ in saturation naturally'
    ],
    balanced: [
      'A versatile palette that works across contexts',
      'The chroma and lightness are matched to your input\'s energy level',
      'Hue variation is wide enough for interest, close enough for harmony'
    ]
  };

  return tips[mood.mood] || tips.balanced;
}

/**
 * Describe the relationship between the input and a companion color.
 */
function describeRelationship(input, companion, mood) {
  const hueDiff = Math.abs(normalizeHue(companion.h - (input.h ?? 0)));
  const lightDiff = (companion.l ?? 0.5) - (input.l ?? 0.5);
  const chromaDiff = (companion.c ?? 0.1) - (input.c ?? 0.1);

  let relationship = '';

  // Hue relationship
  if (hueDiff < 30) relationship = 'A close neighbor — ';
  else if (hueDiff < 60) relationship = 'An analogous friend — ';
  else if (hueDiff < 120) relationship = 'A warm contrast — ';
  else if (hueDiff < 160) relationship = 'A triadic partner — ';
  else relationship = 'A soft opposite — ';

  // Energy relationship
  if (Math.abs(chromaDiff) < 0.03) relationship += 'matched energy';
  else if (chromaDiff > 0) relationship += 'slightly bolder';
  else relationship += 'slightly softer';

  // Lightness relationship
  if (Math.abs(lightDiff) < 0.08) relationship += ', same weight';
  else if (lightDiff > 0) relationship += ', lighter';
  else relationship += ', deeper';

  return relationship;
}

/**
 * Describe a companion's role based on its properties relative to the input.
 */
function describeCompanionRole(input, companion) {
  const hueDiff = Math.abs(normalizeHue(companion.h - (input.h ?? 0)));

  if (hueDiff < 30) return 'neighbor';
  if (hueDiff < 60) return 'analogous';
  if (hueDiff < 120) return 'contrast';
  if (hueDiff < 160) return 'triadic';
  return 'complement';
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

/**
 * Bias a hue toward a target range.
 * @param {number} hue - Current hue
 * @param {number[]} range - [min, max] target range
 * @param {number} strength - 0-1, how strongly to pull
 */
function biasTowardRange(hue, [rangeMin, rangeMax], strength) {
  const normalized = normalizeHue(hue);
  const rangeMid = (rangeMin + rangeMax) / 2;

  // Calculate shortest angular distance to range midpoint
  let diff = rangeMid - normalized;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return normalized + diff * strength;
}

/**
 * Adjust a hue to avoid being too close to already-used hues.
 * Preserves the general direction but nudges away from clumps.
 */
function avoidClumping(hue, usedHues, minSeparation) {
  if (usedHues.length === 0) return hue;

  let adjusted = hue;
  let attempts = 0;

  while (attempts < 10) {
    const tooClose = usedHues.some(used => {
      const diff = Math.abs(normalizeHue(adjusted - used));
      return Math.min(diff, 360 - diff) < minSeparation;
    });

    if (!tooClose) break;

    // Nudge in a consistent direction
    adjusted = normalizeHue(adjusted + minSeparation * (attempts % 2 === 0 ? 1 : -1));
    attempts++;
  }

  return adjusted;
}


// ============================================================================
// 7. EXPORT: Quick-access vibe presets
// ============================================================================

/**
 * Get a curated vibe palette by name — for when users know the mood they want.
 */
export function getVibePreset(presetName, baseColor) {
  const presets = {
    'dusty-romance': { count: 5, purpose: 'palette' },
    'midnight-jewel': { count: 5, purpose: 'palette' },
    'morning-fog': { count: 5, purpose: 'palette' },
    'desert-sun': { count: 5, purpose: 'palette' },
    'deep-forest': { count: 5, purpose: 'palette' },
    'neon-noir': { count: 5, purpose: 'palette' }
  };

  // Override the base color's mood for preset generation
  // by adjusting the color properties before analysis
  const adjustedColors = {
    'dusty-romance': { ...baseColor, c: Math.min(baseColor.c ?? 0.1, 0.08), l: 0.55 },
    'midnight-jewel': { ...baseColor, c: Math.max(baseColor.c ?? 0.1, 0.18), l: 0.30 },
    'morning-fog': { ...baseColor, c: Math.min(baseColor.c ?? 0.1, 0.04), l: 0.80 },
    'desert-sun': { ...baseColor, c: 0.12, l: 0.55, h: biasTowardRange(baseColor.h ?? 0, [20, 50], 0.5) },
    'deep-forest': { ...baseColor, c: 0.10, l: 0.35, h: biasTowardRange(baseColor.h ?? 0, [120, 160], 0.6) },
    'neon-noir': { ...baseColor, c: Math.max(baseColor.c ?? 0.1, 0.22), l: 0.25 }
  };

  const adjusted = adjustedColors[presetName] || baseColor;
  const config = presets[presetName] || presets['dusty-romance'];

  return generateVibeCompanions({ ...adjusted, mode: 'oklch' }, config);
}


// ============================================================================
// 8. DESIGN-SMART TONAL PALETTE ENGINE
// ============================================================================

/**
 * Generate a design-system-quality palette with proper lightness hierarchy.
 * Unlike vibe harmony (same lightness band), this assigns each slot a ROLE
 * and derives color from the source — ensuring contrast, hierarchy, and utility.
 *
 * @param {Object} inputColor - OKLCH color { l, c, h, mode: 'oklch' }
 * @param {Object} options
 * @param {string} options.mode - 'ui' | 'brand' | 'expressive' (default: 'ui')
 * @param {number} options.count - Number of palette swatches (default: 5)
 * @param {string} options.accentStrategy - 'complement' | 'split' | 'triad' | 'analogous' (default: 'complement')
 * @returns {Object} Palette with roles, sourceIndex, accentIndex, tips
 */
export function generateDesignPalette(inputColor, options = {}) {
  const {
    mode = 'ui',
    count = 5,
    accentStrategy = 'complement'
  } = options;

  const l = inputColor.l ?? 0.5;
  const c = inputColor.c ?? 0.1;
  const h = inputColor.h ?? 0;

  // Step 1 — Define lightness slots
  const base5 = [
    { lTarget: clamp(l - 0.38, 0.08, 0.28), roleKey: 'dark-anchor' },
    { lTarget: clamp(l - 0.20, 0.18, 0.42), roleKey: 'shadow' },
    { lTarget: l,                             roleKey: 'source' },
    { lTarget: clamp(l + 0.20, 0.58, 0.82), roleKey: 'highlight' },
    { lTarget: clamp(l + 0.38, 0.78, 0.94), roleKey: 'field' },
  ];

  let slots;
  let sourceIndexInSlots;

  if (count === 3) {
    slots = [base5[0], base5[2], base5[4]];
    sourceIndexInSlots = 1;
  } else if (count === 4) {
    slots = [base5[0], base5[1], base5[2], base5[4]];
    sourceIndexInSlots = 2;
  } else if (count === 6) {
    const extraSlot = { lTarget: clamp(l - 0.10, 0.08, 0.92), roleKey: 'shadow-mid' };
    slots = [base5[0], base5[1], extraSlot, base5[2], base5[3], base5[4]];
    sourceIndexInSlots = 3;
  } else {
    // default: count === 5
    slots = [...base5];
    sourceIndexInSlots = 2;
  }

  // Ensure adjacent slots are at least 0.08 L apart
  for (let i = 0; i < slots.length - 1; i++) {
    const diff = slots[i + 1].lTarget - slots[i].lTarget;
    if (Math.abs(diff) < 0.08) {
      slots[i].lTarget -= 0.04;
      slots[i + 1].lTarget += 0.04;
    }
  }

  // Step 2+3 — Assign hue and chroma per slot
  const roleDescriptions = {
    'dark-anchor': 'Deep tone for text, borders, and strong contrast elements',
    'shadow':      'Mid-dark tone for secondary text and subtle dividers',
    'shadow-mid':  'Mid-dark tone for layered depth',
    'source':      'Your input color — the palette anchor',
    'highlight':   'Light tone for hover states and gentle emphasis',
    'field':       'Near-neutral surface tint for backgrounds and containers',
    'accent':      'High-energy complement for CTAs and focal points',
  };

  const chromaForRole = (roleKey) => {
    switch (roleKey) {
      case 'dark-anchor': return Math.min(c * 0.9, 0.22);
      case 'shadow':      return Math.min(c * 1.0, 0.25);
      case 'shadow-mid':  return Math.min(c * 0.95, 0.24);
      case 'source':      return c;
      case 'highlight':   return c * 0.75;
      case 'field':       return Math.max(c * 0.15, 0.008);
      default:            return c;
    }
  };

  let palette = slots.map((slot) => {
    let hue = h;
    let chroma = chromaForRole(slot.roleKey);

    if (mode === 'ui') {
      if (slot.roleKey === 'dark-anchor' || slot.roleKey === 'shadow') hue = h - 4;
      else if (slot.roleKey === 'highlight' || slot.roleKey === 'field') hue = h + 4;
      else hue = h;
    } else if (mode === 'brand') {
      if (slot.roleKey === 'dark-anchor') hue = h - 12;
      else if (slot.roleKey === 'shadow') hue = h - 6;
      else if (slot.roleKey === 'shadow-mid') hue = h + 6;
      else if (slot.roleKey === 'source') hue = h;
      else if (slot.roleKey === 'highlight') hue = h + 15;
      else if (slot.roleKey === 'field') { hue = h; chroma = 0.015; }
    } else if (mode === 'expressive') {
      if (slot.roleKey === 'dark-anchor') hue = h + 180;
      else if (slot.roleKey === 'shadow') hue = h - 30;
      else if (slot.roleKey === 'shadow-mid') hue = h + 90;
      else if (slot.roleKey === 'source') hue = h;
      else if (slot.roleKey === 'highlight') hue = h + 30;
      else if (slot.roleKey === 'field') hue = h + 150;
      // Override chroma for non-source slots in expressive mode
      if (slot.roleKey !== 'source') chroma = Math.max(c * 1.3, 0.20);
    }

    hue = normalizeHue(hue);

    return {
      color: { mode: 'oklch', l: slot.lTarget, c: chroma, h: hue },
      role: slot.roleKey,
      description: roleDescriptions[slot.roleKey] || slot.roleKey,
    };
  });

  // Brand mode: insert accent at slot 3, shift highlight to slot 4, drop field
  let accentIndex = -1;
  if (mode === 'brand' && palette.length >= 5) {
    const accentHueOffsets = { complement: 180, split: 150, triad: 120, analogous: 40 };
    const accentHue = normalizeHue(h + (accentHueOffsets[accentStrategy] ?? 180));
    const accentL = clamp(l + 0.05, 0.45, 0.70);
    const accentC = Math.max(c * 1.4, 0.18);

    const accentEntry = {
      color: { mode: 'oklch', l: accentL, c: accentC, h: accentHue },
      role: 'accent',
      description: roleDescriptions['accent'],
    };

    // [dark-anchor, shadow, source, accent, highlight] — drop original field
    palette = [palette[0], palette[1], palette[2], accentEntry, palette[3]];
    accentIndex = 3;
  }

  // Step 5 — Validate: no two colors with hue within 15° AND lightness within 0.06
  for (let i = 0; i < palette.length - 1; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      const hueDiff = Math.abs(palette[i].color.h - palette[j].color.h);
      const hueClose = Math.min(hueDiff, 360 - hueDiff) < 15;
      const lightDiff = Math.abs(palette[i].color.l - palette[j].color.l);
      if (hueClose && lightDiff < 0.06) {
        // Nudge the lighter one's lightness up by 0.08
        if (palette[i].color.l >= palette[j].color.l) {
          palette[i].color.l = clamp(palette[i].color.l + 0.08, 0, 1);
        } else {
          palette[j].color.l = clamp(palette[j].color.l + 0.08, 0, 1);
        }
      }
    }
  }

  const sourceIndex = sourceIndexInSlots;

  // Build tips
  const lValues = palette.map(p => p.color.l);
  const lMin = Math.min(...lValues);
  const lMax = Math.max(...lValues);
  const span = lMax - lMin;
  const fieldEntry = palette.find(p => p.role === 'field');
  const darkEntry = palette.find(p => p.role === 'dark-anchor');

  const tips = [
    `Lightness spans ${Math.round(span * 100)} points — from ${Math.round(lMin * 100)}% to ${Math.round(lMax * 100)}%, giving a full contrast range`,
    fieldEntry
      ? 'Use the "field" color (lightest) as your primary UI surface or page background'
      : 'Use the lightest color as your primary UI surface or page background',
    darkEntry
      ? 'Pair body text in the "dark-anchor" color against light field surfaces for maximum readability'
      : 'Pair the darkest color for text against light surfaces for maximum readability',
  ];

  return {
    palette,
    mode,
    sourceIndex,
    accentIndex,
    tips,
  };
}
