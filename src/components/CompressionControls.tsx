import React from 'react';
import { Settings, Zap, Download, Copy, Trash2, Archive } from 'lucide-react';
import { COMPRESSION_PRESETS } from '../utils/presets';
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
  onCompress: () => void;
  onDownloadAll: () => void;
  onDownloadAsZip: () => void;
  onCopyImage: () => void;
  onClearAll: () => void;
  isProcessing: boolean;
  hasImages: boolean;
  hasResults: boolean;
}

export const CompressionControls: React.FC<CompressionControlsProps> = ({
  quality,
  onQualityChange,
  maxWidth,
  onMaxWidthChange,
  format,
  onFormatChange,
  selectedPreset,
  onPresetChange,
  onCompress,
  onDownloadAll,
  onDownloadAsZip,
  onCopyImage,
  onClearAll,
  isProcessing,
  hasImages,
  hasResults,
}) => {
  // Preset resolution lives in App: this component only reports what the user
  // touched. Applying presets from an effect in here ran twice (the controls
  // are mounted for both breakpoints) and could clobber in-flight settings.
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

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-2 md:p-6 shadow-lg border border-gray-100 dark:border-dark-border transition-colors duration-300">
      <div className="flex items-center space-x-1.5 mb-2 md:mb-6">
        <Settings className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-gray-100">Compression Settings</h2>
      </div>

      <div className="space-y-2 md:space-y-6">
        {/* Preset Selector */}
        <div>
          <label
            htmlFor="preset-select"
            className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-3"
          >
            Quick Presets
          </label>
          <select
            id="preset-select"
            value={selectedPreset}
            onChange={(e) => onPresetChange(e.target.value)}
            className="w-full p-1.5 md:p-3 text-xs md:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md md:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {COMPRESSION_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.icon} {preset.name} - {preset.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="quality-range"
            className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-3"
          >
            Quality: {Math.round(quality * 100)}%
            {format === 'png' && (
              <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                (PNG is lossless — quality has no effect)
              </span>
            )}
          </label>
          <div className="relative">
            <input
              id="quality-range"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={quality}
              disabled={format === 'png'}
              onChange={(e) => handleQualityChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span className="text-xs">High compression</span>
              <span className="text-xs">Best quality</span>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="max-dimension-select"
            className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-3"
          >
            Max Dimension: {maxWidth}px
          </label>
          <select
            id="max-dimension-select"
            value={maxWidth}
            onChange={(e) => handleMaxWidthChange(parseInt(e.target.value))}
            className="w-full p-1.5 md:p-3 text-xs md:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md md:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={800}>800px (Small)</option>
            <option value={1200}>1200px (Medium)</option>
            <option value={1920}>1920px (Large)</option>
            <option value={2560}>2560px (Extra Large)</option>
          </select>
        </div>

        <div>
          <span
            id="format-group-label"
            className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-3"
          >
            Output Format
          </span>
          <div className="grid grid-cols-3 gap-0.5 md:gap-2" role="group" aria-labelledby="format-group-label">
            {(['jpeg', 'png', 'webp'] as const).map((fmt) => {
              const supported = isFormatSupported(fmt);
              return (
                <button
                  key={fmt}
                  onClick={() => handleFormatChange(fmt)}
                  disabled={!supported}
                  className={`p-1 md:p-3 text-xs md:text-sm font-medium rounded-md md:rounded-lg transition-all duration-200 transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                    format === fmt
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  aria-label={`Select ${fmt.toUpperCase()} format`}
                  aria-pressed={format === fmt}
                  title={supported ? undefined : `This browser cannot encode ${fmt.toUpperCase()}`}
                >
                  {fmt.toUpperCase()}
                </button>
              );
            })}
          </div>
          {format === 'png' && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              PNG is lossless — photos usually come out larger. The original is kept when that happens.
            </p>
          )}
        </div>

        <div className="space-y-1 md:space-y-3 pt-1.5 md:pt-4">
          <button
            onClick={onCompress}
            disabled={!hasImages || isProcessing}
            className="w-full flex items-center justify-center space-x-1 bg-blue-600 dark:bg-blue-500 text-white px-1.5 md:px-4 py-1 md:py-3 rounded-md md:rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform active:scale-95 text-xs md:text-base"
            aria-label={isProcessing ? 'Compressing images' : 'Compress images'}
          >
            <Zap className="w-3 h-3 md:w-4 md:h-4" />
            <span>
              {isProcessing ? 'Compressing...' : 'Compress Images'}
            </span>
          </button>

          {hasResults && (
            <>
              <div className="grid grid-cols-2 gap-0.5 md:gap-2">
                <button
                  onClick={onCopyImage}
                  className="flex items-center justify-center space-x-0.5 bg-green-600 dark:bg-green-500 text-white px-1 md:px-3 py-1 md:py-2.5 rounded-md md:rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-all duration-200 transform active:scale-95 text-xs md:text-sm"
                  aria-label="Copy the first compressed image to the clipboard"
                  title="The clipboard holds one image at a time"
                >
                  <Copy className="w-3 h-3 md:w-4 md:h-4" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={onDownloadAll}
                  className="flex items-center justify-center space-x-0.5 bg-purple-600 dark:bg-purple-500 text-white px-1 md:px-3 py-1 md:py-2.5 rounded-md md:rounded-lg font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-all duration-200 transform active:scale-95 text-xs md:text-sm"
                  aria-label="Download all compressed images"
                >
                  <Download className="w-3 h-3 md:w-4 md:h-4" />
                  <span>Download</span>
                </button>
              </div>
              <button
                onClick={onDownloadAsZip}
                className="w-full flex items-center justify-center space-x-1 md:space-x-2 bg-indigo-600 dark:bg-indigo-500 text-white px-1 md:px-3 py-1 md:py-2.5 rounded-md md:rounded-lg font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all duration-200 transform active:scale-95 text-xs md:text-sm"
                aria-label="Download all as ZIP file"
              >
                <Archive className="w-3 h-3 md:w-4 md:h-4" />
                <span>Download as ZIP</span>
              </button>
            </>
          )}

          {hasImages && (
            <button
              onClick={onClearAll}
              disabled={isProcessing}
              className="w-full flex items-center justify-center space-x-1 md:space-x-2 bg-red-600 dark:bg-red-500 text-white px-1 md:px-3 py-1 md:py-2.5 rounded-md md:rounded-lg font-medium hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform active:scale-95 text-xs md:text-sm"
              aria-label="Clear all images"
            >
              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
