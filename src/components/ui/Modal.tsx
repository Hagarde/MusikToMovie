import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
}

export function Modal({ isOpen, onClose, title, children, size = 'md', theme = 'dark' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    // Focus first interactive element once on mount
    const timer = setTimeout(() => {
      if (!modalRef.current) return;
      const inputs = modalRef.current.querySelectorAll<HTMLElement>(
        'input:not([type="range"]):not([type="hidden"]), select, textarea'
      );
      if (inputs.length > 0) {
        inputs[0].focus();
      } else {
        const anyFocusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (anyFocusable.length > 0) {
          anyFocusable[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative w-full ${sizeClasses[size]} ${
          isLight 
            ? 'bg-white text-stone-900 border-stone-200 shadow-2xl' 
            : 'bg-stone-900 text-stone-100 border-stone-800 shadow-2xl'
        } rounded-3xl border transform transition-all scale-100 opacity-100 flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
          isLight ? 'border-stone-200 bg-stone-50/80 rounded-t-3xl' : 'border-stone-800 bg-stone-900/80 rounded-t-3xl'
        }`}>
          <h2 id="modal-title" className={`text-lg sm:text-xl font-bold font-display ${
            isLight ? 'text-stone-900' : 'text-stone-100'
          }`}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isLight 
                ? 'text-stone-400 hover:text-stone-900 hover:bg-stone-200/70' 
                : 'text-stone-400 hover:text-rose-400 hover:bg-stone-800'
            }`}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
