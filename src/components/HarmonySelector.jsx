import React from 'react';
import { 
  Circle, 
  Triangle, 
  Square, 
  Pentagon, 
  Hexagon,
  Layers
} from 'lucide-react';
import { oklchToHex, getComplementary, getSplitComplementary, getTriadic, getTetradic, getAnalogous, getMonochromatic } from '../utils/colorUtils';

const HARMONIES = [
  {
    id: 'complementary',
    name: 'Complementary',
    icon: Circle,
    description: 'Opposite colors',
    generator: (color) => getComplementary(color, { withLightnessSpread: true })
  },
  {
    id: 'split-complementary',
    name: 'Split Comp.',
    icon: Triangle,
    description: 'Y-shaped spread',
    generator: (color) => getSplitComplementary(color, { withLightnessSpread: true })
  },
  {
    id: 'triadic',
    name: 'Triadic',
    icon: Triangle,
    description: 'Three equal parts',
    generator: (color) => getTriadic(color, { withLightnessSpread: true })
  },
  {
    id: 'tetradic',
    name: 'Tetradic',
    icon: Square,
    description: 'Four corners',
    generator: (color) => getTetradic(color, { withLightnessSpread: true })
  },
  {
    id: 'analogous',
    name: 'Analogous',
    icon: Layers,
    description: 'Adjacent colors',
    generator: (color) => getAnalogous(color, 5, 25, { withLightnessSpread: true })
  },
  {
    id: 'monochromatic',
    name: 'Mono',
    icon: Circle,
    description: 'Single hue',
    generator: (color) => getMonochromatic(color, 5, { withLightnessSpread: true })
  },
];

export default function HarmonySelector({ baseColor, onHarmonySelect, selectedHarmony }) {
  const handleSelect = (harmony) => {
    const colors = harmony.generator(baseColor);
    onHarmonySelect(harmony.id, colors);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs text-[#8888a0] uppercase tracking-wider font-medium">
        Harmony Type
      </h3>
      
      <div className="grid grid-cols-2 gap-2">
        {HARMONIES.map((harmony) => {
          const Icon = harmony.icon;
          const isSelected = selectedHarmony === harmony.id;
          const colors = harmony.generator(baseColor);
          
          return (
            <button
              key={harmony.id}
              onClick={() => handleSelect(harmony)}
              className={`
                group relative p-3 rounded-xl border transition-all text-left
                ${isSelected 
                  ? 'bg-[#ff6b4a]/10 border-[#ff6b4a]/40' 
                  : 'bg-[#12121a] border-[#1a1a24] hover:border-[#252530]'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon 
                  size={14} 
                  className={isSelected ? 'text-[#ff6b4a]' : 'text-[#55556a] group-hover:text-[#8888a0]'}
                />
                <span className={`text-xs font-medium ${isSelected ? 'text-[#ff6b4a]' : 'text-[#f0f0f5]'}`}>
                  {harmony.name}
                </span>
              </div>
              
              <p className="text-[10px] text-[#55556a] mb-2">
                {harmony.description}
              </p>

              {/* Mini color preview */}
              <div className="flex gap-0.5 h-3 rounded overflow-hidden">
                {colors.slice(0, 5).map((color, i) => (
                  <div 
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: oklchToHex(color) }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}