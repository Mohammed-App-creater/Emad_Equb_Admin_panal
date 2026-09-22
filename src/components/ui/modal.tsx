import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
  title?: string;
  hideTitle?: boolean;
}

export function Modal({
  open,
  onOpenChange,
  children,
  showCloseButton = true,
  className,
  title,
  hideTitle = false,
}: ModalProps) {
  // The project's cn() is a plain string-joiner (no tailwind-merge), so a
  // baked-in max-w-md collides with consumer overrides like max-w-6xl and the
  // browser cascade picks the smaller value. Drop the default only when the
  // caller already supplies a base (non-responsive) max-w-* so consumer width
  // overrides win without breaking callers that rely on the default.
  const hasBaseMaxWidth = !!className && /(?:^|\s)max-w-/.test(className);
  const defaultClasses = hasBaseMaxWidth
    ? "fixed left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg z-50"
    : "fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg z-50";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content
          className={cn(defaultClasses, className)}
        >
          {title && (
            <Dialog.Title
              className={cn(
                hideTitle ? "sr-only" : "text-lg font-semibold mb-4"
              )}
            >
              {title}
            </Dialog.Title>
          )}
          {showCloseButton && (
            <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Optional: Export individual components for more flexibility
export const ModalRoot = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalPortal = Dialog.Portal;
export const ModalOverlay = Dialog.Overlay;
export const ModalContent = Dialog.Content;
export const ModalClose = Dialog.Close;
export const ModalTitle = Dialog.Title;
export const ModalDescription = Dialog.Description;