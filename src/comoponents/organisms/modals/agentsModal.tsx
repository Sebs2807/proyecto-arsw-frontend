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

interface List {
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
  lists: List[];
  workspaceId: string;
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
  const isEditing = mode === "edit";
  const isDeleting = mode === "delete";

  const [name, setName] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(500);
  const [flowConfig, setFlowConfig] = useState("{}");

  // Boards
  const [searchBoards, setSearchBoards] = useState("");
  const [boardSuggestions, setBoardSuggestions] = useState<Board[]>([]);
  const [selectedBoards, setSelectedBoards] = useState<Board[]>([]);
  // Removed unused showBoardSuggestions state

  const [searchLists, setSearchLists] = useState("");
  const [listSuggestions, setListSuggestions] = useState<List[]>([]);
  const [selectedLists, setSelectedLists] = useState<List[]>([]);
  const [showListSuggestions, setShowListSuggestions] = useState(false);

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
      setSelectedLists(agent.lists || []);
    } else {
      setName("");
      setTemperature(0.7);
      setMaxTokens(500);
      setFlowConfig("{}");
      setSelectedBoards([]);
      setSelectedLists([]);
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

    const basePayload = {
      name: name.trim(),
      temperature,
      maxTokens,
      flowConfig: JSON.parse(flowConfig || "{}"),
      boardIds: selectedBoards.map((b) => b.id),
      listIds: selectedLists.map((l) => l.id),
    };

    try {
      if (isDeleting && agent) {
        await apiService.delete(`/v1/agents/${agent.id}`);
      } else if (isEditing && agent) {
        await apiService.patch(`/v1/agents/${agent.id}`, basePayload);
      } else {
        await apiService.post(`/v1/agents`, {
          ...basePayload,
          workspaceId,
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving agent", err);
    } finally {
      setLoading(false);
    }
  };

  /** Fetch board suggestions */
  const fetchBoardSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setBoardSuggestions([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        workspaceId,
        search: query,
        page: "1",
        limit: "10",
      });

      const res = await apiService.get<PaginatedResponse<Board>>(
        `/v1/boards/paginated?${params.toString()}`
      );

      setBoardSuggestions(
        res.items.filter((b) => !selectedBoards.some((sb) => sb.id === b.id))
      );
    } catch (err) {
      console.error("Error fetching boards:", err);
      setBoardSuggestions([]);
    }
  };

  const fetchListSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setListSuggestions([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        workspaceId,
        search: query,
        page: "1",
        limit: "10",
      });

      const res = await apiService.get<PaginatedResponse<List>>(
        `/v1/lists/paginated?${params.toString()}`
      );

      setListSuggestions(
        res.items.filter((l) => !selectedLists.some((sl) => sl.id === l.id))
      );
    } catch (err) {
      console.error("Error fetching lists:", err);
      setListSuggestions([]);
    }
  };

  const removeBoard = (id: string) => {
    setSelectedBoards((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSelectList = (list: List) => {
    setSelectedLists((prev) => [...prev, list]);
    setSearchLists("");
    setListSuggestions([]);
    setShowListSuggestions(false);
  };

  const removeList = (id: string) => {
    setSelectedLists((prev) => prev.filter((l) => l.id !== id));
  };

  let modalTitle = "";
  if (isDeleting) {
    modalTitle = "Delete Agent";
  } else if (isEditing) {
    modalTitle = "Edit Agent";
  } else {
    modalTitle = "Create Agent";
  }

  const getButtonLabel = () => {
    if (loading) return "Saving...";
    if (isEditing) return "Update";
    return "Create";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-full max-w-2xl shadow-xl border border-dark-600 relative max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-dark-700 text-text-secondary transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Delete modal */}
        {isDeleting ? (
          <>
            <p className="text-text-secondary text-sm">
              Are you sure you want to delete the agent{" "}
              <span className="text-limeyellow-500 font-semibold">
                {agent?.name}?
              </span>
            </p>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg bg-dark-700 text-text-secondary hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="agent-name"
                className="block text-sm text-text-secondary mb-1 font-medium"
              >
                Agent Name *
              </label>
              <input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Lead Classifier"
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm border border-dark-600 focus:border-limeyellow-500 focus:outline-none transition-colors"
                required
              />
            </div>

            {/* Temperature */}
            <div>
              <label
                htmlFor="agent-temperature"
                className="block text-sm text-text-secondary mb-1 font-medium"
              >
                Temperature (0.0 - 2.0)
              </label>
              <input
                id="agent-temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) =>
                  setTemperature(Number.parseFloat(e.target.value) || 0)
                }
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm border border-dark-600 focus:border-limeyellow-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-text-muted mt-1">
                Higher values make output more random, lower values more focused
              </p>
            </div>

            {/* Max Tokens */}
            <div>
              <label
                htmlFor="agent-max-tokens"
                className="block text-sm text-text-secondary mb-1 font-medium"
              >
                Max Tokens
              </label>
              <input
                id="agent-max-tokens"
                type="number"
                min="1"
                value={maxTokens}
                onChange={(e) =>
                  setMaxTokens(Number.parseInt(e.target.value) || 500)
                }
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm border border-dark-600 focus:border-limeyellow-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-text-muted mt-1">
                Maximum number of tokens to generate in responses
              </p>
            </div>

            {/* Flow Config */}
            <div>
              <label
                htmlFor="agent-flow-config"
                className="block text-sm text-text-secondary mb-1 font-medium"
              >
                Flow Config (JSON)
              </label>
              <textarea
                id="agent-flow-config"
                rows={6}
                value={flowConfig}
                onChange={(e) => setFlowConfig(e.target.value)}
                placeholder='{"nodes": {...}, "edges": [...]}'
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm border border-dark-600 font-mono focus:border-limeyellow-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-text-muted mt-1">
                Optional JSON configuration for agent workflow
              </p>
            </div>

            {/* Board search */}
            <div className="relative">
              <label
                htmlFor="board-search"
                className="block text-sm text-text-secondary mb-1 font-medium"
              >
                Assign Boards
              </label>
              <input
                id="board-search"
                type="text"
                value={searchBoards}
                onChange={(e) => {
                  setSearchBoards(e.target.value);
                  fetchBoardSuggestions(e.target.value);
                }}
                list="board-suggestions"
                placeholder="Search boards by title..."
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500 transition-colors"
              />
              <datalist id="board-suggestions">
                {boardSuggestions.map((b) => (
                  <option key={b.id} value={b.title} />
                ))}
              </datalist>
            </div>

            {/* Selected boards */}
            {selectedBoards.length > 0 && (
              <div className="border border-dark-600 rounded-lg overflow-hidden">
                <div className="bg-dark-700 px-3 py-2 border-b border-dark-600">
                  <span className="text-xs text-text-secondary font-medium">
                    Selected Boards ({selectedBoards.length})
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {selectedBoards.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between px-3 py-2 border-b border-dark-600 last:border-b-0 hover:bg-dark-700 transition-colors"
                    >
                      <span className="text-sm text-white">{b.title}</span>
                      <button
                        type="button"
                        onClick={() => removeBoard(b.id)}
                        className="text-red-500 hover:text-red-400 text-xs font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <label
                htmlFor="list-search"
                className="block text-sm text-text-secondary mb-1 font-medium"
              >
                Assign Lists
              </label>
              <input
                id="list-search"
                type="text"
                value={searchLists}
                onChange={(e) => {
                  setSearchLists(e.target.value);
                  fetchListSuggestions(e.target.value);
                }}
                onFocus={() => setShowListSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowListSuggestions(false), 200)
                }
                placeholder="Search lists by title..."
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500 transition-colors"
              />

              {showListSuggestions && listSuggestions.length > 0 && (
                <select
                  size={Math.min(listSuggestions.length, 6)}
                  className="absolute mt-2 w-full bg-dark-600 border border-dark-500 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 text-white text-sm"
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedList = listSuggestions.find(
                      (l) => l.id === selectedId
                    );
                    if (selectedList) handleSelectList(selectedList);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {listSuggestions.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedLists.length > 0 && (
              <div className="border border-dark-600 rounded-lg overflow-hidden">
                <div className="bg-dark-700 px-3 py-2 border-b border-dark-600">
                  <span className="text-xs text-text-secondary font-medium">
                    Selected Lists ({selectedLists.length})
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {selectedLists.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between px-3 py-2 border-b border-dark-600 last:border-b-0 hover:bg-dark-700 transition-colors"
                    >
                      <span className="text-sm text-white">{l.title}</span>
                      <button
                        type="button"
                        onClick={() => removeList(l.id)}
                        className="text-red-500 hover:text-red-400 text-xs font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-dark-600 mt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-dark-700 text-text-secondary rounded-lg text-sm hover:bg-dark-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !isFormValid()}
                className="px-4 py-2 bg-limeyellow-500 hover:bg-limeyellow-600 text-dark-900 font-semibold rounded-lg text-sm disabled:opacity-50 transition-colors"
              >
                {getButtonLabel()}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AgentModal;
