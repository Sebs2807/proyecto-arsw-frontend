import React, { useState } from "react";
import ChevronDown from "../../assets/chevron-down.svg?react";
import { useDispatch } from "react-redux";
import { setSelectedWorkspace } from "../../store/slices/workspaceSlice";

interface Workspace {
  id: string;
  name: string;
}

interface Props {
  workspaces: Workspace[];
  selected: Workspace;
  onChange: (workspace: Workspace) => void;
  onCreate?: () => void;
}

const WorkspaceDropdown: React.FC<Props> = ({
  workspaces,
  selected,
  onChange,
  onCreate,
}) => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();

  const handleSelect = (ws: Workspace) => {
    onChange(ws); // actualiza estado local del layout
    dispatch(setSelectedWorkspace(ws)); // guarda workspace seleccionado en Redux
    setOpen(false);
  };

  if (!selected) return null;

  return (
    <div className="relative inline-block text-left">
      {/* Botón */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center bg-dark-600 text-text-primary px-3 py-1 rounded shadow hover:bg-dark-500 transition"
      >
        <span>{selected.name}</span>
        <ChevronDown
          className={`w-4 h-4 ml-2 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* Menú */}
      {open && (
        <div className="absolute mt-1 w-56 bg-dark-700 rounded shadow-lg z-10">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSelect(ws)}
              className="w-full text-left px-3 py-2 hover:bg-dark-500 cursor-pointer bg-transparent text-text-primary"
            >
              {ws.name}
            </button>
          ))}

          {/* Separador */}
          <div className="border-t border-dark-500 my-1"></div>

          {/* Crear nuevo workspace */}
          <button
            onClick={() => {
              setOpen(false);
              onCreate?.();
            }}
            className="w-full text-left px-3 py-2 hover:bg-dark-500 text-limeyellow-500 font-semibold flex items-center bg-transparent"
          >
            <span className="mr-2">+</span> Crear nuevo workspace
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDropdown;
