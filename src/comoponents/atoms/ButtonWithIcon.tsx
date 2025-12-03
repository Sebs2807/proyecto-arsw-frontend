import React from "react";

interface ButtonWithIconProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode; // icono a la izquierda
  label: string; // texto del botón
}

export const ButtonWithIcon: React.FC<ButtonWithIconProps> = ({
  icon,
  label,
  disabled,
  className = "",
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-2
        px-4 py-2 rounded-lg font-medium font-poppins
        transition-colors duration-200
        ${
          disabled
            ? " text-neutral-300 cursor-not-allowed"
            : " bg-limeyellow-400 hover:bg-limeyellow-600 text-text-primary"
        }
        ${className}
      `}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      {label}
    </button>
  );
};
