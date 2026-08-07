import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogClose, DialogPanel } from './ui/dialog';

interface ImageEditorProps {
  file: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
  /**
   * Locks the "Apply changes" action — set while a batch is running, because
   * applying an edit to a file that is mid-compression lets the in-flight job
   * write its pre-edit result back onto the edited image.
   */
  disabled?: boolean;
}

interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  file,
  onSave,
  onCancel,
  disabled = false,
}) => {
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
  const drawImage = useCallback(() => {
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
  }, [rotation, flipH, flipV, filters]);

  // Redraw whenever any transformation changes
  useEffect(() => {
    if (imageRef.current?.complete) {
      drawImage();
    }
  }, [drawImage]);

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
    if (!canvas || disabled) return;

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogPanel className="max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 dark:border-dark-border md:p-6">
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Edit image
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
              {file.name}
            </DialogPrimitive.Description>
          </div>
          <DialogClose asChild>
            <button
              className="btn btn-ghost btn-icon -mr-2"
              aria-label="Close editor"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </DialogClose>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-dark-border px-4 md:px-6">
          <button
            onClick={() => setActiveTab('rotate')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'rotate'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
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
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
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
              <div className="flex min-h-[14rem] items-center justify-center rounded-xl bg-gray-100 p-4 dark:bg-gray-800 md:min-h-[24rem]">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Original"
                  className="hidden"
                  onLoad={drawImage}
                />
                <canvas
                  ref={canvasRef}
                  className="max-h-[40vh] max-w-full object-contain md:max-h-[31rem]"
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
                        className="btn btn-secondary"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-sm">Left</span>
                      </button>
                      <button
                        onClick={() => handleRotate(90)}
                        className="btn btn-secondary"
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
                        aria-pressed={flipH}
                        className={`btn ${flipH ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        <FlipHorizontal className="w-4 h-4" />
                        <span className="text-sm">Horizontal</span>
                      </button>
                      <button
                        onClick={() => setFlipV(!flipV)}
                        aria-pressed={flipV}
                        className={`btn ${flipV ? 'btn-primary' : 'btn-secondary'}`}
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
                    <label
                      htmlFor="filter-brightness"
                      className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      <span>Brightness</span>
                      <span>{filters.brightness}%</span>
                    </label>
                    <input
                      id="filter-brightness"
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
                      className="w-full cursor-pointer accent-brand-600 dark:accent-brand-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="filter-contrast"
                      className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      <span>Contrast</span>
                      <span>{filters.contrast}%</span>
                    </label>
                    <input
                      id="filter-contrast"
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
                      className="w-full cursor-pointer accent-brand-600 dark:accent-brand-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="filter-saturation"
                      className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      <span>Saturation</span>
                      <span>{filters.saturation}%</span>
                    </label>
                    <input
                      id="filter-saturation"
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
                      className="w-full cursor-pointer accent-brand-600 dark:accent-brand-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="filter-blur"
                      className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      <span>Blur</span>
                      <span>{filters.blur}px</span>
                    </label>
                    <input
                      id="filter-blur"
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
                      className="w-full cursor-pointer accent-brand-600 dark:accent-brand-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
                <button
                  onClick={handleReset}
                  className="btn btn-secondary w-full"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset all
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 p-4 dark:border-dark-border md:px-6">
          <button
            onClick={onCancel}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={disabled}
            title={disabled ? 'Available once compression finishes' : undefined}
            className="btn btn-primary"
          >
            <Check className="w-4 h-4" />
            Apply changes
          </button>
        </div>
      </DialogPanel>
    </Dialog>
  );
};
