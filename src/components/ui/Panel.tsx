import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  width?: number;
}

export function Panel({
  isOpen,
  onClose,
  title,
  children,
  className,
  width = 400,
}: PanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (optional, subtle) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: width, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: width, opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ width }}
            className={cn(
              "fixed top-0 right-0 bottom-0 z-50",
              "bg-bg-secondary/95 backdrop-blur-xl",
              "border-l border-border-default",
              "shadow-2xl shadow-black/40",
              "flex flex-col",
              className
            )}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
                <h3 className="text-sm font-medium text-text-primary">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded hover:bg-bg-hover"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 3l8 8M11 3l-8 8" />
                  </svg>
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
