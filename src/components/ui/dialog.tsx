import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '../../lib/utils';

/**
 * Thin wrapper over Radix Dialog. Built on the primitive rather than a bespoke
 * overlay so focus trapping, focus restore, Escape and body scroll lock come
 * for free. Styling uses concrete Tailwind classes — this project does not
 * define the shadcn semantic colour tokens.
 */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
          'max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl',
          'dark:border-dark-border dark:bg-dark-card',
          'focus:outline-none',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('pr-8 text-lg font-semibold text-gray-900 dark:text-gray-100', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('mt-1 text-sm text-gray-600 dark:text-gray-400', className)}
      {...props}
    />
  );
}

/**
 * Unopinionated large-modal panel: positioning, sizing and clipping only — no
 * padding, no built-in close button. Callers own their own header/content
 * (scrollable)/footer sections, exactly like the hand-rolled overlays this
 * replaces did. Use `DialogContent` above for small single-block dialogs.
 */
function DialogPanel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
          'flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl',
          'dark:border-dark-border dark:bg-dark-card',
          'focus:outline-none',
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogPanel,
  DialogTitle,
  DialogDescription,
};
