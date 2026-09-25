import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { modifierKeyLabel } from '../utils/platform';

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Lists the keyboard shortcuts `App` registers. Keep the two in step: this
 * table is documentation, not the source of the bindings.
 */
export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ open, onOpenChange }) => {
  const mod = modifierKeyLabel();

  const rows: { keys: string[]; label: string }[] = [
    { keys: [mod, 'V'], label: 'Paste images from the clipboard' },
    { keys: [mod, 'Enter'], label: 'Compress' },
    { keys: [mod, 'S'], label: 'Download everything as a ZIP' },
    { keys: [mod, 'Shift', 'D'], label: 'Download every image' },
    { keys: [mod, 'Shift', 'C'], label: 'Copy the first compressed image' },
    { keys: [mod, 'H'], label: 'Open the history' },
    { keys: ['Delete'], label: 'Clear the queue (with undo)' },
    { keys: ['?'], label: 'Show this list' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="shortcuts-summary">
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription id="shortcuts-summary">
          Everything the buttons do, without leaving the keyboard.
        </DialogDescription>

        <dl className="mt-5 divide-y divide-gray-100 dark:divide-dark-border">
          {rows.map(({ keys, label }) => (
            <div key={label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-sm text-gray-700 dark:text-gray-300">{label}</dt>
              <dd className="flex shrink-0 items-center gap-1">
                {keys.map((key) => (
                  <kbd key={key} className="kbd">
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
};
