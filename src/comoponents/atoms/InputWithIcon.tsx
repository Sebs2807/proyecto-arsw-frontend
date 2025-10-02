import React, { useState } from "react";
import EyeOpen from "../../assets/eye.svg?react";
import EyeClosed from "../../assets/eye-closed.svg?react";

interface InputWithIconProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
}

export const InputWithIcon: React.FC<InputWithIconProps> = ({
  label,
  leftIcon,
  isPassword = false,
  type,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-sm font-medium text-text-primary">{label}</label>
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-text-muted">{leftIcon}</span>
        )}
        <input
          {...props}
          type={inputType}
          className={`
            border border-dark-600 rounded-lg px-3 py-2 w-full 
            focus:ring-1 focus:ring-limeyellow-500 focus:border-limeyellow-500 
            bg-dark-800 text-text-primary outline-none
            ${leftIcon ? "pl-10" : ""}
            ${isPassword ? "pr-10" : ""}
          `}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-text-muted hover:text-text-primary transition-colors"
          >
            {showPassword ? (
              <EyeClosed className="w-5 h-5" />
            ) : (
              <EyeOpen className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
