import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export default function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl"
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        ref={modalRef}
        className={`
          relative w-full ${sizeClasses[size]} bg-surface dark:bg-slate-800 rounded-2xl shadow-2xl 
          border border-border-default dark:border-slate-700 max-h-[90vh] overflow-hidden
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-slate-700">
            <h2 className="text-xl font-semibold text-brand-text-primary dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="
                p-2 rounded-lg text-brand-text-secondary hover:text-brand-text-primary 
                hover:bg-surface-hover dark:text-gray-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors duration-150
              "
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        )}
        
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
