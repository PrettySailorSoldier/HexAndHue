import React, { useState, useEffect } from 'react';
import { Sparkles, Lightbulb, Palette, Eye, Layers } from 'lucide-react';
import {
  analyzeColorMood,
  generateVibeCompanions,
  findVibeAccent,
  findVibeBackgrounds,
  getVibePreset,
  generateDesignPalette
} from '../utils/vibeHarmony';
import { oklchToHex } from '../utils/colorUtils';

const PRESETS = [
  { id: 'dusty-romance', name: 'Dusty Romance', icon: '💕' },
  { id: 'midnight-jewel', name: 'Midnight Jewel', icon: '💎' },
  { id: 'morning-fog', name: 'Morning Fog', icon: '🌫️' },
  { id: 'desert-sun', name: 'Desert Sun', icon: '🌅' },
  { id: 'deep-forest', name: 'Deep Forest', icon: '🌲' },
  { id: 'neon-noir', name: 'Neon Noir', icon: '🌃' },
];

const PALETTE_MODES = [
  { id: 'vibe', label: 'Vibe' },
  { id: 'tonal', label: 'Tonal' },
  { id: 'expressive', label: 'Expressive' },
];

export default function VibeHarmony({ baseColor, onPaletteGenerate, onColorSelect }) {
  const [vibeResult, setVibeResult] = useState(null);
  const [designResult, setDesignResult] = useState(null);
  const [accentResult, setAccentResult] = useState(null);
  const [backgroundResult, setBackgroundResult] = useState(null);
  const [activeTab, setActiveTab] = useState('palette');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [accentIntensity, setAccentIntensity] = useState('balanced');
  const [paletteMode, setPaletteMode] = useState('vibe');

  // Generate palette when base color or palette mode changes
  useEffect(() => {
    if (!baseColor) return;

    // Always analyze vibe for mood header
    const result = generateVibeCompanions(baseColor, { count: 6 });
    setVibeResult(result);

    // Always generate accent and backgrounds
    setAccentResult(findVibeAccent(baseColor, { intensity: accentIntensity }));
    setBackgroundResult(findVibeBackgrounds(baseColor));

    if (paletteMode === 'vibe') {
      if (onPaletteGenerate && result.palette) {
        onPaletteGenerate(result.palette.map(p => p.color));
      }
    } else if (paletteMode === 'tonal') {
      const designRes = generateDesignPalette(baseColor, { mode: 'ui', count: 5 });
      setDesignResult(designRes);
      if (onPaletteGenerate) {
        onPaletteGenerate(designRes.palette.map(p => p.color));
      }
    } else if (paletteMode === 'expressive') {
      const designRes = generateDesignPalette(baseColor, { mode: 'expressive', count: 5 });
      setDesignResult(designRes);
      if (onPaletteGenerate) {
        onPaletteGenerate(designRes.palette.map(p => p.color));
      }
    }
  }, [baseColor, accentIntensity, paletteMode]);

  // Handle preset selection
  const handlePresetSelect = (presetId) => {
    if (!baseColor) return;
    setSelectedPreset(presetId);
    const result = getVibePreset(presetId, baseColor);
    setVibeResult(result);
    if (onPaletteGenerate && result.palette) {
      onPaletteGenerate(result.palette.map(p => p.color));
    }
  };

  if (!baseColor) {
    return (
      <div className="p-6 border border-dashed border-[#1a1a24] text-[#55556a] rounded-xl text-center">
        <Sparkles size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a color to see vibe harmonies</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Palette mode toggle */}
      <div className="flex gap-1 p-1 bg-[#0a0a0f] rounded-xl border border-[#1a1a24]">
        {PALETTE_MODES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setPaletteMode(id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              paletteMode === id
                ? 'bg-[#ff6b4a]/20 border-[#ff6b4a]/40 text-[#ff6b4a]'
                : 'bg-[#12121a] border-[#1a1a24] text-[#55556a] hover:text-[#8888a0]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Header with mood info */}
      {vibeResult && (
        <div className="bg-gradient-to-r from-[#ff6b4a]/10 to-[#a855f7]/10 rounded-xl p-4 border border-[#ff6b4a]/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-[#ff6b4a]" />
            <span className="text-sm font-medium text-[#f0f0f5] capitalize">
              {vibeResult.mood} Mood
            </span>
          </div>
          <p className="text-xs text-[#8888a0]">{vibeResult.moodDescription}</p>
          <div className="flex gap-2 mt-2 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-[#1a1a24] text-[#8888a0] capitalize">
              {vibeResult.energy} energy
            </span>
            <span className="px-2 py-0.5 rounded bg-[#1a1a24] text-[#8888a0] capitalize">
              {vibeResult.temperature} temp
            </span>
            <span className="px-2 py-0.5 rounded bg-[#1a1a24] text-[#8888a0] capitalize">
              {vibeResult.depth} depth
            </span>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 bg-[#0a0a0f] p-1 rounded-lg">
        {[
          { id: 'palette', label: 'Palette', icon: Palette },
          { id: 'accent', label: 'Accent', icon: Eye },
          { id: 'backgrounds', label: 'Backgrounds', icon: Layers },
          { id: 'presets', label: 'Presets', icon: Sparkles },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === id 
                ? 'bg-[#ff6b4a]/20 text-[#ff6b4a]' 
                : 'text-[#55556a] hover:text-[#8888a0]'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Palette Tab — Vibe mode */}
      {activeTab === 'palette' && paletteMode === 'vibe' && vibeResult && (
        <div className="space-y-3">
          <div className="space-y-2">
            {vibeResult.palette.map((item, i) => (
              <button
                key={i}
                onClick={() => onColorSelect && onColorSelect(item.color)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a24] transition-colors group"
              >
                <div
                  className="w-10 h-10 rounded-lg shadow-lg transition-transform group-hover:scale-105"
                  style={{ backgroundColor: oklchToHex(item.color) }}
                />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#f0f0f5]">
                      {oklchToHex(item.color)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a24] text-[#8888a0] capitalize">
                      {item.role}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#55556a] mt-0.5">{item.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Tips */}
          {vibeResult.tips && (
            <div className="bg-[#12121a] rounded-lg p-3 border border-[#1a1a24]">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={12} className="text-[#fbbf24]" />
                <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">Why this works</span>
              </div>
              <ul className="space-y-1">
                {vibeResult.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-[#8888a0] flex gap-2">
                    <span className="text-[#ff6b4a]">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Palette Tab — Tonal / Expressive mode */}
      {activeTab === 'palette' && paletteMode !== 'vibe' && designResult && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {designResult.palette.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <button
                  onClick={() => onColorSelect && onColorSelect(item.color)}
                  className="w-full aspect-square rounded-lg shadow-lg transition-transform hover:scale-105"
                  style={{ backgroundColor: oklchToHex(item.color) }}
                  title={oklchToHex(item.color)}
                />
                <span className="text-[10px] text-[#55556a] uppercase tracking-wider text-center mt-1 leading-tight">
                  {item.role}
                </span>
              </div>
            ))}
          </div>

          {/* Tips */}
          {designResult.tips && (
            <div className="bg-[#12121a] rounded-lg p-3 border border-[#1a1a24]">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={12} className="text-[#fbbf24]" />
                <span className="text-[10px] text-[#8888a0] uppercase tracking-wider">Design notes</span>
              </div>
              <ul className="space-y-1">
                {designResult.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-[#8888a0] flex gap-2">
                    <span className="text-[#ff6b4a]">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Accent Tab */}
      {activeTab === 'accent' && accentResult && (
        <div className="space-y-4">
          {/* Intensity selector */}
          <div className="space-y-2">
            <label className="text-xs text-[#8888a0]">Intensity</label>
            <div className="flex gap-2">
              {['subtle', 'balanced', 'bold'].map((intensity) => (
                <button
                  key={intensity}
                  onClick={() => setAccentIntensity(intensity)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                    accentIntensity === intensity
                      ? 'bg-[#ff6b4a]/20 text-[#ff6b4a]'
                      : 'bg-[#12121a] text-[#8888a0] hover:bg-[#1a1a24]'
                  }`}
                >
                  {intensity}
                </button>
              ))}
            </div>
          </div>

          {/* Main accent */}
          <div className="space-y-2">
            <label className="text-xs text-[#8888a0]">Recommended Accent</label>
            <button
              onClick={() => onColorSelect && onColorSelect(accentResult.accent)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#12121a] border border-[#1a1a24] hover:border-[#252530] transition-colors"
            >
              <div 
                className="w-14 h-14 rounded-xl shadow-lg"
                style={{ backgroundColor: oklchToHex(accentResult.accent) }}
              />
              <div className="text-left">
                <span className="text-sm font-mono text-[#f0f0f5]">
                  {oklchToHex(accentResult.accent)}
                </span>
                <p className="text-xs text-[#55556a] mt-1">Click to select</p>
              </div>
            </button>
          </div>

          {/* Alternatives */}
          <div className="space-y-2">
            <label className="text-xs text-[#8888a0]">Alternatives</label>
            <div className="flex gap-2">
              {accentResult.alternatives.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => onColorSelect && onColorSelect(alt)}
                  className="flex-1 h-12 rounded-lg shadow transition-transform hover:scale-105"
                  style={{ backgroundColor: oklchToHex(alt) }}
                  title={oklchToHex(alt)}
                />
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-[#12121a] rounded-lg p-3 border border-[#1a1a24]">
            <p className="text-xs text-[#8888a0]">{accentResult.explanation}</p>
          </div>
        </div>
      )}

      {/* Backgrounds Tab */}
      {activeTab === 'backgrounds' && backgroundResult && (
        <div className="space-y-3">
          <p className="text-xs text-[#8888a0]">{backgroundResult.recommendation}</p>
          
          <div className="grid grid-cols-2 gap-2">
            {backgroundResult.backgrounds.map((bg, i) => (
              <button
                key={i}
                onClick={() => onColorSelect && onColorSelect(bg.color)}
                className="group relative aspect-square rounded-xl overflow-hidden border border-[#1a1a24] hover:border-[#252530] transition-colors"
                style={{ backgroundColor: oklchToHex(bg.color) }}
              >
                {/* Sample text to show contrast */}
                <div 
                  className="absolute inset-0 flex items-center justify-center p-3"
                  style={{ color: baseColor ? oklchToHex(baseColor) : '#fff' }}
                >
                  <div className="text-center">
                    <div className="text-lg font-bold">Aa</div>
                    <div className="text-xs opacity-70">Sample</div>
                  </div>
                </div>
                
                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-white font-medium">{bg.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Presets Tab */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset.id)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'bg-[#ff6b4a]/10 border-[#ff6b4a]/40'
                    : 'bg-[#12121a] border-[#1a1a24] hover:border-[#252530]'
                }`}
              >
                <span className="text-lg">{preset.icon}</span>
                <p className={`text-xs font-medium mt-1 ${isSelected ? 'text-[#ff6b4a]' : 'text-[#f0f0f5]'}`}>
                  {preset.name}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
