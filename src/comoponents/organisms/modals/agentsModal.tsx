import React, { useState, useEffect } from "react";
import CloseIcon from "../../../assets/x.svg?react";
import { apiService } from "../../../services/api/ApiService";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Board {
  id: string;
  title: string;
}

interface Agent {
  id: string;
  name: string;
  temperature: number;
  maxTokens: number;
  flowConfig?: any;
  boards: Board[];
}

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agent?: Agent | null;
  mode: "add" | "edit" | "delete";
}

const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  agent,
  mode,
}) => {
  if (!isOpen) return null;

  const isEditing = mode === "edit";
  const isDeleting = mode === "delete";

  const [name, setName] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [flowConfig, setFlowConfig] = useState("{}");

  const [searchBoards, setSearchBoards] = useState("");
  const [boardSuggestions, setBoardSuggestions] = useState<Board[]>([]);
  const [selectedBoards, setSelectedBoards] = useState<Board[]>([]);
  const [showBoardSuggestions, setShowBoardSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);

  const workspaceId = useSelector(
    (state: RootState) => state.workspace.selectedWorkspace?.id ?? ""
  );

  /** Load agent data */
  useEffect(() => {
    if (agent && (isEditing || isDeleting)) {
      setName(agent.name);
      setTemperature(agent.temperature);
      setMaxTokens(agent.maxTokens);
      setFlowConfig(JSON.stringify(agent.flowConfig || {}, null, 2));
      setSelectedBoards(agent.boards || []);
    } else {
      setName("");
      setTemperature(0.7);
      setMaxTokens(2048);
      setFlowConfig("{}");
      setSelectedBoards([]);
    }
  }, [agent, isEditing, isDeleting]);

  const isFormValid = () => {
    if (isDeleting) return true;
    return name.trim().length > 0;
  };

  /** Save agent */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid()) return;

    setLoading(true);

    const payload = {
      name: name.trim() || undefined,
      temperature,
      maxTokens,
      flowConfig: JSON.parse(flowConfig || "{}"),
      boardIds: selectedBoards.map((b) => b.id),
      workspaceId,
    };

    try {
      if (isDeleting && agent) {
        await apiService.delete(`/v1/agents/${agent.id}`);
      } else if (isEditing && agent) {
        await apiService.patch(`/v1/agents/${agent.id}`, payload);
      } else {
        await apiService.post(`/v1/agents`, payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving agent", err);
    } finally {
      setLoading(false);
    }
  };

  /** Fetch boards by search */
  const fetchBoardSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setBoardSuggestions([]);
      return;
    }

    try {
      const res = await apiService.get<PaginatedResponse<Board>>(
        `/v1/boards/paginated`,
        { params: { workspaceId, search: query } }
      );

      setBoardSuggestions(
        res.items.filter((b) => !selectedBoards.some((sb) => sb.id === b.id))
      );
    } catch {
      setBoardSuggestions([]);
    }
  };

  const handleSelectBoard = (board: Board) => {
    setSelectedBoards((prev) => [...prev, board]);
    setSearchBoards("");
    setBoardSuggestions([]);
    setShowBoardSuggestions(false);
  };

  const removeBoard = (id: string) => {
    setSelectedBoards((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-full max-w-2xl shadow-xl border border-dark-600 relative max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">
            {isDeleting
              ? "Eliminar agente"
              : isEditing
              ? "Editar agente"
              : "Crear agente"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-dark-700 text-text-secondary"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Delete modal */}
        {isDeleting ? (
          <>
            <p className="text-text-secondary text-sm">
              ¿Seguro que quieres eliminar el agente{" "}
              <span className="text-limeyellow-500 font-semibold">
                {agent?.name}
              </span>
              ?
            </p>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg bg-dark-700 text-text-secondary hover:bg-dark-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Nombre del agente
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm border border-dark-600 focus:border-limeyellow-500"
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Temperature
              </label>
              <input
                type="number"
                step="0.01"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm border border-dark-600 focus:border-limeyellow-500"
              />
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm border border-dark-600 focus:border-limeyellow-500"
              />
            </div>

            {/* Flow Config */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Flow Config (JSON)
              </label>
              <textarea
                rows={8}
                value={flowConfig}
                onChange={(e) => setFlowConfig(e.target.value)}
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm border border-dark-600 font-mono focus:border-limeyellow-500"
              />
            </div>

            {/* Board search */}
            <div className="relative">
              <label className="block text-sm text-text-secondary mb-1">
                Asignar tableros
              </label>
              <input
                type="text"
                value={searchBoards}
                onChange={(e) => {
                  setSearchBoards(e.target.value);
                  fetchBoardSuggestions(e.target.value);
                }}
                onFocus={() => setShowBoardSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowBoardSuggestions(false), 150)
                }
                placeholder="Buscar tablero por título"
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
              />

              {showBoardSuggestions && boardSuggestions.length > 0 && (
                <div className="absolute mt-2 w-full bg-dark-600 border border-dark-600 rounded-lg shadow-md max-h-48 overflow-y-auto z-10">
                  {boardSuggestions.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => handleSelectBoard(b)}
                      className="px-3 py-2 text-sm text-white hover:bg-dark-700 cursor-pointer"
                    >
                      {b.title}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected boards */}
            {selectedBoards.length > 0 && (
              <div className="mt-3 border border-dark-600 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-white">
                  <thead className="bg-dark-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-text-secondary font-medium">
                        Tablero
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBoards.map((b) => (
                      <tr
                        key={b.id}
                        className="border-t border-dark-600 hover:bg-dark-700"
                      >
                        <td className="px-3 py-2">{b.title}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeBoard(b.id)}
                            className="text-red-500 hover:text-red-400 text-xs font-semibold"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3 py-2 bg-dark-700 text-text-secondary rounded-lg text-sm hover:bg-dark-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !isFormValid()}
                className="px-3 py-2 bg-limeyellow-500 hover:bg-limeyellow-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AgentModal;
