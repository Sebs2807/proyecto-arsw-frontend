import React from "react";

export type SynapseButtonProps = {
  id: string;
  icon: React.ReactNode;
  selected: string;
  navigationPath: string;
  handleSelect: (id: string, path?: string) => void;
  text?: string; // Texto opcional
  disabled?: boolean; // <-- NUEVO
};

const SynapseButton: React.FC<SynapseButtonProps> = ({
  id,
  icon,
  selected,
  navigationPath,
  handleSelect,
  text,
  disabled = false,
}) => {
  const isSelected = selected === id;
  const hasText = Boolean(text);

  let buttonClass = "";

  if (hasText) {
    buttonClass = "ml-1";
  } else if (isSelected) {
    buttonClass = "bg-limeyellow-500 text-text-primary";
  } else {
    buttonClass =
      "bg-dark-600 text-dark-700 hover:bg-limeyellow-400 hover:text-text-primary";
  }

  return (
    <div
      className={`flex ${
        hasText ? "flex-row items-center" : "flex-col items-center"
      }`}
    >
      {hasText && isSelected && !disabled && (
        <div className="w-1 h-8 bg-limeyellow-500 rounded-l-md"></div>
      )}

      <button
        onClick={() => !disabled && handleSelect(id, navigationPath)}
        disabled={disabled}
        className={`flex w-full items-center gap-2 px-2 py-2 rounded-md transition font-medium
          ${
            disabled
              ? "opacity-40 cursor-not-allowed bg-dark-600 text-dark-700"
              : hasText
              ? "ml-1"
              : isSelected
              ? "bg-limeyellow-500 text-text-primary"
              : "bg-dark-600 text-dark-700 hover:bg-limeyellow-400 hover:text-text-primary"
          }
        `}
      >
        <div
          className={`${
            hasText
              ? "h-7 w-7 flex-shrink-0 flex items-center justify-center"
              : ""
          }`}
        >
          {icon}
        </div>

        {hasText && <p className="text-sm">{text}</p>}
      </button>

      {!hasText && isSelected && !disabled && (
        <div className="w-6 h-0.5 bg-limeyellow-500 mt-1 rounded-full"></div>
      )}
    </div>
  );
};

export default SynapseButton;
