import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  disabled,
  className = "",
  ...props
}) => (
  <button
    {...props}
    disabled={disabled}
    className={`
      w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200
      ${
        disabled
          ? "bg-dark-600 text-neutral-300 cursor-not-allowed"
          : "bg-limeyellow-400 hover:bg-limeyellow-600 text-text-primary "
      }
      ${className}
    `}
  >
    {children}
  </button>
);
