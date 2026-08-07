import React from 'react';
import { ChevronDown } from 'lucide-react';
import { COMPRESSION_PRESETS, getPresetById } from '../utils/presets';
import { isFormatSupported, type OutputFormat } from '../utils/imageCompression';

interface CompressionControlsProps {
  quality: number;
  onQualityChange: (quality: number) => void;
  maxWidth: number;
  onMaxWidthChange: (width: number) => void;
  format: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
  selectedPreset: string;
  onPresetChange: (presetId: string) => void;
}

const FORMATS: OutputFormat[] = ['jpeg', 'png', 'webp'];

/**
 * Settings only — the Compress and batch actions live in <ActionBar> so there
 * is exactly one place to act on the queue. Two decisions are on the surface
 * (preset and output format); quality and maximum dimension sit behind a
 * disclosure because a preset already answers both for most people.
 *
 * This component is mounted once and reflows; the previous version was
 * rendered twice (once per breakpoint) with two copies of every control.
 */
export const CompressionControls: React.FC<CompressionControlsProps> = ({
  quality,
  onQualityChange,
  maxWidth,
  onMaxWidthChange,
  format,
  onFormatChange,
  selectedPreset,
  onPresetChange,
}) => {
  // Preset resolution lives in App: this component only reports what the user
  // touched.
  const markCustom = () => {
    if (selectedPreset !== 'custom') {
      onPresetChange('custom');
    }
  };

  const handleQualityChange = (value: number) => {
    onQualityChange(value);
    markCustom();
  };

  const handleMaxWidthChange = (value: number) => {
    onMaxWidthChange(value);
    markCustom();
  };

  const handleFormatChange = (value: OutputFormat) => {
    onFormatChange(value);
    markCustom();
  };

  const presetDescription = getPresetById(selectedPreset)?.description;

  return (
    <section className="surface p-4 md:p-5" aria-labelledby="settings-heading">
      <h2
        id="settings-heading"
        className="text-sm font-semibold text-gray-900 dark:text-gray-100"
      >
        Settings
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="preset-select" className="field-label">
            Preset
          </label>
          <select
            id="preset-select"
            value={selectedPreset}
            onChange={(e) => onPresetChange(e.target.value)}
            className="field"
          >
            {COMPRESSION_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span id="format-group-label" className="field-label">
            Format
          </span>
          <div
            className="grid grid-cols-3 gap-1 rounded-xl border border-gray-200 p-1 dark:border-dark-border"
            role="group"
            aria-labelledby="format-group-label"
          >
            {FORMATS.map((fmt) => {
              const supported = isFormatSupported(fmt);
              const active = format === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleFormatChange(fmt)}
                  disabled={!supported}
                  className={`min-h-[2.25rem] rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? 'bg-brand-600 text-white dark:bg-brand-500'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                  aria-pressed={active}
                  title={supported ? undefined : `This browser cannot encode ${fmt.toUpperCase()}`}
                >
                  {fmt.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        {presetDescription ? `${presetDescription} · ` : ''}
        {format === 'png'
          ? 'PNG is lossless, so quality has no effect — photos usually come out larger and the original is kept when that happens.'
          : `${Math.round(quality * 100)}% quality, max ${maxWidth}px`}
      </p>

      <details className="group mt-4 border-t border-gray-200 pt-1 dark:border-dark-border">
        <summary className="flex min-h-[2.75rem] cursor-pointer list-none items-center justify-between text-sm font-medium text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-gray-300 [&::-webkit-details-marker]:hidden">
          Advanced
          <ChevronDown
            className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="grid gap-4 pb-1 sm:grid-cols-2">
          <div>
            <label htmlFor="quality-range" className="field-label">
              Quality: {Math.round(quality * 100)}%
            </label>
            <input
              id="quality-range"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={quality}
              disabled={format === 'png'}
              onChange={(e) => handleQualityChange(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer accent-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:accent-brand-500"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Smaller file</span>
              <span>Better quality</span>
            </div>
          </div>

          <div>
            <label htmlFor="max-dimension-select" className="field-label">
              Max dimension
            </label>
            <select
              id="max-dimension-select"
              value={maxWidth}
              onChange={(e) => handleMaxWidthChange(parseInt(e.target.value))}
              className="field"
            >
              <option value={800}>800px</option>
              <option value={1200}>1200px</option>
              <option value={1920}>1920px</option>
              <option value={2560}>2560px</option>
            </select>
          </div>
        </div>
      </details>
    </section>
  );
};
