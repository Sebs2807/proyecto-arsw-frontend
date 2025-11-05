import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}

const ModalBase: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = "max-w-md",
}) => {
  // Cierra el modal con la tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`relative w-full ${width} bg-dark-800 text-text-primary rounded-xl shadow-lg border border-dark-600 p-6 animate-fadeIn`}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 p-1 rounded-full text-text-muted hover:text-text-secondary transition"
        >
          <X size={18} />
        </button>

        {title && (
          <h2 className="text-lg font-semibold mb-4 text-text-secondary border-b border-dark-600 pb-2">
            {title}
          </h2>
        )}

        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
};

export default ModalBase;
