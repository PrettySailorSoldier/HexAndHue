import { useState, useCallback, useEffect } from 'react';
import { 
  Palette, Sparkles, Layers, Grid3X3, Image, 
  Blend, BookOpen, Eye, Star, TrendingUp, FlaskConical, Waves,
  Download, Sun
} from 'lucide-react';
import { parse } from 'culori';

import PaletteDoctor from './components/PaletteDoctor';
import ContextSelector from './components/ContextSelector';

import ColorWheel from './components/ColorWheel';
import ColorSliders from './components/ColorSliders';
import ColorInfoPanel from './components/ColorInfoPanel';
import HarmonySelector from './components/HarmonySelector';
import HarmonyVisualizer from './components/HarmonyVisualizer';
import MoodSelector from './components/MoodSelector';
import PaletteDisplay from './components/PaletteDisplay';
import TintsShadePanel from './components/TintsShadePanel';
import ImageExtractor from './components/ImageExtractor';
import GradientGenerator from './components/GradientGenerator';
import ColorSearch from './components/ColorSearch';
import PaletteHistory, { usePaletteHistory } from './components/PaletteHistory';
import UIPreviewPanel from './components/UIPreviewPanel';
import CuratedPalettes from './components/CuratedPalettes';
import HarmonyMixer from './components/HarmonyMixer';
import VibeHarmony from './components/VibeHarmony';
import PaintMixer from './components/PaintMixer';
import ExportPanel from './components/ExportPanel';
import AccessibilityChecker from './components/AccessibilityChecker';
import ShadowHighlight from './components/ShadowHighlight';

import { 
  toOklch, 
  oklchToHex, 
  generateMoodPalette,
  generateRandomHarmony,
  getComplementary,
  getSplitComplementary,
  getTriadic,
  getTetradic,
  getAnalogous,
  getMonochromatic,
} from './utils/colorUtils';
import { generateSmartHarmony } from './utils/smartHarmony';
import { analyzePalette } from './utils/paletteAnalyzer';
import { generateColorName } from './utils/colorNames';

const DEFAULT_COLOR = { mode: 'oklch', l: 0.65, c: 0.18, h: 280 };

export default function App() {
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [colorFormat, setColorFormat] = useState('hex');
  const [activePalette, setActivePalette] = useState([]);
  const [activeTab, setActiveTab] = useState('harmonies');
  const [selectedHarmony, setSelectedHarmony] = useState('triadic');
  const [harmonyColors, setHarmonyColors] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodPalette, setMoodPalette] = useState([]);
  const [lockedIndices, setLockedIndices] = useState([]);
  const [designContext, setDesignContext] = useState('ui');

  const {
    history, favorites, addToHistory, removeFromHistory,
    removeFromFavorites, clearHistory, isFavorite, toggleFavorite
  } = usePaletteHistory();

  // Define updateHarmony BEFORE the useEffect that depends on it
  const updateHarmony = useCallback((harmonyType) => {
    if (!selectedColor) return;
    let colors;

    // If using smart context, generate context-aware palette
    if (harmonyType === 'smart') {
      colors = generateSmartHarmony(selectedColor, designContext);
    } else {
      // Original geometric harmonies
      switch (harmonyType) {
        case 'complementary': colors = getComplementary(selectedColor); break;
        case 'split-complementary': colors = getSplitComplementary(selectedColor); break;
        case 'triadic': colors = getTriadic(selectedColor); break;
        case 'tetradic': colors = getTetradic(selectedColor); break;
        case 'analogous': colors = getAnalogous(selectedColor, 5, 25); break;
        case 'monochromatic': colors = getMonochromatic(selectedColor); break;
        default: colors = getTriadic(selectedColor);
      }
    }

    setHarmonyColors(colors);
    setSelectedHarmony(harmonyType);
  }, [selectedColor, designContext]);

  useEffect(() => {
    if (selectedColor) updateHarmony(selectedHarmony);
  }, [selectedColor, selectedHarmony, updateHarmony]);

  useEffect(() => {
    if (harmonyColors.length > 0) setActivePalette(harmonyColors);
  }, [harmonyColors]);

  useEffect(() => {
    if (moodPalette.length > 0) setActivePalette(moodPalette);
  }, [moodPalette]);

  const handleColorSelect = useCallback((color) => setSelectedColor(color), []);

  const handleHarmonySelect = useCallback((harmonyId, colors) => {
    setSelectedHarmony(harmonyId);
    setHarmonyColors(colors);
    addToHistory(colors, `${harmonyId} harmony`);
  }, [addToHistory]);

  const handleApplyFix = useCallback((fixedColors) => {
    setActivePalette(fixedColors);
    setMoodPalette(fixedColors);
    setHarmonyColors(fixedColors);
    addToHistory(fixedColors, 'auto-fixed palette');
  }, [addToHistory]);

  const handleMoodSelect = useCallback((mood) => {
    setSelectedMood(mood);
    const palette = generateMoodPalette(mood, selectedColor);
    setMoodPalette(palette);
    setLockedIndices([]);
    addToHistory(palette, `${mood} mood`);
  }, [selectedColor, addToHistory]);

  const handleRegenerateMood = useCallback(() => {
    if (!selectedMood) return;
    const newPalette = generateMoodPalette(selectedMood, selectedColor);
    const mergedPalette = newPalette.map((color, i) => 
      lockedIndices.includes(i) ? moodPalette[i] : color
    );
    setMoodPalette(mergedPalette);
    addToHistory(mergedPalette, `${selectedMood} mood`);
  }, [selectedMood, selectedColor, moodPalette, lockedIndices, addToHistory]);

  const handleLockToggle = useCallback((index) => {
    setLockedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  }, []);

  const handleRandomPalette = useCallback(() => {
    const random = generateRandomHarmony({
      count: 5,
      harmonyType: ['analogous', 'complementary', 'triadic', 'tetradic'][Math.floor(Math.random() * 4)]
    });
    setMoodPalette(random);
    setActivePalette(random);
    setSelectedMood(null);
    addToHistory(random, 'random harmony');
  }, [addToHistory]);

  const handleHexInput = useCallback((hex) => {
    try {
      const parsed = parse(hex);
      if (parsed) {
        const oklch = toOklch(parsed);
        if (oklch) setSelectedColor(oklch);
      }
    } catch (e) {}
  }, []);

  const handlePaletteFromHistory = useCallback((colors) => {
    setActivePalette(colors);
    setMoodPalette(colors);
    if (colors[0]) setSelectedColor(colors[0]);
  }, []);

  const handleExtractedColors = useCallback((colors) => {
    setActivePalette(colors);
    setMoodPalette(colors);
    addToHistory(colors, 'extracted from image');
    if (colors[0]) setSelectedColor(colors[0]);
  }, [addToHistory]);

  const handleMixedPalette = useCallback((colors) => {
    setActivePalette(colors);
    setMoodPalette(colors);
    addToHistory(colors, 'harmony mix');
  }, [addToHistory]);

  const handleCuratedPalette = useCallback((colors) => {
    setActivePalette(colors);
    setMoodPalette(colors);
    addToHistory(colors, 'curated palette');
    if (colors[0]) setSelectedColor(colors[0]);
  }, [addToHistory]);

  const colorName = generateColorName(selectedColor);

  const TABS = [
    { id: 'harmonies', label: 'Harmonies', icon: Grid3X3 },
    { id: 'smart', label: 'Smart', icon: Sparkles },
    { id: 'vibe', label: 'Vibe', icon: Waves },
    { id: 'mood', label: 'Moods', icon: Sparkles },
    { id: 'extract', label: 'Extract', icon: Image },
    { id: 'gradient', label: 'Gradients', icon: Blend },
    { id: 'mixer', label: 'Mixer', icon: Layers },
    { id: 'inspire', label: 'Inspire', icon: BookOpen },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'shadow', label: 'Shadow', icon: Sun },
    { id: 'doctor', label: 'Doctor', icon: TrendingUp },
    { id: 'access', label: 'WCAG', icon: Eye },
    { id: 'paint', label: 'Paint', icon: FlaskConical },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <div className="app min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
      <header className="border-b border-[#1a1a24] px-4 lg:px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${oklchToHex(selectedColor)}, ${oklchToHex({ ...selectedColor, h: ((selectedColor.h || 0) + 60) % 360 })})`
              }}
            >
              <Palette size={18} className="text-white drop-shadow" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-tight">hex&hue</h1>
              <p className="text-[10px] text-[#55556a] hidden sm:block">Color Theory Studio</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 bg-[#12121a] rounded-lg p-1">
              {['hex', 'rgb', 'hsl', 'oklch'].map((format) => (
                <button
                  key={format}
                  onClick={() => setColorFormat(format)}
                  className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-medium transition-colors ${colorFormat === format ? 'bg-[#1a1a24] text-[#f0f0f5]' : 'text-[#55556a] hover:text-[#8888a0]'}`}
                >
                  {format}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => activePalette.length > 0 && toggleFavorite(activePalette)}
              className={`p-2 rounded-lg transition-colors ${activePalette.length > 0 && isFavorite(activePalette) ? 'bg-[#ff6b4a]/20 text-[#ff6b4a]' : 'bg-[#12121a] text-[#55556a] hover:text-[#8888a0]'}`}
              title="Save to favorites"
            >
              <Star size={16} className={activePalette.length > 0 && isFavorite(activePalette) ? 'fill-current' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-4 xl:col-span-3 space-y-5">
            <div className="bg-[#12121a] rounded-2xl p-5 border border-[#1a1a24]">
              <div className="flex items-center justify-center mb-4">
                <ColorWheel selectedColor={selectedColor} onColorSelect={handleColorSelect} size={240} />
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl shrink-0 shadow-lg" style={{ backgroundColor: oklchToHex(selectedColor) }} />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={oklchToHex(selectedColor)}
                    onChange={(e) => handleHexInput(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-[#1a1a24] rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#ff6b4a]/50"
                  />
                  <p className="text-xs text-[#55556a] mt-1 truncate">{colorName}</p>
                </div>
              </div>
              
              <ColorSliders color={selectedColor} onChange={handleColorSelect} />
            </div>

            <div className="bg-[#12121a] rounded-2xl p-5 border border-[#1a1a24]">
              <ColorSearch onColorSelect={handleColorSelect} />
            </div>

            <div className="bg-[#12121a] rounded-2xl p-5 border border-[#1a1a24] hidden lg:block">
              <ColorInfoPanel color={selectedColor} />
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-6 space-y-5">
            <div className="flex items-center gap-1 bg-[#12121a] rounded-xl p-1.5 border border-[#1a1a24] overflow-x-auto">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${activeTab === id ? 'bg-[#1a1a24] text-[#f0f0f5]' : 'text-[#55556a] hover:text-[#8888a0]'}`}
                >
                  <Icon size={16} />
                  <span className="text-xs font-medium hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            <div className="bg-[#12121a] rounded-2xl p-5 border border-[#1a1a24] min-h-[500px]">
              {activeTab === 'harmonies' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <HarmonySelector baseColor={selectedColor} onHarmonySelect={handleHarmonySelect} selectedHarmony={selectedHarmony} />
                    <div className="flex items-center justify-center">
                      <HarmonyVisualizer colors={harmonyColors} harmonyType={selectedHarmony} size={160} />
                    </div>
                  </div>
                  <PaletteDisplay colors={harmonyColors} title={`${selectedHarmony.replace('-', ' ')} Harmony`} format={colorFormat} onColorClick={handleColorSelect} />
                  <TintsShadePanel baseColor={selectedColor} onColorSelect={handleColorSelect} />
                </div>
              )}

              {activeTab === 'smart' && (
                <div className="space-y-6">
                  <ContextSelector 
                    selectedContext={designContext}
                    onContextSelect={(context) => {
                      setDesignContext(context);
                      updateHarmony('smart');
                    }}
                  />
                  
                  <button
                    onClick={() => updateHarmony('smart')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors"
                  >
                    <Sparkles size={16} />
                    <span className="text-sm font-medium">Generate Smart Palette</span>
                  </button>

                  {harmonyColors.length > 0 && (
                    <>
                      <PaletteDisplay 
                        colors={harmonyColors} 
                        title={`${designContext} palette`} 
                        format={colorFormat} 
                        onColorClick={handleColorSelect} 
                      />
                      
                      <div className="h-28 rounded-2xl overflow-hidden flex shadow-xl">
                        {harmonyColors.map((color, i) => (
                          <div 
                            key={i} 
                            className="flex-1 relative group cursor-pointer transition-all hover:flex-[1.5]" 
                            style={{ backgroundColor: oklchToHex(color) }} 
                            onClick={() => handleColorSelect(color)} 
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'doctor' && (
                <PaletteDoctor 
                  colors={activePalette.length > 0 ? activePalette : harmonyColors} 
                  onApplyFix={handleApplyFix}
                />
              )}

              {activeTab === 'vibe' && (
                <VibeHarmony
                  baseColor={selectedColor}
                  onPaletteGenerate={handleMixedPalette}
                  onColorSelect={handleColorSelect}
                />
              )}

              {activeTab === 'paint' && (
                <PaintMixer
                  baseColor={selectedColor}
                  onColorSelect={handleColorSelect}
                />
              )}

              {activeTab === 'export' && (
                <ExportPanel
                  colors={activePalette.length > 0 ? activePalette : harmonyColors}
                  paletteLabel={selectedHarmony || 'Palette'}
                />
              )}

              {activeTab === 'access' && (
                <AccessibilityChecker
                  colors={activePalette.length > 0 ? activePalette : harmonyColors}
                  baseColor={selectedColor}
                />
              )}

              {activeTab === 'shadow' && (
                <ShadowHighlight
                  baseColor={selectedColor}
                  onColorSelect={handleColorSelect}
                />
              )}

              {activeTab === 'mood' && (
                <div className="space-y-6">
                  <MoodSelector onMoodSelect={handleMoodSelect} selectedMood={selectedMood} baseColor={selectedColor} />
                  <div className="flex items-center gap-3">
                    <button onClick={handleRandomPalette} className="flex items-center gap-2 px-4 py-2 bg-[#1a1a24] hover:bg-[#252530] rounded-lg transition-colors">
                      <Sparkles size={16} className="text-[#ff6b4a]" />
                      <span className="text-sm">Random Harmony</span>
                    </button>
                  </div>
                  {moodPalette.length > 0 && (
                    <>
                      <PaletteDisplay colors={moodPalette} title={selectedMood ? `${selectedMood} palette` : 'Generated Palette'} format={colorFormat} onRegenerate={handleRegenerateMood} onColorClick={handleColorSelect} lockedIndices={lockedIndices} onLockToggle={handleLockToggle} />
                      <div className="h-28 rounded-2xl overflow-hidden flex shadow-xl">
                        {moodPalette.map((color, i) => (
                          <div key={i} className="flex-1 relative group cursor-pointer transition-all hover:flex-[1.5]" style={{ backgroundColor: oklchToHex(color) }} onClick={() => handleColorSelect(color)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'extract' && (
                <div className="space-y-6">
                  <ImageExtractor onColorsExtracted={handleExtractedColors} onColorSelect={handleColorSelect} />
                  {activePalette.length > 0 && (
                    <div className="h-24 rounded-2xl overflow-hidden flex shadow-xl">
                      {activePalette.map((color, i) => (
                        <div key={i} className="flex-1 cursor-pointer hover:flex-[1.3] transition-all" style={{ backgroundColor: oklchToHex(color) }} onClick={() => handleColorSelect(color)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'gradient' && (
                <GradientGenerator
                  baseColor={selectedColor}
                  initialColors={activePalette.length >= 2 ? activePalette.slice(0, 5) : [selectedColor, { ...selectedColor, h: ((selectedColor.h || 0) + 60) % 360 }]}
                  onColorSelect={handleColorSelect}
                />
              )}

              {activeTab === 'mixer' && (
                <div className="space-y-6">
                  <HarmonyMixer baseColor={selectedColor} onPaletteGenerate={handleMixedPalette} />
                  <TintsShadePanel baseColor={selectedColor} onColorSelect={handleColorSelect} />
                </div>
              )}

              {activeTab === 'inspire' && (
                <CuratedPalettes baseColor={selectedColor} onSelectPalette={handleCuratedPalette} />
              )}

              {activeTab === 'preview' && (
                <UIPreviewPanel colors={activePalette.length >= 3 ? activePalette : harmonyColors} />
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-5">
            <div className="bg-[#12121a] rounded-2xl p-5 border border-[#1a1a24]">
              <PaletteHistory history={history} favorites={favorites} onSelect={handlePaletteFromHistory} onRemove={removeFromHistory} onToggleFavorite={toggleFavorite} onClear={clearHistory} />
            </div>

            {activePalette.length > 0 && (
              <div className="bg-[#12121a] rounded-2xl p-5 border border-[#1a1a24]">
                <h3 className="text-xs text-[#8888a0] uppercase tracking-wider font-medium mb-3">Current Palette</h3>
                <div className="space-y-2">
                  {activePalette.slice(0, 6).map((color, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a24] cursor-pointer transition-colors" onClick={() => handleColorSelect(color)}>
                      <div className="w-8 h-8 rounded-lg shadow" style={{ backgroundColor: oklchToHex(color) }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-[#f0f0f5]">{oklchToHex(color)}</p>
                        <p className="text-[10px] text-[#55556a] truncate">{generateColorName(color)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-[#1a1a24] px-4 lg:px-6 py-4 mt-6">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between text-[10px] text-[#55556a]">
          <p>Built with OKLCH for perceptually uniform colors</p>
          <p className="hidden sm:block">Click any swatch to select • Lock colors to preserve</p>
        </div>
      </footer>
    </div>
  );
}
