import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-sm font-poppins text-text-primary">{label}</label>
    <input
      {...props}
      className={`
        border border-dark-600 rounded-lg px-3 py-2 w-full
        bg-dark-800 text-text-primary font-poppins
        focus:ring-2 focus:ring-limeyellow-500 focus:border-limeyellow-500
        outline-none
      `}
    />
  </div>
);
