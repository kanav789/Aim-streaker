"use client";

import { useEffect } from "react";
import { Button } from "./button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmModalProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      
      {/* Modal Container Card */}
      <div 
        className="w-full max-w-sm rounded-[2rem] border border-zinc-850 bg-zinc-950 p-6 shadow-2xl relative overflow-hidden transform scale-100 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative subtle background glow */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[80px] pointer-events-none ${
          isDestructive ? "bg-red-500/10" : "bg-accent/10"
        }`} />

        {/* Warning Icon Graphic */}
        <div className="flex justify-center mb-5">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
            isDestructive 
              ? "bg-red-500/10 border-red-500/20 text-red-500" 
              : "bg-accent/10 border-accent/20 text-accent"
          }`}>
            {isDestructive ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 6.6m-2.77 0-.34-6.6M9.25 2.25h5.5M3 6.3h18M4.91 6.3l1.22 13.9a2.25 2.25 0 0 0 2.25 2.25h7.24a2.25 2.25 0 0 0 2.25-2.25L19.09 6.3M9 6.3V4.5a1.8 1.8 0 0 1 1.8-1.8h2.4a1.8 1.8 0 0 1 1.8 1.8v1.8" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            )}
          </div>
        </div>

        {/* Text Details */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-black tracking-tight text-white mb-2">
            {title}
          </h3>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed px-1">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            onClick={onConfirm}
            className={`w-full ${
              isDestructive 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_15px_rgba(239,68,68,0.2)]" 
                : "bg-accent hover:bg-accent/90 text-black shadow-[0_4px_15px_rgba(163,255,18,0.2)]"
            }`}
          >
            {confirmLabel}
          </Button>

          <Button
            variant="secondary"
            onClick={onCancel}
            className="w-full border-zinc-850 hover:bg-zinc-900/40 text-zinc-300 font-semibold"
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
