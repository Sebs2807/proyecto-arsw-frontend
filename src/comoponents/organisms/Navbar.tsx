import React from "react";
import Brain from "../../assets/brain.svg?react";
import WorkspaceDropdown from "../atoms/WorkspaceDropdown";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedWorkspace } from "../../store/slices/workspaceSlice";
import type { RootState, AppDispatch } from "../../store";

interface NavbarProps {
  onCreateWorkspace: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onCreateWorkspace }) => {
  const dispatch = useDispatch<AppDispatch>();
  const workspaces = useSelector(
    (state: RootState) => state.workspace.workspaces
  );
  const selectedWorkspace = useSelector(
    (state: RootState) => state.workspace.selectedWorkspace
  );

  return (
    <div className="h-12 bg-dark-800 flex items-center px-4 shadow-md text-text-primary justify-between">
      {/* Logo */}
      <div className="flex items-center">
        <Brain className="h-6 w-6 text-limeyellow-500 mr-2" />
        <h1 className="text-xl font-semibold">Synapse CRM</h1>
      </div>

      {/* Selector de workspace */}
      <WorkspaceDropdown
        workspaces={workspaces}
        selected={selectedWorkspace!}
        onChange={(ws) => dispatch(setSelectedWorkspace(ws))}
        onCreate={onCreateWorkspace}
      />

      {/* Perfil / notificaciones */}
    </div>
  );
};

export default Navbar;
