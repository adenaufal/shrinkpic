export interface CompressionPreset {
  id: string;
  name: string;
  description: string;
  quality: number;
  maxWidth: number;
  format: 'jpeg' | 'png' | 'webp';
  icon?: string;
}

export const COMPRESSION_PRESETS: CompressionPreset[] = [
  {
    id: 'web',
    name: 'Web Optimized',
    description: 'Perfect for websites and blogs',
    quality: 0.75,
    maxWidth: 1920,
    format: 'webp',
    icon: '🌐',
  },
  {
    id: 'social',
    name: 'Social Media',
    description: 'Optimized for Instagram, Facebook, Twitter',
    quality: 0.8,
    maxWidth: 1200,
    format: 'jpeg',
    icon: '📱',
  },
  {
    id: 'email',
    name: 'Email Attachment',
    description: 'Small file size for email',
    quality: 0.65,
    maxWidth: 800,
    format: 'jpeg',
    icon: '📧',
  },
  {
    id: 'print',
    name: 'Print Quality',
    description: 'High quality for printing',
    quality: 0.95,
    // PNG re-encodes of photographic sources are routinely several times
    // LARGER than the input, which made this preset the worst of the set.
    // Lossless PNG is still one click away in the format switcher.
    format: 'jpeg',
    maxWidth: 2560,
    icon: '🖨️',
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Your own settings',
    quality: 0.7,
    maxWidth: 1200,
    format: 'jpeg',
    icon: '⚙️',
  },
];

export const getPresetById = (id: string): CompressionPreset | undefined => {
  return COMPRESSION_PRESETS.find((preset) => preset.id === id);
};

export const getDefaultPreset = (): CompressionPreset => {
  return COMPRESSION_PRESETS[0]; // Web Optimized
};
