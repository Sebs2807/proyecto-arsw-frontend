// src/components/layouts/MainLayout.tsx
import React, { useEffect, useState } from "react";
import Navbar from "../organisms/Navbar";
import { Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setWorkspaces,
  setSelectedWorkspace,
  fetchWorkspaces,
} from "../../store/slices/workspaceSlice";
import type { RootState, AppDispatch } from "../../store";
import Sidebar from "../organisms/sidebar/Sidebar";

const MainLayout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const workspaces = useSelector(
    (state: RootState) => state.workspace.workspaces
  );

  const [showModal, setShowModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  const handleCreateWorkspace = () => setShowModal(true);

  const handleSaveWorkspace = () => {
    if (newWorkspaceName.trim() === "") return;
    const newWS = { id: Date.now().toString(), name: newWorkspaceName };
    dispatch(setWorkspaces([...workspaces, newWS]));
    dispatch(setSelectedWorkspace(newWS));
    setNewWorkspaceName("");
    setShowModal(false);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Navbar fija arriba */}
      <Navbar onCreateWorkspace={handleCreateWorkspace} />

      {/* Cuerpo principal */}
      <div className="flex flex-1 bg-dark-900 overflow-hidden">
        {/* Sidebar fija a la izquierda */}
        <div className="w-72 p-4 pr-0 text-text-primary flex flex-col">
          <Sidebar />
        </div>

        {/* Contenido scrollable (Outlet) */}
        <main className="flex-1 p-4 overflow-auto relative">
          <Outlet />
        </main>
      </div>

      {/* Modal de creación de workspace */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-dark-800 p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">
              Crear nuevo workspace
            </h2>
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Nombre del workspace"
              className="w-full px-3 py-2 mb-4 bg-dark-700 text-text-primary rounded"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded bg-dark-600 hover:bg-dark-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveWorkspace}
                className="px-4 py-2 rounded bg-limeyellow-500 hover:bg-limeyellow-400 text-dark-900 font-semibold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
