import React, { useState } from "react";
import Brain from "../../assets/brain.svg?react";
import WorkspaceDropdown from "../atoms/WorkspaceDropdown";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedWorkspace } from "../../store/slices/workspaceSlice";
import type { RootState, AppDispatch } from "../../store";
import { apiService } from "../../services/api/ApiService";
interface NavbarProps {
  onCreateWorkspace: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onCreateWorkspace }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const workspaces = useSelector(
    (state: RootState) => state.workspace.workspaces
  );
  const selectedWorkspace = useSelector(
    (state: RootState) => state.workspace.selectedWorkspace
  );

  return (
    <div className="h-12 bg-dark-800 flex items-center px-4 shadow-md text-text-primary justify-between">
      <div className="flex items-center">
        <Brain className="h-6 w-6 text-limeyellow-500 mr-2" />
        <h1 className="text-xl font-semibold">Synapse CRM</h1>
      </div>

      <WorkspaceDropdown
        workspaces={workspaces}
        selected={selectedWorkspace!}
        onChange={(ws) => {
          dispatch(setSelectedWorkspace(ws));
        }}
        onCreate={onCreateWorkspace}
      />

      {/* Perfil / notificaciones */}
      <div className="flex items-center gap-3">
        <button
          onClick={async () => {
            if (loading) return;
            try {
              setLoading(true);
              // Ask backend to logout and revoke Google tokens
              await apiService.post('/v1/auth/logout', { revokeGoogle: true });

              // Redirect back to frontend login page
              globalThis.location.href = 'https://localhost:5173/login';
            } catch (err) {
              console.error('Logout failed', err);
              alert('No se pudo cerrar la sesión');
            } finally {
              setLoading(false);
            }
          }}
          className="px-3 py-1 bg-dark-700 rounded hover:bg-dark-600 text-sm"
        >
          {loading ? 'Cerrando...' : 'Cerrar sesión'}
        </button>
      </div>
    </div>
  );
};

export default Navbar;
