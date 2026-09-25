import React, { useState } from 'react';
import { ChevronDown, Globe, Mail, Printer, Smartphone, type LucideIcon } from 'lucide-react';
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

const FORMAT_LABEL: Record<OutputFormat, string> = { jpeg: 'JPEG', png: 'PNG', webp: 'WebP' };

/** Short tile labels and icons; the full preset names stay in presets.ts. */
const PRESET_TILES: Record<string, { label: string; icon: LucideIcon }> = {
  web: { label: 'Web', icon: Globe },
  social: { label: 'Social', icon: Smartphone },
  email: { label: 'Email', icon: Mail },
  print: { label: 'Print', icon: Printer },
};

// "Custom" is not a tile: it is the state the controls fall into as soon as
// the user changes anything by hand, and choosing it did nothing on its own.
const TILE_PRESETS = COMPRESSION_PRESETS.filter((preset) => preset.id in PRESET_TILES);

/**
 * Settings only — the batch actions live in <ActionBar>. Presets are visible
 * tiles rather than a dropdown, so the four starting points and what each
 * one does can be compared at a glance; format sits under them, and quality
 * and maximum dimension stay behind a disclosure because a preset already
 * answers both for most people.
 *
 * Below `lg` the card folds to a one-line summary, keeping the queue on
 * screen; from `lg` up it lives in the sidebar and is always open.
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
  const [open, setOpen] = useState(false);

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

  const preset = getPresetById(selectedPreset);
  const activeFormatIndex = FORMATS.indexOf(format);
  const qualityText = format === 'png' ? 'lossless' : `${Math.round(quality * 100)}%`;
  const presetLabel = PRESET_TILES[selectedPreset]?.label ?? 'Custom';
  const summary = `${presetLabel} · ${FORMAT_LABEL[format]} · ${qualityText} · ${maxWidth}px`;

  return (
    <section className="surface animate-fade-up p-4 [animation-delay:60ms]" aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {/* Below `lg` the heading is the disclosure button (the WAI-ARIA
            accordion pattern: a button inside the heading). */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="settings-body"
          className="-m-2 flex min-h-[2.75rem] w-[calc(100%+1rem)] items-center gap-3 rounded-xl p-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden"
        >
          <span className="shrink-0">Settings</span>
          <span className="min-w-0 flex-1 truncate text-right text-xs font-normal text-gray-500 dark:text-gray-400">
            {summary}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <span className="hidden lg:inline">Settings</span>
      </h2>

      <div id="settings-body" className={`${open ? 'block animate-fade-up' : 'hidden'} lg:block lg:animate-none`}>
        <fieldset className="mt-4">
          <legend className="field-label">Preset</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {TILE_PRESETS.map((tile) => {
              const { label, icon: Icon } = PRESET_TILES[tile.id];
              return (
                <label key={tile.id} className="relative cursor-pointer" title={tile.name}>
                  <input
                    type="radio"
                    name="preset"
                    value={tile.id}
                    checked={selectedPreset === tile.id}
                    onChange={() => onPresetChange(tile.id)}
                    className="peer sr-only"
                  />
                  <span className="flex h-full flex-col gap-1 rounded-xl border border-gray-200 px-3 py-2.5 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-brand-300 active:scale-[0.98] peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:shadow-sm peer-checked:shadow-brand-600/10 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 dark:border-dark-border dark:hover:border-brand-500/60 dark:peer-checked:border-brand-400 dark:peer-checked:bg-brand-500/10 dark:peer-focus-visible:ring-offset-dark-card">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <Icon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden="true" />
                      {label}
                    </span>
                    <span className="text-[11px] leading-tight text-gray-500 dark:text-gray-400">
                      {FORMAT_LABEL[tile.format]} · {Math.round(tile.quality * 100)}% · {tile.maxWidth}px
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-4">
          <span id="format-group-label" className="field-label">
            Format
          </span>
          {/* One highlight pill slides between the options rather than each
              button painting its own background. */}
          <div
            className="relative grid grid-cols-3 rounded-xl border border-gray-200 p-1 dark:border-dark-border"
            role="group"
            aria-labelledby="format-group-label"
          >
            {activeFormatIndex >= 0 && (
              <span
                aria-hidden="true"
                className="absolute bottom-1 left-1 top-1 rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 shadow-sm shadow-brand-600/30 transition-transform duration-500"
                style={{
                  width: `calc((100% - 0.5rem) / ${FORMATS.length})`,
                  transform: `translateX(${activeFormatIndex * 100}%)`,
                  // Inline: an arbitrary easing class is ambiguous next
                  // to the easing utilities tailwindcss-animate adds.
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
                }}
              />
            )}
            {FORMATS.map((fmt) => {
              const supported = isFormatSupported(fmt);
              const active = format === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleFormatChange(fmt)}
                  disabled={!supported}
                  className={`relative min-h-[2.5rem] rounded-lg text-sm font-medium transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? 'text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                  aria-pressed={active}
                  title={supported ? undefined : `This browser cannot encode ${fmt.toUpperCase()}`}
                >
                  {FORMAT_LABEL[fmt]}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {selectedPreset === 'custom'
            ? 'Custom settings. Pick a preset to start over. '
            : preset?.description
            ? `${preset.description}. `
            : ''}
          {format === 'png'
            ? 'PNG is lossless, so quality has no effect — photos usually come out larger, and the original is kept when that happens.'
            : `${Math.round(quality * 100)}% quality, longest side at most ${maxWidth}px.`}
        </p>

        <details className="group mt-3 border-t border-gray-200 pt-1 dark:border-dark-border">
          <summary className="flex min-h-[2.75rem] cursor-pointer list-none items-center justify-between text-sm font-medium text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-gray-300 [&::-webkit-details-marker]:hidden">
            Fine-tune
            <ChevronDown
              className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>

          {/* Hidden content is display:none, so this entrance replays each time
              the disclosure opens. */}
          <div className="grid animate-fade-up gap-4 pb-1 sm:grid-cols-2 lg:grid-cols-1">
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
      </div>
    </section>
  );
};
