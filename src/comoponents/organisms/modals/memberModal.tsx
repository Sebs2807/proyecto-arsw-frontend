import React, { useState, useEffect } from "react";
import CloseIcon from "../../../assets/x.svg?react";
import { apiService } from "../../../services/api/ApiService";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

interface AutocompleteResponse {
  items: UserSuggestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
  mode: "add" | "edit" | "delete";
}

interface UserSuggestion {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

const ROLE_OPTIONS = [
  { value: "superAdmin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
];

const MembersModal: React.FC<MembersModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  member,
  mode,
}) => {
  const isEditing = mode === "edit";
  const isDeleting = mode === "delete";
  const [form, setForm] = useState({ userId: "", email: "", role: "member" });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const selectedWorkspace = useSelector(
    (state: RootState) => state.workspace.selectedWorkspace
  );
  const workspaceId = selectedWorkspace?.id ?? "";

  useEffect(() => {
    if (member) {
      setForm({ userId: member.id, email: member.email, role: member.role });
    } else {
      setForm({ userId: "", email: "", role: "member" });
    }
  }, [member]);

  const isFormValid = () => {
    if (isDeleting) return true;
    if (isEditing) return !!form.role;
    return !!form.userId && !!form.email && !!form.role;
  };

  const fetchSuggestions = async (search: string) => {
    if (!search || search.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const response: AutocompleteResponse = await apiService.get(
        `/v1/users/autocomplete`,
        { params: { search, workspaceId } }
      );
      setSuggestions(response?.items ?? []);
    } catch {
      setSuggestions([]);
    }
  };

  const handleChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "email" && !isEditing) {
      if (value.length >= 2) {
        setShowSuggestions(true);
        fetchSuggestions(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  const handleSelectSuggestion = (user: UserSuggestion) => {
    setForm({ userId: user.id, email: user.email, role: "member" });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isDeleting && member) {
        // Eliminar usuario del workspace usando userId y workspaceId
        await apiService.delete(`/v1/workspaces/users/`, {
          data: { userId: member.id, workspaceId },
        });
      } else if (isEditing && member) {
        // Actualizar rol del usuario en el workspace usando userId y workspaceId
        await apiService.patch(`/v1/workspaces/users/`, {
          userId: form.userId,
          workspaceId,
          role: form.role,
        });
      } else {
        // Agregar usuario al workspace
        await apiService.post("/v1/workspaces/users", {
          userId: form.userId,
          workspaceId,
          role: form.role,
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error handling member:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md shadow-xl border border-dark-600 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {isDeleting
              ? "Delete Member"
              : isEditing
              ? "Edit Member"
              : "Add Member"}
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
              ¿Seguro que quieres eliminar al miembro{" "}
              <span className="text-limeyellow-500 font-semibold">
                {member?.firstName} {member?.lastName}
              </span>{" "}
              ({member?.email})? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg bg-dark-700 text-text-secondary hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 relative">
              {isEditing ? (
                <>
                  <label className="block text-xs text-text-secondary mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={member?.firstName || ""}
                    disabled
                    className="w-full bg-dark-600 text-text-primary rounded-lg px-3 py-2 text-sm border border-dark-600 opacity-70 mb-2"
                  />

                  <label className="block text-xs text-text-secondary mb-1">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={member?.lastName || ""}
                    disabled
                    className="w-full bg-dark-600 text-text-primary rounded-lg px-3 py-2 text-sm border border-dark-600 opacity-70 mb-2"
                  />

                  <label className="block text-xs text-text-secondary mb-1">
                    Correo
                  </label>
                  <input
                    type="email"
                    value={member?.email || ""}
                    disabled
                    className="w-full bg-dark-600 text-text-primary rounded-lg px-3 py-2 text-sm border border-dark-600 opacity-70"
                  />
                </>
              ) : (
                <>
                  <label className="block text-xs text-text-secondary mb-1">
                    Email
                  </label>
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full bg-dark-600 text-text-primary rounded-lg px-3 py-2 text-sm border border-dark-600 focus:border-limeyellow-500 outline-none"
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() =>
                      setTimeout(() => setShowSuggestions(false), 150)
                    }
                  />

                  {showSuggestions && (
                    <div className="mt-3 w-full bg-dark-600 border border-dark-600 rounded-lg shadow-md max-h-48 overflow-y-auto z-10">
                      <table className="w-full text-sm text-text-primary">
                        <thead className="sticky top-0 bg-dark-800">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-text-secondary">
                              Nombre
                            </th>
                            <th className="text-left px-3 py-2 font-medium text-text-secondary">
                              Correo
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {suggestions.length > 0 ? (
                            suggestions.map((user) => (
                              <tr
                                key={user.id}
                                onClick={() => handleSelectSuggestion(user)}
                                className="hover:bg-dark-600 cursor-pointer transition-colors"
                              >
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {user.firstName} {user.lastName}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {user.email}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={2}
                                className="px-3 py-3 text-center text-text-secondary italic"
                              >
                                No se encontraron resultados
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Role
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full bg-dark-600 text-text-primary rounded-lg px-3 py-2 text-sm border border-dark-600 focus:border-limeyellow-500 outline-none"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg bg-dark-600 text-text-secondary hover:bg-dark-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !isFormValid()}
                className="px-4 py-2 text-sm rounded-lg bg-limeyellow-600 text-text-primary font-semibold hover:bg-limeyellow-400 disabled:opacity-50"
              >
                {loading ? "Saving..." : isEditing ? "Update" : "Add"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MembersModal;
