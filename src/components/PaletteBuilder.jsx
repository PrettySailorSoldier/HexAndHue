import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Lock, Unlock, RefreshCw, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';
import { parse } from 'culori';
import { toOklch, oklchToHex } from '../utils/colorUtils';
import { smartFillPalette, regenerateUnlocked, strategyLabel } from '../utils/smartFill';
import { generateColorName } from '../utils/colorNames';

const TARGET_SIZES = [3, 4, 5, 6, 7, 8];

export default function PaletteBuilder({ selectedColor, onPaletteGenerate }) {
  const [slots, setSlots] = useState([]);         // { color: oklch, locked: bool, isFill: bool, strategy: string|null }
  const [targetSize, setTargetSize] = useState(5);
  const [hexInput, setHexInput] = useState('');
  const [hexError, setHexError] = useState(false);
  const [fillStrategies, setFillStrategies] = useState([]);
  const [showStrategies, setShowStrategies] = useState(false);

  // --- Add the currently selected color from the wheel ---
  const addCurrentColor = useCallback(() => {
    if (!selectedColor) return;
    if (slots.length >= targetSize) return;
    setSlots(prev => [...prev, { color: selectedColor, locked: false, isFill: false, strategy: null }]);
  }, [selectedColor, slots.length, targetSize]);

  // --- Add a color from manual hex input ---
  const addHexColor = useCallback(() => {
    const trimmed = hexInput.trim();
    if (!trimmed) return;
    try {
      const parsed = parse(trimmed.startsWith('#') ? trimmed : `#${trimmed}`);
      if (!parsed) { setHexError(true); return; }
      const oklch = toOklch(parsed);
      if (!oklch) { setHexError(true); return; }
      if (slots.length >= targetSize) return;
      setSlots(prev => [...prev, { color: { ...oklch, mode: 'oklch' }, locked: false, isFill: false, strategy: null }]);
      setHexInput('');
      setHexError(false);
    } catch {
      setHexError(true);
    }
  }, [hexInput, slots.length, targetSize]);

  const handleHexKey = useCallback((e) => {
    if (e.key === 'Enter') addHexColor();
    else setHexError(false);
  }, [addHexColor]);

  // --- Remove a slot ---
  const removeSlot = useCallback((index) => {
    setSlots(prev => prev.filter((_, i) => i !== index));
  }, []);

  // --- Toggle lock ---
  const toggleLock = useCallback((index) => {
    setSlots(prev => prev.map((s, i) =>
      i === index ? { ...s, locked: !s.locked } : s
    ));
  }, []);

  // --- Clear all unlocked slots ---
  const clearUnlocked = useCallback(() => {
    setSlots(prev => prev.filter(s => s.locked));
  }, []);

  // --- Clear everything ---
  const clearAll = useCallback(() => {
    setSlots([]);
    setFillStrategies([]);
  }, []);

  // --- Smart Fill ---
  const handleSmartFill = useCallback(() => {
    const existing = slots
      .filter(s => s.locked || !s.isFill)
      .map(s => s.color);

    // Keep locked/manually-added colors, discard old fills
    const base = slots.filter(s => s.locked || !s.isFill);

    if (base.length === 0 && selectedColor) {
      // Nothing pinned yet — seed with current selected color
      const seeded = [{ color: selectedColor, locked: false, isFill: false, strategy: null }];
      const { fills, strategies } = smartFillPalette([selectedColor], targetSize);
      const fillSlots = fills.map((color, i) => ({
        color,
        locked: false,
        isFill: true,
        strategy: strategies[i] ?? null,
      }));
      const newSlots = [...seeded, ...fillSlots];
      setSlots(newSlots);
      setFillStrategies(strategies);
      onPaletteGenerate?.(newSlots.map(s => s.color));
      return;
    }

    const { fills, strategies } = smartFillPalette(
      existing,
      targetSize
    );

    const fillSlots = fills.map((color, i) => ({
      color,
      locked: false,
      isFill: true,
      strategy: strategies[i] ?? null,
    }));

    const newSlots = [...base, ...fillSlots];
    setSlots(newSlots);
    setFillStrategies(strategies);
    onPaletteGenerate?.(newSlots.map(s => s.color));
  }, [slots, targetSize, selectedColor, onPaletteGenerate]);

  // --- Regenerate only unlocked fill slots ---
  const handleRegenerate = useCallback(() => {
    if (slots.length === 0) return;
    const lockedIndices = slots
      .map((s, i) => (s.locked ? i : -1))
      .filter(i => i >= 0);
    const lockedColors = lockedIndices.map(i => slots[i].color);
    const unlockedFillCount = slots.filter(s => !s.locked).length;

    if (lockedColors.length === 0) {
      // All unlocked — just re-run fill from scratch
      handleSmartFill();
      return;
    }

    const { fills, strategies } = smartFillPalette(
      lockedColors,
      slots.length
    );

    let fillIdx = 0;
    const newSlots = slots.map((s, i) => {
      if (s.locked) return s;
      const fill = fills[fillIdx] ?? s;
      const strat = strategies[fillIdx] ?? null;
      fillIdx++;
      return { ...s, color: fill, isFill: true, strategy: strat };
    });

    setSlots(newSlots);
    setFillStrategies(strategies);
    onPaletteGenerate?.(newSlots.map(s => s.color));
  }, [slots, handleSmartFill, onPaletteGenerate]);

  // --- Send to active palette ---
  const sendToActivePalette = useCallback(() => {
    if (slots.length > 0) {
      onPaletteGenerate?.(slots.map(s => s.color));
    }
  }, [slots, onPaletteGenerate]);

  const baseSlots = slots.filter(s => !s.isFill);
  const fillSlots = slots.filter(s => s.isFill);
  const canFill = baseSlots.length > 0 || !!selectedColor;
  const canAddMore = slots.length < targetSize;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="bg-gradient-to-r from-[#a855f7]/10 to-[#ff6b4a]/10 rounded-xl p-4 border border-[#a855f7]/20">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={15} className="text-[#a855f7]" />
          <span className="text-sm font-medium text-[#f0f0f5]">Palette Builder</span>
        </div>
        <p className="text-xs text-[#8888a0]">
          Pin your existing colors, set a target size, then let smart fill complete the palette
          using artistic strategies — not generic harmonics.
        </p>
      </div>

      {/* Target size selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">Target size</span>
          <span className="text-[10px] text-[#55556a]">{slots.length} / {targetSize}</span>
        </div>
        <div className="flex gap-1">
          {TARGET_SIZES.map(n => (
            <button
              key={n}
              onClick={() => setTargetSize(n)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                targetSize === n
                  ? 'bg-[#a855f7]/20 border-[#a855f7]/40 text-[#a855f7]'
                  : 'bg-[#12121a] border-[#1a1a24] text-[#55556a] hover:text-[#8888a0]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Add color controls */}
      <div className="space-y-2">
        {/* Add from wheel */}
        <button
          onClick={addCurrentColor}
          disabled={!selectedColor || !canAddMore}
          className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
            selectedColor && canAddMore
              ? 'bg-[#12121a] border-[#1a1a24] hover:border-[#252530] cursor-pointer'
              : 'bg-[#0a0a0f] border-[#12121a] opacity-40 cursor-not-allowed'
          }`}
        >
          {selectedColor && (
            <div
              className="w-8 h-8 rounded-lg shadow-sm flex-shrink-0"
              style={{ backgroundColor: oklchToHex(selectedColor) }}
            />
          )}
          <div className="flex-1 text-left">
            <p className="text-xs text-[#f0f0f5]">Add current color</p>
            {selectedColor && (
              <p className="text-[10px] text-[#55556a] font-mono">{oklchToHex(selectedColor)}</p>
            )}
          </div>
          <Plus size={14} className="text-[#55556a]" />
        </button>

        {/* Hex input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={hexInput}
            onChange={e => { setHexInput(e.target.value); setHexError(false); }}
            onKeyDown={handleHexKey}
            placeholder="#hex or rrggbb"
            maxLength={7}
            className={`flex-1 px-3 py-2 rounded-lg bg-[#12121a] border text-xs font-mono text-[#f0f0f5] placeholder-[#333340] outline-none transition-colors ${
              hexError ? 'border-red-500/50' : 'border-[#1a1a24] focus:border-[#252530]'
            }`}
          />
          <button
            onClick={addHexColor}
            disabled={!hexInput.trim() || !canAddMore}
            className="px-3 py-2 rounded-lg bg-[#12121a] border border-[#1a1a24] hover:border-[#252530] disabled:opacity-40 transition-colors"
          >
            <Plus size={14} className="text-[#8888a0]" />
          </button>
        </div>
      </div>

      {/* Slot list */}
      {slots.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">Colors</span>
            <div className="flex gap-1">
              {slots.some(s => !s.locked) && (
                <button
                  onClick={clearUnlocked}
                  className="text-[10px] text-[#55556a] hover:text-[#8888a0] px-2 py-0.5 rounded transition-colors"
                >
                  Clear unlocked
                </button>
              )}
              <button
                onClick={clearAll}
                className="text-[10px] text-[#55556a] hover:text-red-400 px-2 py-0.5 rounded transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>

          {slots.map((slot, i) => {
            const hex = oklchToHex(slot.color);
            const name = generateColorName(slot.color);
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                  slot.isFill
                    ? 'bg-[#a855f7]/5 border border-[#a855f7]/15'
                    : 'bg-[#12121a] border border-[#1a1a24]'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-lg shadow-sm flex-shrink-0"
                  style={{ backgroundColor: hex }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-[#f0f0f5]">{hex}</span>
                    {slot.isFill && slot.strategy && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#a855f7]/15 text-[#a855f7] uppercase tracking-wide">
                        {strategyLabel(slot.strategy)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#55556a] truncate">{name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleLock(i)}
                    title={slot.locked ? 'Unlock' : 'Lock (preserve during regeneration)'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      slot.locked
                        ? 'bg-[#ff6b4a]/20 text-[#ff6b4a]'
                        : 'text-[#333340] hover:text-[#8888a0] hover:bg-[#1a1a24]'
                    }`}
                  >
                    {slot.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <button
                    onClick={() => removeSlot(i)}
                    className="p-1.5 rounded-lg text-[#333340] hover:text-red-400 hover:bg-[#1a1a24] transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {slots.length === 0 && (
        <div className="border border-dashed border-[#1a1a24] rounded-xl p-6 text-center">
          <p className="text-xs text-[#55556a]">
            Add your existing colors above, then smart-fill the rest
          </p>
          <p className="text-[10px] text-[#333340] mt-1">
            Or just hit Smart Fill to generate a complete palette
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        {/* Smart Fill (primary action) */}
        <button
          onClick={handleSmartFill}
          disabled={!canFill}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            canFill
              ? 'bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white hover:opacity-90'
              : 'bg-[#12121a] border border-[#1a1a24] text-[#333340] cursor-not-allowed'
          }`}
        >
          <Sparkles size={15} />
          Smart Fill to {targetSize}
        </button>

        {/* Regenerate unlocked (secondary) */}
        {slots.length > 0 && slots.some(s => s.isFill && !s.locked) && (
          <button
            onClick={handleRegenerate}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-[#8888a0] bg-[#12121a] border border-[#1a1a24] hover:border-[#252530] hover:text-[#f0f0f5] transition-colors"
          >
            <RefreshCw size={13} />
            Regenerate fills
          </button>
        )}
      </div>

      {/* Strategy explanation (collapsible) */}
      {fillStrategies.length > 0 && (
        <div className="bg-[#12121a] rounded-xl border border-[#1a1a24] overflow-hidden">
          <button
            onClick={() => setShowStrategies(s => !s)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left"
          >
            <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">
              Why these fills?
            </span>
            {showStrategies
              ? <ChevronUp size={13} className="text-[#55556a]" />
              : <ChevronDown size={13} className="text-[#55556a]" />
            }
          </button>
          {showStrategies && (
            <div className="px-3 pb-3 space-y-1.5 border-t border-[#1a1a24]">
              {fillStrategies.map((s, i) => (
                <div key={i} className="flex items-start gap-2 pt-1.5">
                  <span className="text-[#a855f7] text-[10px] mt-0.5">•</span>
                  <div>
                    <span className="text-xs text-[#f0f0f5] font-medium">{strategyLabel(s)}</span>
                    <p className="text-[10px] text-[#55556a] mt-0.5">{STRATEGY_DESCRIPTIONS[s]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STRATEGY_DESCRIPTIONS = {
  'depth-anchor':      'A very dark tone inheriting the palette\'s undertone — anchors the whole composition.',
  'luminous-field':    'A barely-tinted near-white — adds breathing room and surface options.',
  'tinted-neutral':    'A near-neutral with the palette\'s dominant undertone — grounding without competing.',
  'cool-counterpoint': 'A restrained cool note in a warm palette — adds life without clashing.',
  'warm-counterpoint': 'A warm note in a cool palette — adds humanity and prevents the palette from feeling cold.',
  'off-complement':    'Near-complement at 155–170° instead of 180° — creates focal tension that feels intentional, not mechanical.',
  'gap-bridge':        'Bridges the largest hue gap at a non-obvious position — fills the story, not just the wheel.',
  'tonal-echo':        'Same DNA as an existing color, shifted to very different lightness — depth without introducing a new personality.',
  'chroma-pop':        'One saturated accent to lift a muted palette — one note of color goes a long way.',
  'muted-anchor':      'A quiet, low-chroma tone to ground an electric palette — the stillness that makes the vibrant sing.',
  'organic-harmonic':  'Golden-angle distribution from the palette\'s hue center — varied enough to feel human, coherent enough to feel designed.',
};
