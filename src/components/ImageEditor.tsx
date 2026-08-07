import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  Crop,
  Sliders,
  Check,
  RefreshCw,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageEditorProps {
  file: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ file, onSave, onCancel }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
  });
  const [activeTab, setActiveTab] = useState<'rotate' | 'filters'>('rotate');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Draw image with all transformations
  const drawImage = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !image.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate dimensions based on rotation
    const angle = (rotation * Math.PI) / 180;
    const isRotated90 = rotation % 180 !== 0;

    const width = isRotated90 ? image.height : image.width;
    const height = isRotated90 ? image.width : image.height;

    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Save context state
    ctx.save();

    // Move to center
    ctx.translate(width / 2, height / 2);

    // Apply rotation
    ctx.rotate(angle);

    // Apply flips
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Apply filters
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px)`;

    // Draw image centered
    ctx.drawImage(image, -image.width / 2, -image.height / 2);

    // Restore context
    ctx.restore();
  };

  // Redraw whenever any transformation changes
  useEffect(() => {
    if (imageRef.current?.complete) {
      drawImage();
    }
  }, [rotation, flipH, flipV, filters]);

  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees + 360) % 360);
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
    });
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error('Could not save the edit — the image may be too large for this device.');
          return;
        }

        // Name the file after the bytes we actually produced: `toBlob` silently
        // falls back to PNG when it cannot encode the requested type.
        const base = file.name.replace(/\.[^/.]+$/, '') || 'image';
        const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';

        onSave(
          new File([blob], `${base}.${extension}`, {
            type: blob.type,
            lastModified: Date.now(),
          })
        );
      },
      file.type || 'image/jpeg',
      0.95
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-6xl bg-white dark:bg-dark-card rounded-xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-dark-border">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
              Edit Image
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {file.name}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close editor"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-dark-border px-4 md:px-6">
          <button
            onClick={() => setActiveTab('rotate')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'rotate'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Crop className="w-4 h-4 inline mr-2" />
            Rotate & Flip
          </button>
          <button
            onClick={() => setActiveTab('filters')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'filters'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Sliders className="w-4 h-4 inline mr-2" />
            Filters
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Preview */}
            <div className="lg:col-span-2">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Original"
                  className="hidden"
                  onLoad={drawImage}
                />
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[500px] object-contain"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {activeTab === 'rotate' && (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Rotation
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleRotate(-90)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-sm">Left</span>
                      </button>
                      <button
                        onClick={() => handleRotate(90)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                      >
                        <RotateCw className="w-4 h-4" />
                        <span className="text-sm">Right</span>
                      </button>
                    </div>
                    <div className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                      Current: {rotation}°
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Flip
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setFlipH(!flipH)}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          flipH
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        <FlipHorizontal className="w-4 h-4" />
                        <span className="text-sm">Horizontal</span>
                      </button>
                      <button
                        onClick={() => setFlipV(!flipV)}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          flipV
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        <FlipVertical className="w-4 h-4" />
                        <span className="text-sm">Vertical</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'filters' && (
                <div className="space-y-4">
                  <div>
                    <label className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <span>Brightness</span>
                      <span>{filters.brightness}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.brightness}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          brightness: Number(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <span>Contrast</span>
                      <span>{filters.contrast}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.contrast}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          contrast: Number(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <span>Saturation</span>
                      <span>{filters.saturation}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.saturation}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          saturation: Number(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <span>Blur</span>
                      <span>{filters.blur}px</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={filters.blur}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          blur: Number(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 md:p-6 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
