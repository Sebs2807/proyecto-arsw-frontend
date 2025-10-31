import React, { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import CloseIcon from "../../../assets/x.svg?react";
import { apiService } from "../../../services/api/ApiService";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

interface Board {
  id: string;
  title: string;
  description?: string;
  color: string;
}

interface BoardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  board?: Board | null;
  mode: "add" | "edit" | "delete";
}

interface UserSuggestion {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AutocompleteResponse {
  items: UserSuggestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const BoardsModal: React.FC<BoardsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  board,
  mode,
}) => {
  if (!isOpen) return null;

  const isEditing = mode === "edit";
  const isDeleting = mode === "delete";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("#a1a1a1");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const selectedWorkspace = useSelector(
    (state: RootState) => state.workspace.selectedWorkspace
  );
  const workspaceId = selectedWorkspace?.id ?? "";

  useEffect(() => {
    if (board && (isEditing || isDeleting)) {
      setTitle(board.title);
      setDescription(board.description || "");
      setSelectedColor(board.color);
    } else {
      setTitle("");
      setDescription("");
      setSelectedColor("#a1a1a1");
    }
  }, [board, isEditing, isDeleting]);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const response: AutocompleteResponse = await apiService.get(
        `/v1/users/autocomplete`,
        { params: { search: query, workspaceId } }
      );
      setSuggestions(response.items ?? []);
    } catch {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (user: UserSuggestion) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, user]);
    }
    setSearch("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleRemoveUser = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const isFormValid = () => {
    if (isDeleting) return true;
    return !!title.trim();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid()) return;

    setLoading(true);
    try {
      if (isDeleting && board) {
        await apiService.delete(
          `/v1/workspaces/${workspaceId}/boards/${board.id}`
        );
      } else if (isEditing && board) {
        await apiService.patch(
          `/v1/workspaces/${workspaceId}/boards/${board.id}`,
          {
            title,
            description,
            color: selectedColor,
            users: selectedUsers.map((u) => u.id),
          }
        );
      } else {
        await apiService.post(`/v1/workspaces/${workspaceId}/boards`, {
          title,
          description,
          color: selectedColor,
          users: selectedUsers.map((u) => u.id),
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error handling board:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-full max-w-2xl shadow-xl border border-dark-600 relative max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">
            {isDeleting
              ? "Eliminar tablero"
              : isEditing
              ? "Editar tablero"
              : "Crear tablero"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-dark-700 text-text-secondary"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {isDeleting ? (
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">
              ¿Seguro que quieres eliminar el tablero{" "}
              <span className="text-limeyellow-500 font-semibold">
                {board?.title}
              </span>
              ? Esta acción no se puede deshacer.
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
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Título */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Título
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
                rows={3}
              />
            </div>

            {/* Selector de color */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Color del tablero
              </label>
              <div className="flex flex-col items-center gap-3">
                <HexColorPicker
                  color={selectedColor}
                  onChange={setSelectedColor}
                />
                <div
                  className="w-14 h-14 rounded-full border-2 border-dark-600"
                  style={{ backgroundColor: selectedColor }}
                />
              </div>
            </div>

            {/* Buscador de usuarios */}
            <div className="relative">
              <label className="block text-sm text-text-secondary mb-1">
                Agregar miembros
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  fetchSuggestions(e.target.value);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Buscar por nombre o correo"
                className="w-full bg-dark-600 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute mt-2 w-full bg-dark-600 border border-dark-600 rounded-lg shadow-md max-h-48 overflow-y-auto z-10">
                  {suggestions.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectSuggestion(user)}
                      className="px-3 py-2 text-sm text-white hover:bg-dark-600 cursor-pointer"
                    >
                      {user.firstName} {user.lastName} – {user.email}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabla de usuarios seleccionados */}
            {selectedUsers.length > 0 && (
              <div className="mt-3 border border-dark-600 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-white">
                  <thead className="bg-dark-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-text-secondary font-medium">
                        Nombre
                      </th>
                      <th className="px-3 py-2 text-left text-text-secondary font-medium">
                        Correo
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="border-t border-dark-600 hover:bg-dark-700"
                      >
                        <td className="px-3 py-2">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="px-3 py-2">{u.email}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(u.id)}
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

            {/* Botones */}
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

export default BoardsModal;
