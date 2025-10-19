import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import DataTable from "../../atoms/DataTable";
import Plus from "../../../assets/plus.svg?react";
import ModalBase from "../../atoms/ModalBase";
import { apiService } from "../../../services/api/ApiService";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  picture?: string;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Board {
  id: string;
  title: string;
  description?: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ITEMS_PER_PAGE = 10;

const Home: React.FC = () => {
  const { activeItem } = useSelector((state: RootState) => state.sidebar);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const CONFIG = {
    members: {
      endpoint: "/v1/users/paginated",
      columns: [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
        { key: "active", label: "Status" },
          { key: "createdAt", label: "Created" },
          { key: "updatedAt", label: "Updated" },
      ],
      transform: (items: Member[]) =>
        items.map((m) => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email,
          active: m.active ? "Active" : "Inactive",
          createdAt: new Date(m.createdAt).toLocaleString(),
          updatedAt: new Date(m.updatedAt).toLocaleString(),
        })),
  title: "Members",
  description: "View and manage workspace members.",
    },
    boards: {
      endpoint: "/v1/boards",
      columns: [
        { key: "id", label: "ID" },
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
      ],
      transform: (items: Board[]) =>
        items.map((b) => ({
          id: b.id,
          title: b.title,
          description: b.description || "—",
        })),
  title: "Boards",
  description: "View the boards associated with the workspace.",
    },
    agents: {
      endpoint: "/v1/agents",
      columns: [
        { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
      ],
      transform: (items: Agent[]) =>
        items.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          status: a.status || "Active",
        })),
  title: "AI Agents",
  description: "Configure and monitor AI agents.",
    },
  };

  const config = CONFIG[activeItem as keyof typeof CONFIG];

  const fetchData = async () => {
    if (!config) return;

    try {
      setLoading(true);
      const response = await apiService.get<any[]>(
        `${config.endpoint}?page=${page}&limit=${ITEMS_PER_PAGE}`
      );

      if (!response || response.length === 0) return;

      const transformed = config.transform(response);
      setData((prev) => (page === 1 ? transformed : [...prev, ...transformed]));
      setTotalItems(transformed.length);
    } catch (error) {
      console.error(`Error fetching ${activeItem}:`, error);
      if (page === 1) setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setData([]);
  }, [activeItem]);

  useEffect(() => {
    fetchData();
  }, [page, activeItem]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 50;

    if (nearBottom && !loading && data.length < totalItems) {
      setPage((prev) => prev + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---- Minimal user actions (delete / edit) implemented locally for members ----
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; firstName: string; lastName: string; email: string } | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  // delete confirmation modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);

  // Open confirmation modal (instead of browser confirm)
  const handleDeleteUser = (id: string, name?: string) => {
    setDeleteTarget({ id, name });
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiService.delete(`/v1/users/${deleteTarget.id}`);
      // refresh data from backend to keep consistency
      await fetchData();
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
  console.error("Error deleting user:", err);
  alert("Could not delete the user. Check the console for details.");
    }
  };

  const openEditModal = (row: any) => {
    // row has { id, name, email, ... }
    const parts = row.name ? String(row.name).split(" ") : [];
    const firstName = parts.length > 0 ? parts[0] : "";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
    setEditingUser({ id: row.id, firstName, lastName, email: row.email });
    setIsEditOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingUser((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setEditSubmitting(true);
      const payload = {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
      };
      // Llamada real al backend
  const updated = await apiService.patch<any>(`/v1/users/${editingUser.id}`, payload);

      // If backend returns the updated user (object), use it to update the UI;
      // otherwise, refresh the list from the backend to keep consistency.
      if (updated && typeof updated === "object") {
        // try to get name and email from the response
        const newName = (updated.firstName || payload.firstName) + " " + (updated.lastName || payload.lastName);
        const updatedAtStr = updated.updatedAt ? String(updated.updatedAt) : new Date().toLocaleString();
        setData((prev) =>
          prev.map((d) =>
            d.id === editingUser.id
              ? { ...d, name: newName.trim(), email: updated.email || payload.email, updatedAt: updatedAtStr }
              : d
          )
        );
      } else {
        await fetchData();
      }
      setIsEditOpen(false);
      setEditingUser(null);
    } catch (err) {
  console.error("Error updating user:", err);
  alert("Could not update the user. Check the console for details.");
    } finally {
      setEditSubmitting(false);
    }
  };
  // ------------------------------------------------------------------------------

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) return;

    try {
      setSubmitting(true);
      const body = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        picture: null,
        workspaces: [],
      };

  console.debug("POST /v1/users body:", body);
  const res = await apiService.post("/v1/users", body);
  console.debug("Response from POST /v1/users:", res);
      setIsModalOpen(false);
      setFormData({ firstName: "", lastName: "", email: "" });
      fetchData(); 
    } catch (err) {
      
      if (err && (err as any).response) {
        const r = (err as any).response;
        console.error(`Error creating user: status=${r.status} data=`, r.data);
      } else {
        console.error("Error creating user:", err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-poppins">
      <div className="bg-dark-800 rounded-xl shadow-md p-3 mb-4 border border-dark-600">
        <div className="flex items-center justify-between">
          <div className="max-w-60">
            <h1 className="text-lg font-bold text-text-primary">
              {config?.title || "🏠 Home"}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
                {config?.description ||
                "Select an option from the sidebar to get started."}
            </p>
          </div>

          {config && (
            <div className="flex items-center space-x-3">
              <div className="w-px h-12 bg-limeyellow-600 rounded-full" />
              {activeItem === "members" && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="h-10 flex items-center justify-center gap-1 bg-limeyellow-500 hover:bg-limeyellow-600 text-white text-sm font-semibold px-2 py-2 rounded-lg transition-colors duration-200"
                >
                  <Plus className="w-4 h-4 relative top-[0.5px]" />
                  <span className="leading-none pr-1">Add</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto bg-dark-900 rounded-xl"
        onScroll={handleScroll}
      >
        {loading && page === 1 ? (
          <div className="p-4 text-text-secondary text-center">
            Loading {config?.title?.toLowerCase()}...
          </div>
        ) : config ? (
          <>
            {activeItem === "members" ? (
              <div className="bg-dark-800 rounded-2xl shadow-lg p-4 font-poppins">
                <h2 className="text-xl font-semibold text-text-primary mb-4">{config.title}</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm text-text-primary">
                    <thead>
                      <tr className="bg-dark-600 text-left uppercase text-xs tracking-wider">
                        {config.columns.map((col: any) => (
                          <th key={col.key} className="px-4 py-3 font-semibold">{col.label}</th>
                        ))}
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => (
                        <tr key={row.id} className="border-b border-dark-700 hover:bg-dark-700 transition-colors duration-150 bg-dark-900">
                          {config.columns.map((col: any) => (
                            <td key={col.key} className="px-4 py-3 text-text-secondary">{String(row[col.key] ?? "-")}</td>
                          ))}
                          <td className="px-4 py-3 text-text-secondary">
                            <div className="flex gap-2">
                              <button onClick={() => openEditModal(row)} className="text-xs bg-dark-700 hover:bg-limeyellow-500 text-text-secondary hover:text-dark-900 px-2 py-1 rounded">Edit</button>
                              <button onClick={() => handleDeleteUser(row.id, row.name)} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <DataTable data={data} title={config.title} columns={config.columns} />
            )}
            {loading && (
              <div className="p-3 text-center text-text-secondary text-sm">
                Loading more...
              </div>
            )}
          </>
        ) : (
          <p className="mt-6 text-text-secondary text-center">
            Select an option from the side menu.
          </p>
        )}
      </div>

      {/* Modal to add user */}
      <ModalBase
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add new member"
      >
        <form onSubmit={handleAddMember} className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              First name
            </label>
            <input
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              className="w-full bg-dark-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Last name
            </label>
            <input
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              className="w-full bg-dark-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Email address
            </label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full bg-dark-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-limeyellow-500 hover:bg-limeyellow-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors duration-200"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </form>
      </ModalBase>
      {/* Modal to edit user (simple) */}
      <ModalBase
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingUser(null);
        }}
        title="Edit User"
      >
        {editingUser ? (
          <form onSubmit={handleUpdateUser} className="space-y-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">First name</label>
              <input name="firstName" type="text" value={editingUser.firstName} onChange={handleEditChange} required className="w-full bg-dark-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Last name</label>
              <input name="lastName" type="text" value={editingUser.lastName} onChange={handleEditChange} required className="w-full bg-dark-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Email address</label>
              <input name="email" type="email" value={editingUser.email} onChange={handleEditChange} required className="w-full bg-dark-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500" />
            </div>
            <button type="submit" disabled={editSubmitting} className="w-full bg-limeyellow-500 hover:bg-limeyellow-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors duration-200">{editSubmitting ? "Saving..." : "Save changes"}</button>
          </form>
        ) : (
          <p>No user selected</p>
        )}
      </ModalBase>
      {/* Confirmation modal to delete */}
      <ModalBase isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm deletion">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Are you sure you want to delete {deleteTarget?.name ? `${deleteTarget.name}` : "this user"}? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsDeleteOpen(false)} className="px-3 py-2 bg-dark-700 text-text-secondary rounded">Cancel</button>
            <button onClick={confirmDelete} className="px-3 py-2 bg-red-600 text-white rounded">Delete</button>
          </div>
        </div>
      </ModalBase>
    </div>
  );
};

export default Home;
