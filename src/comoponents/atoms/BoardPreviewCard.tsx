import React from "react";

interface BoardPreviewCardProps {
  title: string;
  isActive?: boolean;
  color?: string; // 👈 color opcional
}

const BoardPreviewCard: React.FC<BoardPreviewCardProps> = ({
  title,
  isActive = false,
  color = "#1A1A3D", // 👈 color por defecto: card oscuro
}) => {
  return (
    <div
      className={`
        relative flex items-center justify-end w-full h-[120px] flex-shrink-0 rounded-xl overflow-hidden cursor-pointer
        border transition-all duration-300 ease-in-out transform
        ${
          isActive
            ? "border-dark-600 shadow-[0_0_12px_rgba(124,106,247,0.3)] scale-[1.05] my-3"
            : "border-dark-600 hover:border-limeyellow-500/40 hover:shadow-[0_0_12px_rgba(124,106,247,0.3)] hover:scale-[1.02]"
        }
      `}
      style={{
        backgroundColor: color,
      }}
    >
      {/* Capa de sombreado sutil */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>

      {/* Texto en esquina inferior derecha */}
      <div
        className={`absolute bottom-2 right-3 text-text-primary text-sm font-poppins font-medium tracking-wide z-10 drop-shadow-md transition-all ${
          isActive
            ? "text-dark-600 scale-110"
            : "text-text-secondary opacity-90"
        }`}
      >
        {title}
      </div>

      {/* Borde animado azul eléctrico */}
      {isActive && (
        <div className="absolute inset-0 rounded-xl border-[2px] border-limeyellow-500 animate-pulse pointer-events-none"></div>
      )}

      {/* Sombra interior sutil */}
      <div className="absolute inset-0 pointer-events-none shadow-inner shadow-black/40"></div>
    </div>
  );
};

export default BoardPreviewCard;
